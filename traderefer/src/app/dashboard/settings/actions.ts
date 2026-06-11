"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePartner } from "@/lib/auth";
import { assertCompanyCanWriteById } from "@/lib/stripe";
import { encryptField } from "@/lib/crypto";
import { geocodePostcode } from "@/lib/geo";

const ProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your name"),
  // Optional — ambassadors and individual referrers don't have one.
  businessName: z.string().trim().optional(),
  phone: z.string().trim().min(7, "Please enter a valid phone"),
  postcode: z.string().trim().optional(),
});

const BankSchema = z.object({
  bankAccountName: z.string().trim().min(2, "Account name required").max(80),
  bankSortCode: z
    .string()
    .trim()
    .regex(/^\d{2}-?\d{2}-?\d{2}$/, "Sort code looks like 12-34-56"),
  bankAccountNumber: z
    .string()
    .trim()
    .regex(/^\d{8}$/, "Account number is 8 digits"),
});

export type SettingsState = {
  errors?: Record<string, string>;
  formError?: string;
  ok?: string;
};

export async function saveProfileAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const user = await requirePartner();
  await assertCompanyCanWriteById(user.companyId);
  const parsed = ProfileSchema.safeParse({
    fullName: formData.get("fullName"),
    businessName: formData.get("businessName") || undefined,
    phone: formData.get("phone"),
    postcode: formData.get("postcode") || undefined,
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

  // Geocode only when the postcode actually changed (saves a network
  // call); reject postcodes that don't geocode rather than storing a
  // typo that silently breaks "programmes near you".
  const current = await prisma.user.findUnique({
    where: { id: user.id },
    select: { postcode: true },
  });
  let geo: {
    postcode: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null = null;
  const typedPostcode = parsed.data.postcode?.trim() || null;
  if (!typedPostcode) {
    geo = { postcode: null, latitude: null, longitude: null };
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
    };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      fullName: parsed.data.fullName,
      businessName: parsed.data.businessName || null,
      phone: parsed.data.phone,
      ...(geo ?? {}),
    },
  });
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { ok: "Profile saved." };
}

export async function saveBankAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const user = await requirePartner();
  await assertCompanyCanWriteById(user.companyId);
  const parsed = BankSchema.safeParse({
    bankAccountName: formData.get("bankAccountName"),
    bankSortCode: formData.get("bankSortCode"),
    bankAccountNumber: formData.get("bankAccountNumber"),
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
  // Normalise sort code to digits-with-dashes ('12-34-56') and the account
  // number to bare digits before encryption — keeps stored format consistent
  // regardless of how the partner typed it.
  const sortCodeNormalised = parsed.data.bankSortCode.replace(/[^0-9-]/g, "");
  const accountNumberNormalised = parsed.data.bankAccountNumber;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      bankAccountName: parsed.data.bankAccountName,
      // The two sensitive fields go through AES-256-GCM. What we store is a
      // base64 envelope of IV || tag || ciphertext, not the raw digits.
      bankSortCode: encryptField(sortCodeNormalised),
      bankAccountNumber: encryptField(accountNumberNormalised),
      // Plaintext trailing digits for masked admin views. Last 2 of the
      // sort code (the '56' in '12-34-56') and last 4 of the account
      // number — neither identifies the account on its own.
      bankSortCodeLast2: sortCodeNormalised.slice(-2),
      bankAccountNumberLast4: accountNumberNormalised.slice(-4),
    },
  });
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/payouts");
  return { ok: "Bank details saved." };
}
