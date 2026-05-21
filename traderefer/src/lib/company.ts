// Helpers for working with the Company tenant model.
// Per-company branding (logo, colours, payouts, services) lives in DB rows;
// the helpers below load and shape that data for use in views/emails.

import "server-only";
import { cache } from "react";
import type { Company } from "@prisma/client";
import { prisma } from "./db";
import { getSessionUser } from "./auth";

export async function getCompanyBySlug(
  slug: string,
): Promise<Company | null> {
  return prisma.company.findUnique({ where: { slug } });
}

export async function getCompanyById(id: string): Promise<Company | null> {
  return prisma.company.findUnique({ where: { id } });
}

// Per-request cached lookup of the logged-in user's company.
// Returns null for SUPERADMIN (no company) or unauthenticated requests.
export const getCurrentCompany = cache(async (): Promise<Company | null> => {
  const user = await getSessionUser();
  if (!user?.companyId) return null;
  return prisma.company.findUnique({ where: { id: user.companyId } });
});

export function formatCompanyMoney(
  company: Pick<Company, "currencySymbol">,
  amount: number | string,
): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return `${company.currencySymbol}${n.toLocaleString("en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function payoutsForCompany(
  company: Pick<Company, "payoutAppointment" | "payoutJob">,
) {
  const appt = Number(company.payoutAppointment);
  const job = Number(company.payoutJob);
  return { appointment: appt, job, total: appt + job };
}

// Generate a URL-safe slug from a free-text name. Used during company signup.
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// Try increasing numeric suffixes until we find a free slug.
export async function findAvailableSlug(base: string): Promise<string> {
  const root = slugify(base) || "company";
  let candidate = root;
  let n = 2;
  // Capped at 50 attempts to avoid runaway loops if something goes wrong.
  for (let i = 0; i < 50; i++) {
    const existing = await prisma.company.findUnique({
      where: { slug: candidate },
    });
    if (!existing) return candidate;
    candidate = `${root}-${n++}`;
  }
  // Extreme fallback — append a short random suffix.
  return `${root}-${Math.random().toString(36).slice(2, 7)}`;
}
