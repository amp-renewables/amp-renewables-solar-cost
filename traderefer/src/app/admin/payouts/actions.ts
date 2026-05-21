"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const MarkPaidSchema = z.object({
  payoutId: z.string().min(1),
  paymentRef: z.string().optional(),
});

export async function markPayoutPaidAction(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = MarkPaidSchema.parse({
    payoutId: formData.get("payoutId"),
    paymentRef: formData.get("paymentRef") || undefined,
  });

  await prisma.payout.update({
    where: { id: parsed.payoutId },
    data: {
      status: "PAID",
      paidAt: new Date(),
      paidBy: admin.id,
      paymentRef: parsed.paymentRef || null,
    },
  });

  revalidatePath("/admin/payouts");
  revalidatePath("/admin");
}

const MarkBatchSchema = z.object({
  payoutIds: z.array(z.string()).min(1),
  paymentRef: z.string().optional(),
});

export async function markPayoutsBatchPaidAction(formData: FormData) {
  const admin = await requireAdmin();
  const ids = formData.getAll("payoutIds").map(String).filter(Boolean);
  const parsed = MarkBatchSchema.parse({
    payoutIds: ids,
    paymentRef: formData.get("paymentRef") || undefined,
  });

  await prisma.payout.updateMany({
    where: { id: { in: parsed.payoutIds }, status: "PENDING" },
    data: {
      status: "PAID",
      paidAt: new Date(),
      paidBy: admin.id,
      paymentRef: parsed.paymentRef || null,
    },
  });

  revalidatePath("/admin/payouts");
  revalidatePath("/admin");
}
