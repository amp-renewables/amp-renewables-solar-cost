"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCompanyById } from "@/lib/company";
import { companyWriteGate } from "@/lib/stripe";
import {
  sendNewReferralNotification,
  sendLockedReferralNotification,
} from "@/lib/email";

// A CUSTOMER submitting their own details through a partner's shareable
// link (/[slug]/refer/[code], where code = the partner's membership id).
// The resulting Referral is credited to that partner. The customer gives
// their OWN consent here — cleaner than the partner ticking it for them.
const CustomerReferralSchema = z.object({
  membershipId: z.string().min(1),
  customerName: z.string().trim().min(2, "Please enter your name"),
  customerPhone: z.string().trim().min(7, "Please enter your phone number"),
  customerEmail: z
    .string()
    .trim()
    .email("That email doesn't look right")
    .optional()
    .or(z.literal("")),
  postcode: z.string().trim().min(3, "Please enter your postcode"),
  services: z.array(z.string()).min(1, "Please pick at least one option"),
  notes: z.string().trim().optional(),
  // The customer's own consent to be contacted — recorded with a
  // timestamp, same audit field the partner form uses.
  consent: z.literal("1", {
    errorMap: () => ({
      message: "Please tick the box so we can pass your details on.",
    }),
  }),
});

export type CustomerReferralState = {
  errors?: Record<string, string>;
  formError?: string;
};

export async function submitCustomerReferralAction(
  _prev: CustomerReferralState,
  formData: FormData,
): Promise<CustomerReferralState> {
  const membershipId = String(formData.get("membershipId") || "");

  // The link's code is a partner membership id. It must resolve to a real
  // referring membership (BUSINESS_PARTNER/AMBASSADOR); anything else and
  // the link is dead.
  const membership = membershipId
    ? await prisma.membership.findUnique({
        where: { id: membershipId },
        select: { id: true, userId: true, companyId: true, role: true },
      })
    : null;
  if (
    !membership ||
    (membership.role !== "BUSINESS_PARTNER" && membership.role !== "AMBASSADOR")
  ) {
    return { formError: "This referral link is no longer valid." };
  }

  const company = await getCompanyById(membership.companyId);
  if (!company) return { formError: "This referral link is no longer valid." };

  const services = formData.getAll("services").map(String).filter(Boolean);
  const validServiceSet = new Set(company.services);
  const filteredServices = services.filter((s) => validServiceSet.has(s));

  const parsed = CustomerReferralSchema.safeParse({
    membershipId,
    customerName: formData.get("customerName"),
    customerPhone: formData.get("customerPhone"),
    customerEmail: formData.get("customerEmail") || undefined,
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

  // Deliberately NOT write-gated — mirrors submitReferralAction: a lapsed
  // company still captures the lead, but gets the locked teaser email
  // instead of the full details. Demand piling up is the dunning lever.
  const gate = companyWriteGate(company);

  const referral = await prisma.referral.create({
    data: {
      companyId: company.id,
      partnerId: membership.userId,
      customerName: d.customerName,
      customerPhone: d.customerPhone,
      customerEmail: d.customerEmail ? d.customerEmail.toLowerCase() : null,
      postcode: d.postcode.toUpperCase(),
      services: d.services,
      notes: d.notes || null,
      customerConsentConfirmed: true,
      customerConsentConfirmedAt: new Date(),
      status: "SUBMITTED",
      statusHistory: {
        create: { toStatus: "SUBMITTED", note: "Submitted by customer via partner link" },
      },
    },
  });

  const partner = await prisma.user.findUnique({
    where: { id: membership.userId },
    select: { id: true, email: true, fullName: true, businessName: true, phone: true },
  });
  if (partner) {
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
        partner,
        company,
      );
    } else {
      await sendLockedReferralNotification(partner, company);
    }
  }

  redirect(`/${company.slug}/refer/${membership.id}?done=1`);
}
