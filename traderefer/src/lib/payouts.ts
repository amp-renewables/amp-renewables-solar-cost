// Pure functions for payout calculation, derived from referral state.
// Payout amounts come from the Company row (each tenant sets their own).

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
// the existing rows so reruns don't double-pay.
export function expectedPayoutsForStatus(
  status: Referral["status"],
  company: Pick<Company, "payoutAppointment" | "payoutJob">,
): { type: "APPOINTMENT" | "JOB"; amount: number }[] {
  const out: { type: "APPOINTMENT" | "JOB"; amount: number }[] = [];
  if (
    status === "APPOINTMENT_BOOKED" ||
    status === "APPOINTMENT_COMPLETED" ||
    status === "JOB_SOLD" ||
    status === "JOB_INSTALLED"
  ) {
    out.push({
      type: "APPOINTMENT",
      amount: Number(company.payoutAppointment),
    });
  }
  if (status === "JOB_SOLD" || status === "JOB_INSTALLED") {
    out.push({ type: "JOB", amount: Number(company.payoutJob) });
  }
  return out;
}
