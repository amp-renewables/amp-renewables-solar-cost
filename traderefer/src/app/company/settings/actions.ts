"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth";
import { assertCompanyCanWriteById } from "@/lib/stripe";
import { geocodePostcode } from "@/lib/geo";

const SettingsSchema = z.object({
  name: z.string().trim().min(2),
  contactEmail: z.string().trim().email(),
  contactPhone: z.string().trim().optional(),
  websiteUrl: z.string().trim().optional(),
  addressLine: z.string().trim().optional(),
  heroSubheading: z.string().trim().optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex code like #1a3c2a"),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex code like #52b788"),
  payoutAppointment: z.coerce.number().min(0),
  payoutJob: z.coerce.number().min(0),
  acceptsBusinessPartners: z.boolean(),
  acceptsAmbassadors: z.boolean(),
  postcode: z.string().trim().optional(),
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
  await assertCompanyCanWriteById(admin.companyId);
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
    acceptsBusinessPartners:
      formData.get("acceptsBusinessPartners") === "on",
    acceptsAmbassadors: formData.get("acceptsAmbassadors") === "on",
    postcode: formData.get("postcode") || undefined,
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

  // A programme nobody can join is a dead signup page — force at least
  // one referrer type on.
  if (
    !parsed.data.acceptsBusinessPartners &&
    !parsed.data.acceptsAmbassadors
  ) {
    return {
      errors: {
        referrerTypes:
          "Pick at least one referrer type — otherwise nobody can sign up.",
      },
    };
  }

  const d = parsed.data;
  const services = d.servicesCsv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // Geocode the postcode only when it actually changed — saves a
  // postcodes.io round-trip on every unrelated settings save. A postcode
  // that fails to geocode is rejected so the company doesn't silently
  // vanish from "programmes near you" with a typo'd postcode stored.
  const current = await prisma.company.findUnique({
    where: { id: admin.companyId },
    select: { postcode: true },
  });
  let geo: {
    postcode: string | null;
    latitude: number | null;
    longitude: number | null;
    geoDistrict: string | null;
  } | null = null;
  const typedPostcode = d.postcode?.trim() || null;
  if (!typedPostcode) {
    geo = {
      postcode: null,
      latitude: null,
      longitude: null,
      geoDistrict: null,
    };
  } else if (typedPostcode.toUpperCase() !== current?.postcode?.toUpperCase()) {
    const result = await geocodePostcode(typedPostcode);
    if (!result) {
      return {
        errors: {
          postcode: "That doesn't look like a real UK postcode — check it?",
        },
      };
    }
    geo = {
      postcode: result.postcode,
      latitude: result.latitude,
      longitude: result.longitude,
      geoDistrict: result.district,
    };
  }

  const updated = await prisma.company.update({
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
      payoutAppointment: d.payoutAppointment,
      payoutJob: d.payoutJob,
      acceptsBusinessPartners: d.acceptsBusinessPartners,
      acceptsAmbassadors: d.acceptsAmbassadors,
      ...(geo ?? {}),
      services,
    },
    select: { slug: true },
  });

  revalidatePath("/company/settings");
  revalidatePath("/company");
  // Public landing + partner-signup pages display the payout amounts,
  // services list, brand name, etc. — they all need to refresh when an
  // admin saves new settings, otherwise visitors see stale numbers.
  revalidatePath(`/${updated.slug}`);
  revalidatePath(`/${updated.slug}/signup`);
  return { ok: true };
}
