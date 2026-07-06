"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCompanyBySlug, payoutsForCompany } from "@/lib/company";
import { companyWriteGate } from "@/lib/stripe";
import {
  sendNewReferralNotification,
  sendLockedReferralNotification,
  sendReferrerReferralConfirmation,
} from "@/lib/email";
import { sendSms } from "@/lib/sms";
import { platform } from "@/lib/platform";

// The Golden Ticket flow: anyone refers via a public link with NO account.
// We capture who they are (name/email/mobile) alongside the customer's
// details, create a DORMANT referrer (a passwordless User + membership) and
// credit the referral to them. They only ever "sign up" — set a password +
// bank details — when a referral pays out and there's a reward to claim.
const GoldenTicketSchema = z.object({
  slug: z.string().min(1),
  // The referrer, about themselves. No password — that's the whole point.
  referrerName: z.string().trim().min(2, "Please enter your name"),
  referrerEmail: z.string().trim().email("Please enter a valid email"),
  referrerPhone: z.string().trim().min(7, "Please enter your mobile number"),
  // The person they're referring.
  customerName: z.string().trim().min(2, "Please enter their name"),
  customerPhone: z.string().trim().min(7, "Please enter their phone number"),
  postcode: z.string().trim().min(3, "Please enter their postcode"),
  services: z.array(z.string()).min(1, "Please pick at least one option"),
  notes: z.string().trim().optional(),
  consent: z.literal("1", {
    errorMap: () => ({
      message:
        "Please confirm you have their permission to pass on their details.",
    }),
  }),
});

export type GoldenTicketState = {
  errors?: Record<string, string>;
  formError?: string;
};

export async function submitGoldenTicketReferralAction(
  _prev: GoldenTicketState,
  formData: FormData,
): Promise<GoldenTicketState> {
  const slug = String(formData.get("slug") || "");
  const company = await getCompanyBySlug(slug);
  if (!company) return { formError: "This referral link is no longer valid." };

  const services = formData.getAll("services").map(String).filter(Boolean);
  const validServiceSet = new Set(company.services);
  const filteredServices = services.filter((s) => validServiceSet.has(s));

  const parsed = GoldenTicketSchema.safeParse({
    slug,
    referrerName: formData.get("referrerName"),
    referrerEmail: formData.get("referrerEmail"),
    referrerPhone: formData.get("referrerPhone"),
    customerName: formData.get("customerName"),
    customerPhone: formData.get("customerPhone"),
    postcode: formData.get("postcode"),
    services: filteredServices,
    notes: formData.get("notes") || undefined,
    consent: formData.get("consent"),
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

  const d = parsed.data;
  const referrerEmail = d.referrerEmail.toLowerCase();

  // Guard: the referrer can't refer their own email in as the customer via
  // some odd flow — not critical, but skip self-referral confusion.
  // (Customer identity is separate; no check needed beyond validation.)

  // Find-or-create the referrer. If the email already has an account
  // (dormant OR real), reuse it — their referrals accrue to one identity.
  // A brand-new referrer is created DORMANT: no password. They claim later.
  const existing = await prisma.user.findUnique({
    where: { email: referrerEmail },
    select: { id: true, fullName: true, phone: true },
  });
  const referrerUser = existing
    ? existing
    : await prisma.user.create({
        data: {
          email: referrerEmail,
          // hashedPassword omitted → null → dormant/unclaimed.
          fullName: d.referrerName,
          phone: d.referrerPhone,
        },
        select: { id: true, fullName: true, phone: true },
      });

  // Ensure they have a membership at this company so payout-rate lookups
  // and the company's partner views treat them like any other referrer.
  // Golden-ticket referrers are individuals → AMBASSADOR.
  await prisma.membership.upsert({
    where: {
      userId_companyId: { userId: referrerUser.id, companyId: company.id },
    },
    create: {
      userId: referrerUser.id,
      companyId: company.id,
      role: "AMBASSADOR",
    },
    update: {},
  });

  const gate = companyWriteGate(company);

  const referral = await prisma.referral.create({
    data: {
      companyId: company.id,
      partnerId: referrerUser.id,
      customerName: d.customerName,
      customerPhone: d.customerPhone,
      postcode: d.postcode.toUpperCase(),
      services: d.services,
      notes: d.notes || null,
      customerConsentConfirmed: true,
      customerConsentConfirmedAt: new Date(),
      status: "SUBMITTED",
      statusHistory: {
        create: {
          toStatus: "SUBMITTED",
          note: "Referred via link (referrer not yet claimed)",
        },
      },
    },
  });

  // Notify the company (full details, or locked teaser if they've lapsed —
  // same rule as every other referral submission).
  const partnerForEmail = {
    id: referrerUser.id,
    email: referrerEmail,
    fullName: referrerUser.fullName,
    businessName: null,
    phone: referrerUser.phone ?? d.referrerPhone,
  };
  if (gate.canWrite) {
    await sendNewReferralNotification(
      {
        id: referral.id,
        customerName: referral.customerName,
        customerPhone: referral.customerPhone,
        customerEmail: referral.customerEmail,
        addressLine1: referral.addressLine1,
        addressLine2: referral.addressLine2,
        city: referral.city,
        postcode: referral.postcode,
        services: referral.services,
        notes: referral.notes,
      },
      partnerForEmail,
      company,
    );
  } else {
    await sendLockedReferralNotification(partnerForEmail, company);
  }

  // Confirm to the referrer — email + text. Sets the reward expectation and
  // makes clear there's nothing to do until it pays out.
  const potentialTotal = payoutsForCompany(company).total;
  await Promise.all([
    sendReferrerReferralConfirmation(
      { email: referrerEmail, fullName: referrerUser.fullName ?? d.referrerName },
      company,
      { customerName: d.customerName, potentialTotal },
    ),
    sendSms(
      d.referrerPhone,
      `Thanks for referring ${d.customerName} to ${company.name} via ${platform.name}. If it goes ahead you'll earn — we'll text you a link to claim your reward, no sign-up needed until then. Reply STOP to opt out.`,
    ),
  ]);

  redirect(`/${company.slug}/refer?done=1`);
}
