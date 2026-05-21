"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth";

const MarkPaidSchema = z.object({
  payoutId: z.string().min(1),
  paymentRef: z.string().optional(),
});

export async function markPayoutPaidAction(formData: FormData) {
  const admin = await requireCompanyAdmin();
  const parsed = MarkPaidSchema.parse({
    payoutId: formData.get("payoutId"),
    paymentRef: formData.get("paymentRef") || undefined,
  });

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
