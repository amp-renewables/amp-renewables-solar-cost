import type { ReferralStatus } from "@prisma/client";

export const STATUS_LABELS: Record<ReferralStatus, string> = {
  SUBMITTED: "Submitted",
  CONTACTED: "Contacted",
  APPOINTMENT_BOOKED: "Appointment booked",
  APPOINTMENT_COMPLETED: "Appointment completed",
  JOB_SOLD: "Job sold",
  JOB_INSTALLED: "Job installed",
  REJECTED: "Rejected",
};

export const STATUS_COLORS: Record<ReferralStatus, string> = {
  SUBMITTED: "bg-slate-100 text-slate-700",
  CONTACTED: "bg-blue-100 text-blue-800",
  APPOINTMENT_BOOKED: "bg-amber-100 text-amber-800",
  APPOINTMENT_COMPLETED: "bg-amber-100 text-amber-800",
  JOB_SOLD: "bg-emerald-100 text-emerald-800",
  JOB_INSTALLED: "bg-emerald-200 text-emerald-900",
  REJECTED: "bg-rose-100 text-rose-800",
};

export const ALL_STATUSES: ReferralStatus[] = [
  "SUBMITTED",
  "CONTACTED",
  "APPOINTMENT_BOOKED",
  "APPOINTMENT_COMPLETED",
  "JOB_SOLD",
  "JOB_INSTALLED",
  "REJECTED",
];
