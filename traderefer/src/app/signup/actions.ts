"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, hashPassword, verifyPassword } from "@/lib/auth";
import { findAvailableSlug } from "@/lib/company";
import { platform } from "@/lib/platform";
import {
  sendCompanyWelcomeEmail,
  sendNewCompanySignupNotification,
} from "@/lib/email";

const SignupSchema = z.object({
  companyName: z.string().trim().min(2, "Please enter your company name"),
  ownerName: z.string().trim().min(2, "Please enter your name"),
  email: z.string().trim().email("Please enter a valid email"),
  phone: z.string().trim().min(7, "Please enter a valid phone number"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  // Optional referrer slug from ?ref=<slug>. Hidden form input. We look
  // up the matching Company server-side; if it doesn't exist or is the
  // same company (self-referral is meaningless), we silently drop the
  // link. Bad input here never breaks signup.
  referrerSlug: z.string().trim().optional(),
});

export type CompanySignupState = {
  errors?: Record<string, string>;
  formError?: string;
};

export async function companySignupAction(
  _prev: CompanySignupState,
  formData: FormData,
): Promise<CompanySignupState> {
  const parsed = SignupSchema.safeParse({
    companyName: formData.get("companyName"),
    ownerName: formData.get("ownerName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    referrerSlug: formData.get("referrerSlug") || undefined,
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && !errors[field]) {
        errors[field] = issue.message;
      }
    }
    return { errors };
  }

  const data = parsed.data;
  const email = data.email.toLowerCase();

  // Multi-org: an email that already has an account (say, a partner
  // referring to someone else's programme) can start their OWN company
  // on the same login — provided the password they typed matches their
  // existing one, which proves they own the account rather than someone
  // hijacking a known email.
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const ok = await verifyPassword(
      data.password,
      existingUser.hashedPassword,
    );
    if (!ok) {
      return {
        formError:
          "An account already exists for that email. Enter your existing password to add a company to it, or use a different email.",
      };
    }
  }

  const slug = await findAvailableSlug(data.companyName);
  const trialEndsAt = new Date(
    Date.now() + platform.pricing.trialDays * 24 * 60 * 60 * 1000,
  );

  const hashed = existingUser
    ? existingUser.hashedPassword
    : await hashPassword(data.password);

  // Resolve the optional referrer. Looked up server-side so the form
  // value can't link to a company that doesn't exist. Self-referral is
  // blocked because the new company doesn't have an id yet (so its
  // slug can't match) — but kept as a defensive comparison in case the
  // signup flow ever changes to two-step.
  const normalisedReferrerSlug = data.referrerSlug?.toLowerCase().trim();
  const referrer = normalisedReferrerSlug
    ? await prisma.company.findUnique({
        where: { slug: normalisedReferrerSlug },
        select: { id: true, slug: true },
      })
    : null;
  const referredByCompanyId =
    referrer && referrer.slug !== slug ? referrer.id : null;

  const { user, company, membership } = await prisma.$transaction(
    async (tx) => {
    const company = await tx.company.create({
      data: {
        slug,
        name: data.companyName,
        contactEmail: email,
        contactPhone: data.phone,
        status: "TRIAL",
        trialEndsAt,
        referredByCompanyId,
        // Sensible defaults — the COMPANY_ADMIN can refine on their settings page.
        services: ["Solar PV", "Battery Storage", "EV Charger", "Heat Pump"],
        payoutAppointment: 50,
        payoutJob: 250,
      },
    });

    const user = existingUser
      ? existingUser
      : await tx.user.create({
          data: {
            email,
            hashedPassword: hashed,
            fullName: data.ownerName,
            businessName: data.companyName,
            phone: data.phone,
          },
        });

    const membership = await tx.membership.create({
      data: {
        userId: user.id,
        companyId: company.id,
        role: "COMPANY_ADMIN",
      },
    });

    // Seed a default starter template set for the new company.
    await tx.messageTemplate.createMany({
      data: [
        {
          companyId: company.id,
          channel: "SMS",
          title: "Initial intro",
          sortOrder: 10,
          body: `Hi! It's {{partnerName}} from {{businessName}}. As mentioned, I work with {{companyName}} — they're a trusted local installer. With your permission I can pass your details over and they'll be in touch to arrange a free no-obligation survey. Just reply YES if happy. Cheers!`,
        },
        {
          companyId: company.id,
          channel: "SMS",
          title: "After the appointment is booked",
          sortOrder: 20,
          body: `Quick heads up — {{companyName}} have your appointment in for the free survey. Any questions before then, give me a shout or call them direct on {{supportPhone}}. — {{partnerName}}`,
        },
        {
          companyId: company.id,
          channel: "EMAIL",
          title: "Detailed intro email",
          subject: `Quote from {{companyName}} — sending your details across`,
          sortOrder: 10,
          body: `Hi,\n\nThanks for the chat — as discussed I'm putting you in touch with {{companyName}}.\n\nI'll forward your details (name, phone, address) so they can call you to arrange a free, no-obligation survey. There's no pressure to go ahead — it's the easiest way to find out exactly what a job would cost for your property.\n\nIf you'd rather contact them directly first, they're on {{supportPhone}} or {{supportEmail}}.\n\nCheers,\n{{partnerName}}\n{{businessName}}`,
        },
      ],
    });

    return { user, company, membership };
    },
  );

  // Both emails are fire-and-forget — a failing send must never block signup.
  // Run them in parallel so we don't add 2× round-trip latency to the flow.
  await Promise.all([
    sendNewCompanySignupNotification(company, data.ownerName),
    sendCompanyWelcomeEmail(company, data.ownerName),
  ]);

  // Sign them in acting as the new company's admin. For an existing
  // user this replaces their current session context — they can switch
  // back to their other memberships from the nav.
  await createSession(user.id, membership.id);
  // Land new signups on /company/settings — they need to upload a logo,
  // tune payouts, and grab their signup link. Dropping them on /company
  // (an empty referrals dashboard) is disorienting on day one.
  redirect("/company/settings?welcome=1");
}
