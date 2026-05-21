"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { findAvailableSlug } from "@/lib/company";
import { platform } from "@/lib/platform";
import { sendNewCompanySignupNotification } from "@/lib/email";

const SignupSchema = z.object({
  companyName: z.string().trim().min(2, "Please enter your company name"),
  ownerName: z.string().trim().min(2, "Please enter your name"),
  email: z.string().trim().email("Please enter a valid email"),
  phone: z.string().trim().min(7, "Please enter a valid phone number"),
  password: z.string().min(8, "Password must be at least 8 characters"),
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

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return { formError: "An account already exists for that email address." };
  }

  const slug = await findAvailableSlug(data.companyName);
  const trialEndsAt = new Date(
    Date.now() + platform.pricing.trialDays * 24 * 60 * 60 * 1000,
  );

  const hashed = await hashPassword(data.password);

  const { user, company } = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        slug,
        name: data.companyName,
        contactEmail: email,
        contactPhone: data.phone,
        status: "TRIAL",
        trialEndsAt,
        // Sensible defaults — the COMPANY_ADMIN can refine on their settings page.
        services: ["Solar PV", "Battery Storage", "EV Charger", "Heat Pump"],
        payoutAppointment: 50,
        payoutJob: 250,
      },
    });

    const user = await tx.user.create({
      data: {
        email,
        hashedPassword: hashed,
        fullName: data.ownerName,
        businessName: data.companyName,
        phone: data.phone,
        role: "COMPANY_ADMIN",
        companyId: company.id,
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

    return { user, company };
  });

  await sendNewCompanySignupNotification(company, data.ownerName);

  await createSession(user.id, user.role, user.companyId);
  // Land new signups on /company/settings — they need to upload a logo,
  // tune payouts, and grab their signup link. Dropping them on /company
  // (an empty referrals dashboard) is disorienting on day one.
  redirect("/company/settings?welcome=1");
}
