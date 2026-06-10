"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePartner } from "@/lib/auth";
import { getCompanyById } from "@/lib/company";
import { assertCompanyCanWrite } from "@/lib/stripe";
import { sendNewReferralNotification } from "@/lib/email";

const ReferralSchema = z.object({
  // Name + phone + postcode are the only required customer fields — a
  // tradesman referring from a van has the number and roughly where the
  // job is. Email and full address are optional; the company collects
  // them on the follow-up call.
  customerName: z.string().trim().min(2, "Customer name required"),
  customerPhone: z.string().trim().min(7, "Customer phone required"),
  customerEmail: z
    .string()
    .trim()
    .email("That email doesn't look right")
    .optional()
    .or(z.literal("")),
  addressLine1: z.string().trim().optional(),
  addressLine2: z.string().trim().optional(),
  city: z.string().trim().optional(),
  postcode: z.string().trim().min(3, "Postcode required"),
  services: z.array(z.string()).min(1, "Pick at least one service"),
  notes: z.string().trim().optional(),
  // Hard requirement under UK data protection rules — the partner must
  // tick the box confirming customer consent before we'll accept the
  // referral. The literal "1" comes from the checkbox value on the form.
  customerConsentConfirmed: z.literal("1", {
    errorMap: () => ({
      message:
        "You must confirm the customer has given you permission to share their details.",
    }),
  }),
});

export type ReferState = {
  errors?: Record<string, string>;
  formError?: string;
};

export async function submitReferralAction(
  _prev: ReferState,
  formData: FormData,
): Promise<ReferState> {
  const user = await requirePartner();
  const company = await getCompanyById(user.companyId);
  if (!company) return { formError: "Company not found." };
  assertCompanyCanWrite(company);

  const services = formData.getAll("services").map(String).filter(Boolean);
  const validServiceSet = new Set(company.services);
  const filteredServices = services.filter((s) => validServiceSet.has(s));

  const parsed = ReferralSchema.safeParse({
    customerName: formData.get("customerName"),
    customerPhone: formData.get("customerPhone"),
    // The optional-details section is collapsed by default, so these
    // fields may be absent from the FormData entirely. formData.get()
    // returns null in that case — coerce to undefined so Zod's
    // .optional() accepts it (optional means undefined, not null).
    customerEmail: formData.get("customerEmail") || undefined,
    addressLine1: formData.get("addressLine1") || undefined,
    addressLine2: formData.get("addressLine2") || undefined,
    city: formData.get("city") || undefined,
    postcode: formData.get("postcode"),
    services: filteredServices,
    notes: formData.get("notes") || undefined,
    customerConsentConfirmed: formData.get("customerConsentConfirmed"),
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
  const referral = await prisma.referral.create({
    data: {
      companyId: company.id,
      partnerId: user.id,
      customerName: d.customerName,
      customerPhone: d.customerPhone,
      customerEmail: d.customerEmail ? d.customerEmail.toLowerCase() : null,
      addressLine1: d.addressLine1 || null,
      addressLine2: d.addressLine2 || null,
      city: d.city || null,
      postcode: d.postcode.toUpperCase(),
      services: d.services,
      notes: d.notes || null,
      // The schema's `literal("1")` validator above guarantees we only
      // reach here when the partner ticked the box — record the consent.
      customerConsentConfirmed: true,
      customerConsentConfirmedAt: new Date(),
      status: "SUBMITTED",
      statusHistory: {
        create: { toStatus: "SUBMITTED", changedBy: user.id },
      },
    },
  });

  const partner = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      fullName: true,
      businessName: true,
      phone: true,
    },
  });
  if (partner) {
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
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/referrals");
  redirect("/dashboard/referrals?submitted=1");
}
