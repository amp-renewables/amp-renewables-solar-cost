"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePartner } from "@/lib/auth";
import { assertCompanyCanWriteById } from "@/lib/stripe";

const ProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your name"),
  businessName: z.string().trim().min(2, "Please enter your business name"),
  phone: z.string().trim().min(7, "Please enter a valid phone"),
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
    businessName: formData.get("businessName"),
    phone: formData.get("phone"),
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
  await prisma.user.update({
    where: { id: user.id },
    data: {
      fullName: parsed.data.fullName,
      businessName: parsed.data.businessName,
      phone: parsed.data.phone,
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
  await prisma.user.update({
    where: { id: user.id },
    data: {
      bankAccountName: parsed.data.bankAccountName,
      bankSortCode: parsed.data.bankSortCode.replace(/[^0-9-]/g, ""),
      bankAccountNumber: parsed.data.bankAccountNumber,
    },
  });
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/payouts");
  return { ok: "Bank details saved." };
}
