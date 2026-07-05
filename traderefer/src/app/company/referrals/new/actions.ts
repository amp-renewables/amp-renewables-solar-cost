"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth";
import { getCompanyById } from "@/lib/company";
import { assertCompanyCanWriteById } from "@/lib/stripe";

// Admin-entered lead. Same customer shape as the partner refer form, plus
// a partnerId — the admin logs a lead that arrived off-platform (e.g. a
// roofer's WhatsApp) and attributes it to the partner who sent it, so it
// flows through the normal status/payout machinery.
const AddLeadSchema = z.object({
  partnerId: z.string().trim().min(1, "Choose which partner sent this lead"),
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
  // The admin confirms the referring partner obtained the customer's
  // consent. Recorded with a timestamp for the same audit reason the
  // partner form captures it.
  customerConsentConfirmed: z.literal("1", {
    errorMap: () => ({
      message:
        "Confirm the partner has the customer's permission to share their details.",
    }),
  }),
});

export type AddLeadState = {
  errors?: Record<string, string>;
  formError?: string;
};

export async function addLeadAction(
  _prev: AddLeadState,
  formData: FormData,
): Promise<AddLeadState> {
  const admin = await requireCompanyAdmin();
  const company = await getCompanyById(admin.companyId);
  if (!company) return { formError: "Company not found." };

  // Manual add IS write-gated — a lapsed company shouldn't be logging new
  // leads. (Partner self-submission is deliberately NOT gated; this is.)
  await assertCompanyCanWriteById(company.id);

  const services = formData.getAll("services").map(String).filter(Boolean);
  const validServiceSet = new Set(company.services);
  const filteredServices = services.filter((s) => validServiceSet.has(s));

  const parsed = AddLeadSchema.safeParse({
    partnerId: formData.get("partnerId"),
    customerName: formData.get("customerName"),
    customerPhone: formData.get("customerPhone"),
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

  // Security: the chosen partner must genuinely be a partner-membership of
  // THIS company. Never trust the posted id — an admin could otherwise
  // attribute a lead to an arbitrary user.
  const membership = await prisma.membership.findFirst({
    where: {
      userId: d.partnerId,
      companyId: company.id,
      role: { in: ["BUSINESS_PARTNER", "AMBASSADOR"] },
    },
    select: { userId: true },
  });
  if (!membership) {
    return {
      errors: { partnerId: "That partner isn't part of your programme." },
    };
  }

  const referral = await prisma.referral.create({
    data: {
      companyId: company.id,
      partnerId: membership.userId,
      customerName: d.customerName,
      customerPhone: d.customerPhone,
      customerEmail: d.customerEmail ? d.customerEmail.toLowerCase() : null,
      addressLine1: d.addressLine1 || null,
      addressLine2: d.addressLine2 || null,
      city: d.city || null,
      postcode: d.postcode.toUpperCase(),
      services: d.services,
      notes: d.notes || null,
      customerConsentConfirmed: true,
      customerConsentConfirmedAt: new Date(),
      status: "SUBMITTED",
      statusHistory: {
        create: {
          toStatus: "SUBMITTED",
          changedBy: admin.id,
          note: "Logged by admin",
        },
      },
    },
  });

  // No company notification — the company is the one entering this. (The
  // partner isn't emailed either; a "a lead was logged for you" nudge is
  // a possible later addition.)
  revalidatePath("/company");
  revalidatePath("/company/referrals");
  redirect(`/company/referrals/${referral.id}?added=1`);
}
