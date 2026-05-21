"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePartner } from "@/lib/auth";
import { getCompanyById } from "@/lib/company";
import { sendNewReferralNotification } from "@/lib/email";

const ReferralSchema = z.object({
  customerName: z.string().trim().min(2, "Customer name required"),
  customerPhone: z.string().trim().min(7, "Customer phone required"),
  customerEmail: z.string().trim().email("Valid customer email required"),
  addressLine1: z.string().trim().min(2, "Address line 1 required"),
  addressLine2: z.string().trim().optional(),
  city: z.string().trim().min(2, "City required"),
  postcode: z.string().trim().min(3, "Postcode required"),
  services: z.array(z.string()).min(1, "Pick at least one service"),
  notes: z.string().trim().optional(),
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

  const services = formData.getAll("services").map(String).filter(Boolean);
  const validServiceSet = new Set(company.services);
  const filteredServices = services.filter((s) => validServiceSet.has(s));

  const parsed = ReferralSchema.safeParse({
    customerName: formData.get("customerName"),
    customerPhone: formData.get("customerPhone"),
    customerEmail: formData.get("customerEmail"),
    addressLine1: formData.get("addressLine1"),
    addressLine2: formData.get("addressLine2") || undefined,
    city: formData.get("city"),
    postcode: formData.get("postcode"),
    services: filteredServices,
    notes: formData.get("notes") || undefined,
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
      customerEmail: d.customerEmail.toLowerCase(),
      addressLine1: d.addressLine1,
      addressLine2: d.addressLine2 || null,
      city: d.city,
      postcode: d.postcode.toUpperCase(),
      services: d.services,
      notes: d.notes || null,
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
