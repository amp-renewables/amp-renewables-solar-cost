// Pure functions for payout calculation, derived from referral state.
// Keeping this in one place makes it trivial to tweak the rules per-licensee
// or A/B test new payout structures.

import type { Payout, Referral } from "@prisma/client";
import { brand } from "./brand";

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

// Given a referral's new status, decide which payouts should now exist.
// Idempotent: returns the FULL desired set so callers can diff against
// existing rows and avoid double-paying.
export function expectedPayoutsForStatus(
  status: Referral["status"],
): { type: "APPOINTMENT" | "JOB"; amount: number }[] {
  const out: { type: "APPOINTMENT" | "JOB"; amount: number }[] = [];
  if (
    status === "APPOINTMENT_BOOKED" ||
    status === "APPOINTMENT_COMPLETED" ||
    status === "JOB_SOLD" ||
    status === "JOB_INSTALLED"
  ) {
    out.push({ type: "APPOINTMENT", amount: brand.payouts.perAppointment });
  }
  if (status === "JOB_SOLD" || status === "JOB_INSTALLED") {
    out.push({ type: "JOB", amount: brand.payouts.perJob });
  }
  return out;
}
