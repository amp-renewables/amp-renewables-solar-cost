"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCompanyBySlug, payoutsForCompany } from "@/lib/company";
import { partnerReferralUrl } from "@/lib/partner-link";
import { sendReferrerLinkEmail } from "@/lib/email";
import { sendSms } from "@/lib/sms";

// "Get your referral link" — Build B. Someone (e.g. a past customer) asks
// for their own shareable link WITHOUT signing up. We mint a dormant
// referrer (passwordless User + AMBASSADOR membership) and hand back their
// personal /[slug]/refer/<membershipId> link. Whoever fills in that link is
// credited to this membership; on success they claim (their only sign-up).
const GetLinkSchema = z.object({
  slug: z.string().min(1),
  fullName: z.string().trim().min(2, "Please enter your name"),
  email: z.string().trim().email("Please enter a valid email"),
  phone: z.string().trim().min(7, "Please enter your mobile number"),
  consent: z.literal("1", {
    errorMap: () => ({
      message: "Please tick the box so we can send you your link and reward.",
    }),
  }),
});

export type GetLinkState = {
  errors?: Record<string, string>;
  formError?: string;
  ok?: boolean;
  referUrl?: string;
  firstName?: string;
};

export async function getReferralLinkAction(
  _prev: GetLinkState,
  formData: FormData,
): Promise<GetLinkState> {
  const slug = String(formData.get("slug") || "");
  const company = await getCompanyBySlug(slug);
  if (!company) return { formError: "This link is no longer valid." };

  const parsed = GetLinkSchema.safeParse({
    slug,
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
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
  const email = d.email.toLowerCase();

  // Find-or-create the referrer. New ones are DORMANT (no password) — they
  // only ever set one when they claim a reward.
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, fullName: true },
  });
  const referrer = existing
    ? existing
    : await prisma.user.create({
        data: {
          email,
          // hashedPassword omitted → null → dormant/unclaimed.
          fullName: d.fullName,
          phone: d.phone,
        },
        select: { id: true, fullName: true },
      });

  // Ensure a membership at this company so the personal link resolves and
  // payouts key off it. Individuals → AMBASSADOR.
  const membership = await prisma.membership.upsert({
    where: {
      userId_companyId: { userId: referrer.id, companyId: company.id },
    },
    create: {
      userId: referrer.id,
      companyId: company.id,
      role: "AMBASSADOR",
    },
    update: {},
    select: { id: true },
  });

  const referUrl = partnerReferralUrl(company.slug, membership.id);
  const potentialTotal = payoutsForCompany(company).total;
  const totalStr = `${company.currencySymbol}${potentialTotal}`;
  const firstName = (referrer.fullName || d.fullName).split(/\s+/)[0];

  // Send them their link so they don't lose it — email + text.
  await Promise.all([
    sendReferrerLinkEmail(
      { email, fullName: referrer.fullName ?? d.fullName },
      company,
      { referUrl, potentialTotal },
    ),
    sendSms(
      d.phone,
      `Here's your ${company.name} referral link — share it and earn up to ${totalStr}: ${referUrl} Reply STOP to opt out.`,
    ),
  ]);

  return { ok: true, referUrl, firstName };
}
