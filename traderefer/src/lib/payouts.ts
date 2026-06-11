// Pure functions for payout calculation, derived from referral state.
// Payout amounts come from the Company row (each tenant sets their own),
// with separate rates depending on whether the referrer is a
// BUSINESS_PARTNER or an AMBASSADOR.

import type { Company, MembershipRole, Payout, Referral } from "@prisma/client";

export type PayoutRateCompany = Pick<
  Company,
  | "payoutAppointment"
  | "payoutJob"
  | "ambassadorPayoutAppointment"
  | "ambassadorPayoutJob"
>;

// The per-referral rates that apply to a given referrer role at a given
// company. COMPANY_ADMINs don't earn payouts but get business rates if
// ever asked (e.g. an admin testing the refer form on themselves).
export function ratesForRole(
  company: PayoutRateCompany,
  role: MembershipRole,
): { appointment: number; job: number; total: number } {
  const appointment = Number(
    role === "AMBASSADOR"
      ? company.ambassadorPayoutAppointment
      : company.payoutAppointment,
  );
  const job = Number(
    role === "AMBASSADOR" ? company.ambassadorPayoutJob : company.payoutJob,
  );
  return { appointment, job, total: appointment + job };
}

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

// Given a referral's new status, the owning company's payout rules and
// the referrer's role at that company, return the FULL set of payouts
// that should exist. Callers diff against the existing rows so reruns
// don't double-pay.
export function expectedPayoutsForStatus(
  status: Referral["status"],
  company: PayoutRateCompany,
  referrerRole: MembershipRole = "BUSINESS_PARTNER",
): { type: "APPOINTMENT" | "JOB"; amount: number }[] {
  const rates = ratesForRole(company, referrerRole);
  const out: { type: "APPOINTMENT" | "JOB"; amount: number }[] = [];
  if (
    status === "APPOINTMENT_BOOKED" ||
    status === "APPOINTMENT_COMPLETED" ||
    status === "JOB_SOLD" ||
    status === "JOB_INSTALLED"
  ) {
    out.push({ type: "APPOINTMENT", amount: rates.appointment });
  }
  if (status === "JOB_SOLD" || status === "JOB_INSTALLED") {
    out.push({ type: "JOB", amount: rates.job });
  }
  return out;
}
