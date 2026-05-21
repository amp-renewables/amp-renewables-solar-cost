"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth";

const SettingsSchema = z.object({
  name: z.string().trim().min(2),
  contactEmail: z.string().trim().email(),
  contactPhone: z.string().trim().optional(),
  websiteUrl: z.string().trim().optional(),
  addressLine: z.string().trim().optional(),
  heroSubheading: z.string().trim().optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex code like #1a3c2a"),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex code like #52b788"),
  logoUrl: z.string().trim().optional(),
  payoutAppointment: z.coerce.number().min(0),
  payoutJob: z.coerce.number().min(0),
  servicesCsv: z.string().trim().min(1),
});

export type SettingsState = {
  errors?: Record<string, string>;
  formError?: string;
  ok?: boolean;
};

export async function saveCompanySettings(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const admin = await requireCompanyAdmin();
  const parsed = SettingsSchema.safeParse({
    name: formData.get("name"),
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone") || undefined,
    websiteUrl: formData.get("websiteUrl") || undefined,
    addressLine: formData.get("addressLine") || undefined,
    heroSubheading: formData.get("heroSubheading") || undefined,
    primaryColor: formData.get("primaryColor"),
    accentColor: formData.get("accentColor"),
    logoUrl: formData.get("logoUrl") || undefined,
    payoutAppointment: formData.get("payoutAppointment"),
    payoutJob: formData.get("payoutJob"),
    servicesCsv: formData.get("servicesCsv"),
  });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && !errors[field])
        errors[field] = issue.message;
    }
    return { errors };
  }

  const d = parsed.data;
  const services = d.servicesCsv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  await prisma.company.update({
    where: { id: admin.companyId },
    data: {
      name: d.name,
      contactEmail: d.contactEmail.toLowerCase(),
      contactPhone: d.contactPhone || null,
      websiteUrl: d.websiteUrl || null,
      addressLine: d.addressLine || null,
      heroSubheading: d.heroSubheading || null,
      primaryColor: d.primaryColor,
      accentColor: d.accentColor,
      logoUrl: d.logoUrl || null,
      payoutAppointment: d.payoutAppointment,
      payoutJob: d.payoutJob,
      services,
    },
  });

  revalidatePath("/company/settings");
  revalidatePath("/company");
  return { ok: true };
}
