"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth";
import { assertCompanyCanWriteById } from "@/lib/stripe";
import { expectedPayoutsForStatus } from "@/lib/payouts";
import { sendBankDetailsNeededEmail } from "@/lib/email";
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
  const admin = await requireCompanyAdmin();
  await assertCompanyCanWriteById(admin.companyId);
  const result = StatusSchema.safeParse({
    referralId: formData.get("referralId"),
    toStatus: formData.get("toStatus"),
    appointmentDate: formData.get("appointmentDate") || undefined,
    jobValue: formData.get("jobValue") || undefined,
    rejectedReason: formData.get("rejectedReason") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!result.success) {
    console.error(
      "[updateReferralStatusAction] invalid form submission:",
      result.error.flatten(),
    );
    throw new Error("Could not update referral — invalid form submission.");
  }
  const parsed = result.data;

  const existing = await prisma.referral.findUnique({
    where: { id: parsed.referralId },
    include: { payouts: true, company: true },
  });
  if (!existing) throw new Error("Referral not found");
  if (existing.companyId !== admin.companyId) {
    throw new Error("Not authorised to modify this referral");
  }


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

  // Tracks money that became newly owed in this transaction — used to
  // decide whether the partner needs the "add your bank details" nudge.
  let newlyPendingAmount = 0;

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

    const expected = expectedPayoutsForStatus(
      parsed.toStatus,
      existing.company,
    );
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
        newlyPendingAmount += Number(e.amount);
      } else if (current.status === "CANCELLED") {
        await tx.payout.update({
          where: { id: current.id },
          data: { status: "PENDING", amount: e.amount },
        });
        newlyPendingAmount += Number(e.amount);
      }
    }

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

  // BANK-DETAILS NUDGE: if this change put new money in the partner's
  // pending column and they have nowhere to receive it, tell them now —
  // while the win is fresh. Fire-and-forget; failures never block the
  // status update (which has already committed).
  if (newlyPendingAmount > 0) {
    try {
      const partner = await prisma.user.findUnique({
        where: { id: existing.partnerId },
        select: {
          email: true,
          fullName: true,
          bankSortCode: true,
          bankAccountNumber: true,
        },
      });
      if (partner && (!partner.bankSortCode || !partner.bankAccountNumber)) {
        const pendingAgg = await prisma.payout.aggregate({
          _sum: { amount: true },
          where: {
            status: "PENDING",
            referral: { partnerId: existing.partnerId },
          },
        });
        await sendBankDetailsNeededEmail(
          { email: partner.email, fullName: partner.fullName },
          existing.company,
          {
            justEarned: newlyPendingAmount,
            totalPending: Number(pendingAgg._sum.amount ?? 0),
          },
        );
      }
    } catch (err) {
      console.error("[updateReferralStatusAction] bank nudge failed:", err);
    }
  }

  revalidatePath(`/company/referrals/${existing.id}`);
  revalidatePath("/company/referrals");
  revalidatePath("/company/payouts");
  revalidatePath("/company");
}

/**
 * Toggle a referral's archived state. Archiving is reversible — sets
 * archivedAt to now() (hide from default lists) or back to null (restore).
 * No effect on status, payouts, or the audit trail; this is purely an
 * inbox-zero affordance for admins.
 */
export async function toggleArchiveReferralAction(formData: FormData) {
  const admin = await requireCompanyAdmin();
  await assertCompanyCanWriteById(admin.companyId);

  const referralId = String(formData.get("referralId") || "");
  if (!referralId) {
    throw new Error("Missing referral id.");
  }

  const referral = await prisma.referral.findUnique({
    where: { id: referralId },
    select: { id: true, companyId: true, archivedAt: true },
  });
  if (!referral || referral.companyId !== admin.companyId) {
    throw new Error("Not authorised to modify this referral.");
  }

  await prisma.referral.update({
    where: { id: referralId },
    data: { archivedAt: referral.archivedAt ? null : new Date() },
  });

  revalidatePath(`/company/referrals/${referralId}`);
  revalidatePath("/company/referrals");
  revalidatePath("/company");
}

/**
 * Permanently delete a referral and everything cascaded from it (payouts,
 * status events). BLOCKED if any payout is PAID — destroying a record of
 * money that actually changed hands wrecks the accounting trail. Archive
 * those instead.
 *
 * Redirects to the list afterwards; the detail page no longer exists.
 */
export async function deleteReferralAction(formData: FormData) {
  const admin = await requireCompanyAdmin();
  await assertCompanyCanWriteById(admin.companyId);

  const referralId = String(formData.get("referralId") || "");
  if (!referralId) {
    throw new Error("Missing referral id.");
  }

  const referral = await prisma.referral.findUnique({
    where: { id: referralId },
    select: {
      id: true,
      companyId: true,
      payouts: { select: { id: true, status: true } },
    },
  });
  if (!referral || referral.companyId !== admin.companyId) {
    throw new Error("Not authorised to modify this referral.");
  }

  const hasPaidPayouts = referral.payouts.some((p) => p.status === "PAID");
  if (hasPaidPayouts) {
    throw new Error(
      "Can't delete a referral that has paid payouts — archive it instead. " +
        "Deleting would destroy the accounting record of money already paid.",
    );
  }

  // Payouts and ReferralStatusEvents cascade-delete via the schema's
  // onDelete: Cascade. Single delete call handles everything.
  await prisma.referral.delete({ where: { id: referralId } });

  revalidatePath("/company/referrals");
  revalidatePath("/company/payouts");
  revalidatePath("/company");
  // Caller (the form) is on the detail page, so send them back to the list.
  redirect("/company/referrals?deleted=1");
}
