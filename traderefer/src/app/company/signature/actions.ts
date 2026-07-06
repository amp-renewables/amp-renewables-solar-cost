"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth";
import { assertCompanyCanWriteById } from "@/lib/stripe";

const SaveSchema = z.object({
  emailSignature: z.string().trim().max(500).optional(),
});

export type SignatureState = {
  ok?: string;
  error?: string;
};

export async function saveEmailSignatureAction(
  _prev: SignatureState,
  formData: FormData,
): Promise<SignatureState> {
  const admin = await requireCompanyAdmin();
  await assertCompanyCanWriteById(admin.companyId);

  const result = SaveSchema.safeParse({
    emailSignature: formData.get("emailSignature") || undefined,
  });

  if (!result.success) {
    return {
      error: "Signature is too long — keep it under 500 characters.",
    };
  }

  // Empty string is the user's way of saying 'use the default' — store
  // null so the lib falls back to DEFAULT_SIGNATURE_TEMPLATE cleanly.
  const text = result.data.emailSignature?.trim();
  await prisma.company.update({
    where: { id: admin.companyId },
    data: { emailSignature: text && text.length > 0 ? text : null },
  });

  revalidatePath("/company/signature");
  return { ok: "Signature saved." };
}
