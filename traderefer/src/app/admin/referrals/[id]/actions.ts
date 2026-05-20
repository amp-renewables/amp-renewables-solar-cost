"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { expectedPayoutsForStatus } from "@/lib/payouts";
import type { ReferralStatus } from "@prisma/client";

const StatusSchema = z.object({
  referralId: z.string().min(1),
  toStatus: z.enum([
    "SUBMITTED",
    "CONTACTED",
    "APPOINTMENT_BOOKED",
    "APPOINTMENT_COMPLETED",
    "JOB_SOLD",
    "JOB_INSTALLED",
    "REJECTED",
  ]),
  appointmentDate: z.string().optional(),
  jobValue: z.string().optional(),
  rejectedReason: z.string().optional(),
  note: z.string().optional(),
});

// Single source of truth for status changes. Updates the referral row,
// records an audit event, and creates the right payouts idempotently.
export async function updateReferralStatusAction(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = StatusSchema.parse({
    referralId: formData.get("referralId"),
    toStatus: formData.get("toStatus"),
    appointmentDate: formData.get("appointmentDate") || undefined,
    jobValue: formData.get("jobValue") || undefined,
    rejectedReason: formData.get("rejectedReason") || undefined,
    note: formData.get("note") || undefined,
  });

  const existing = await prisma.referral.findUnique({
    where: { id: parsed.referralId },
    include: { payouts: true },
  });
  if (!existing) throw new Error("Referral not found");

  const now = new Date();
  const updates: Record<string, unknown> = { status: parsed.toStatus };

  if (
    parsed.toStatus === "APPOINTMENT_BOOKED" &&
    !existing.appointmentBookedAt
  ) {
    updates.appointmentBookedAt = now;
  }
  if (parsed.appointmentDate) {
    updates.appointmentDate = new Date(parsed.appointmentDate);
  }
  if (
    parsed.toStatus === "APPOINTMENT_COMPLETED" &&
    !existing.appointmentCompletedAt
  ) {
    updates.appointmentCompletedAt = now;
  }
  if (parsed.toStatus === "JOB_SOLD" && !existing.jobSoldAt) {
    updates.jobSoldAt = now;
  }
  if (parsed.toStatus === "JOB_INSTALLED" && !existing.jobInstalledAt) {
    updates.jobInstalledAt = now;
  }
  if (parsed.jobValue) {
    const v = Number(parsed.jobValue);
    if (!Number.isNaN(v)) updates.jobValue = v;
  }
  if (parsed.toStatus === "REJECTED") {
    updates.rejectedReason = parsed.rejectedReason || null;
  }

  await prisma.$transaction(async (tx) => {
    await tx.referral.update({
      where: { id: existing.id },
      data: updates,
    });

    await tx.referralStatusEvent.create({
      data: {
        referralId: existing.id,
        fromStatus: existing.status,
        toStatus: parsed.toStatus as ReferralStatus,
        changedBy: admin.id,
        note: parsed.note || null,
      },
    });

    // Reconcile payouts.
    const expected = expectedPayoutsForStatus(parsed.toStatus);
    const existingByType = new Map(existing.payouts.map((p) => [p.type, p]));

    for (const e of expected) {
      const current = existingByType.get(e.type);
      if (!current) {
        await tx.payout.create({
          data: {
            referralId: existing.id,
            type: e.type,
            amount: e.amount,
            status: "PENDING",
          },
        });
      } else if (current.status === "CANCELLED") {
        // Was previously cancelled (e.g. status moved backwards then forward
        // again); reopen it.
        await tx.payout.update({
          where: { id: current.id },
          data: { status: "PENDING", amount: e.amount },
        });
      }
    }

    // If the new status no longer warrants a payout that previously existed,
    // cancel any unpaid ones (don't touch already-paid ones).
    const expectedTypes = new Set(expected.map((e) => e.type));
    for (const p of existing.payouts) {
      if (!expectedTypes.has(p.type) && p.status === "PENDING") {
        await tx.payout.update({
          where: { id: p.id },
          data: { status: "CANCELLED" },
        });
      }
    }
  });

  revalidatePath(`/admin/referrals/${existing.id}`);
  revalidatePath("/admin/referrals");
  revalidatePath("/admin/payouts");
  revalidatePath("/admin");
}
