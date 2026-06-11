// Pure functions for payout calculation, derived from referral state.
// Payout amounts come from the Company row (each tenant sets their own).
// One rate for every referrer type — businesses and ambassadors earn
// the same, because the referral is worth the same to the company.

import type { Company, Payout, Referral } from "@prisma/client";

export type PayoutSummary = {
  pendingTotal: number;
  paidTotal: number;
  earnedTotal: number;
  pendingCount: number;
  paidCount: number;
};

export function summarisePayouts(payouts: Payout[]): PayoutSummary {
  let pending = 0;
  let paid = 0;
  let pendingCount = 0;
  let paidCount = 0;
  for (const p of payouts) {
    const amt = Number(p.amount);
    if (p.status === "PAID") {
      paid += amt;
      paidCount += 1;
    } else if (p.status === "PENDING") {
      pending += amt;
      pendingCount += 1;
    }
  }
  return {
    pendingTotal: pending,
    paidTotal: paid,
    earnedTotal: pending + paid,
    pendingCount,
    paidCount,
  };
}

// Given a referral's new status and the owning company's payout rules,
// return the FULL set of payouts that should exist. Callers diff against
// the existing rows so reruns don't double-pay. A zero rate means the
// company doesn't pay for that milestone (e.g. sold-jobs-only deals) —
// no payout row is created, so partners never see a £0 line and the
// bank-details nudge never fires for nothing.
export function expectedPayoutsForStatus(
  status: Referral["status"],
  company: Pick<Company, "payoutAppointment" | "payoutJob">,
): { type: "APPOINTMENT" | "JOB"; amount: number }[] {
  const out: { type: "APPOINTMENT" | "JOB"; amount: number }[] = [];
  const appointment = Number(company.payoutAppointment);
  const job = Number(company.payoutJob);
  if (
    appointment > 0 &&
    (status === "APPOINTMENT_BOOKED" ||
      status === "APPOINTMENT_COMPLETED" ||
      status === "JOB_SOLD" ||
      status === "JOB_INSTALLED")
  ) {
    out.push({ type: "APPOINTMENT", amount: appointment });
  }
  if (job > 0 && (status === "JOB_SOLD" || status === "JOB_INSTALLED")) {
    out.push({ type: "JOB", amount: job });
  }
  return out;
}
