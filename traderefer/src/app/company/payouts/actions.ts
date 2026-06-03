"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth";
import { assertCompanyCanWriteById } from "@/lib/stripe";
import { decryptField } from "@/lib/crypto";

const MarkPaidSchema = z.object({
  payoutId: z.string().min(1),
  paymentRef: z.string().optional(),
});

export async function markPayoutPaidAction(formData: FormData) {
  const admin = await requireCompanyAdmin();
  await assertCompanyCanWriteById(admin.companyId);
  const result = MarkPaidSchema.safeParse({
    payoutId: formData.get("payoutId"),
    paymentRef: formData.get("paymentRef") || undefined,
  });
  if (!result.success) {
    console.error(
      "[markPayoutPaidAction] invalid form submission:",
      result.error.flatten(),
    );
    throw new Error("Could not mark payout — invalid form submission.");
  }
  const parsed = result.data;

  // Guard: only allow marking payouts that belong to this admin's company.
  const payout = await prisma.payout.findUnique({
    where: { id: parsed.payoutId },
    include: { referral: { select: { companyId: true } } },
  });
  if (!payout || payout.referral.companyId !== admin.companyId) {
    throw new Error("Not authorised to modify this payout");
  }

  await prisma.payout.update({
    where: { id: parsed.payoutId },
    data: {
      status: "PAID",
      paidAt: new Date(),
      paidBy: admin.id,
      paymentRef: parsed.paymentRef || null,
    },
  });

  revalidatePath("/company/payouts");
  revalidatePath("/company");
}

/**
 * Server action returning the decrypted bank details for a partner. Used
 * by the masked-by-default UI on /company/payouts when the admin clicks
 * 'Reveal' to actually make a transfer.
 *
 * Side effects:
 *   - Writes an append-only row to BankDetailsAccess so we have an audit
 *     trail of who looked at whose details and when. Critical for SAR
 *     responses and insider-abuse detection.
 *
 * Security:
 *   - Requires COMPANY_ADMIN session.
 *   - Verifies the partner belongs to the admin's company (prevents
 *     cross-tenant data access via a hand-crafted call).
 *   - Returns a structured result (never throws on auth failure) so the
 *     client can render a friendly message.
 */
export type RevealResult =
  | { ok: true; sortCode: string; accountNumber: string }
  | { ok: false; error: string };

export async function revealPartnerBankDetailsAction(
  partnerUserId: string,
): Promise<RevealResult> {
  const admin = await requireCompanyAdmin();

  const partner = await prisma.user.findUnique({
    where: { id: partnerUserId },
    select: {
      companyId: true,
      role: true,
      bankSortCode: true,
      bankAccountNumber: true,
    },
  });

  if (
    !partner ||
    partner.companyId !== admin.companyId ||
    partner.role !== "PARTNER"
  ) {
    return { ok: false, error: "Partner not found." };
  }

  if (!partner.bankSortCode || !partner.bankAccountNumber) {
    return {
      ok: false,
      error: "This partner hasn't added their bank details yet.",
    };
  }

  let sortCode: string;
  let accountNumber: string;
  try {
    sortCode = decryptField(partner.bankSortCode);
    accountNumber = decryptField(partner.bankAccountNumber);
  } catch (err) {
    console.error(
      "[revealPartnerBankDetailsAction] decrypt failed for partner",
      partnerUserId,
      err,
    );
    return {
      ok: false,
      error:
        "Could not read bank details (encryption error). Contact support.",
    };
  }

  // Audit row — never fail the reveal on log failure, but record loudly.
  try {
    await prisma.bankDetailsAccess.create({
      data: {
        partnerUserId,
        viewedByUserId: admin.id,
        context: "company-payouts",
      },
    });
  } catch (err) {
    console.error(
      "[revealPartnerBankDetailsAction] audit log write failed",
      err,
    );
  }

  return { ok: true, sortCode, accountNumber };
}
