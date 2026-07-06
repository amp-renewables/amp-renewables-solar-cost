// Stripe integration. Subscription billing for £99/mo Companies.
//
// Status model:
//   - TRIAL + trialEndsAt > now  → can write (free trial active)
//   - TRIAL + trialEndsAt <= now → cannot write (trial expired, no sub)
//   - ACTIVE                      → can write (paying)
//   - PAST_DUE                    → cannot write (payment failed, in dunning)
//   - CANCELLED                   → cannot write (sub ended)
//   - isComped = true             → ALWAYS can write (e.g. AMP Renewables)
//
// Trial is OUR concept (Company.trialEndsAt); Stripe trials are not used.
// When a user goes through Checkout, they start being billed immediately —
// upgrading mid-trial shortens the trial. Simpler, gets us paid sooner.

import "server-only";
import Stripe from "stripe";
import type { Company } from "@prisma/client";
import { platform } from "./platform";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID;

// Singleton, lazily initialised. Throws on use if STRIPE_SECRET_KEY is unset
// so we catch missing config at first use, not at import time (which would
// break local dev for anyone not running with Stripe).
let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  if (!STRIPE_SECRET_KEY) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it to .env / Vercel before using billing.",
    );
  }
  _stripe = new Stripe(STRIPE_SECRET_KEY, {
    // Pin the API version so silent breaking changes upstream don't bite us.
    // Bump deliberately (and re-test) when upgrading.
    apiVersion: "2026-04-22.dahlia",
    typescript: true,
    appInfo: {
      name: platform.name,
      url: platform.url,
    },
  });
  return _stripe;
}

export function stripeConfigured(): boolean {
  return Boolean(STRIPE_SECRET_KEY && STRIPE_PRICE_ID);
}

export function getPriceId(): string {
  if (!STRIPE_PRICE_ID) {
    throw new Error(
      "STRIPE_PRICE_ID is not set. Add it to .env / Vercel (looks like 'price_…').",
    );
  }
  return STRIPE_PRICE_ID;
}

// --- Authorisation helpers ----------------------------------------------

type WriteableCompany = Pick<
  Company,
  "status" | "isComped" | "trialEndsAt"
>;

export type WriteGate =
  | { canWrite: true }
  | {
      canWrite: false;
      reason: "TRIAL_EXPIRED" | "PAST_DUE" | "CANCELLED";
      message: string;
    };

export function companyWriteGate(company: WriteableCompany): WriteGate {
  // Comped accounts (e.g. AMP Renewables) bypass billing entirely.
  if (company.isComped) return { canWrite: true };

  // If Stripe isn't configured yet (local dev, missing keys), let everyone
  // through. There's no way to upgrade if billing isn't wired, so blocking
  // would just lock people out of their own data.
  if (!stripeConfigured()) return { canWrite: true };

  const now = new Date();

  if (company.status === "ACTIVE") return { canWrite: true };

  if (company.status === "TRIAL") {
    if (company.trialEndsAt && company.trialEndsAt > now) {
      return { canWrite: true };
    }
    return {
      canWrite: false,
      reason: "TRIAL_EXPIRED",
      message:
        "Your free trial has ended. Upgrade to continue adding partners, " +
        "logging referrals and managing payouts.",
    };
  }

  if (company.status === "PAST_DUE") {
    return {
      canWrite: false,
      reason: "PAST_DUE",
      message:
        "Your last payment failed. Update your card to restore full access.",
    };
  }

  if (company.status === "CANCELLED") {
    return {
      canWrite: false,
      reason: "CANCELLED",
      message:
        "Your subscription has ended. Resubscribe to start using TradeRefer again.",
    };
  }

  // Fallback — shouldn't be reachable given the enum, but fail closed.
  return {
    canWrite: false,
    reason: "CANCELLED",
    message: "This account isn't currently active.",
  };
}

export function canCompanyWrite(company: WriteableCompany): boolean {
  return companyWriteGate(company).canWrite;
}

/**
 * Throws if the company can't write. Use at the top of any server action
 * that modifies data. The thrown Error message is user-safe and rendered
 * by app/error.tsx.
 */
export function assertCompanyCanWrite(company: WriteableCompany): void {
  const gate = companyWriteGate(company);
  if (!gate.canWrite) {
    throw new Error(gate.message);
  }
}

/**
 * Convenience: look the company up by id and assert. Drop one line into a
 * server action right after requireCompanyAdmin() / requirePartner():
 *
 *   const admin = await requireCompanyAdmin();
 *   await assertCompanyCanWriteById(admin.companyId);
 *
 * The lookup is small (3 columns) and uncached because billing state can
 * flip mid-session via webhook.
 */
export async function assertCompanyCanWriteById(
  companyId: string,
): Promise<void> {
  // Imported lazily so the lib stays usable from edge / client contexts
  // that don't pull in Prisma.
  const { prisma } = await import("./db");
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { status: true, isComped: true, trialEndsAt: true },
  });
  if (!company) {
    throw new Error("Company not found.");
  }
  assertCompanyCanWrite(company);
}

// --- Display helpers ----------------------------------------------------

type BillingDisplayCompany = Pick<
  Company,
  "status" | "isComped" | "trialEndsAt" | "currentPeriodEnd"
>;

export type BillingDisplay = {
  label: string;
  detail: string | null;
  tone: "success" | "warning" | "danger" | "info";
  cta: "upgrade" | "manage" | "resubscribe" | "none";
};

export function billingDisplay(company: BillingDisplayCompany): BillingDisplay {
  if (company.isComped) {
    return {
      label: "Comped",
      detail: "This account is on the house — never billed.",
      tone: "success",
      cta: "none",
    };
  }

  const now = new Date();
  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  if (company.status === "TRIAL") {
    if (company.trialEndsAt && company.trialEndsAt > now) {
      const daysLeft = Math.max(
        0,
        Math.ceil(
          (company.trialEndsAt.getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      );
      return {
        label: "Free trial",
        detail: `${daysLeft} day${daysLeft === 1 ? "" : "s"} left — ends ${formatDate(company.trialEndsAt)}.`,
        tone: "info",
        cta: "upgrade",
      };
    }
    return {
      label: "Trial expired",
      detail: "Upgrade to restore access.",
      tone: "danger",
      cta: "upgrade",
    };
  }

  if (company.status === "ACTIVE") {
    return {
      label: "Active",
      detail: company.currentPeriodEnd
        ? `Next charge: ${formatDate(company.currentPeriodEnd)}.`
        : null,
      tone: "success",
      cta: "manage",
    };
  }

  if (company.status === "PAST_DUE") {
    return {
      label: "Payment failed",
      detail: "Update your card to restore access.",
      tone: "danger",
      cta: "manage",
    };
  }

  if (company.status === "CANCELLED") {
    return {
      label: "Cancelled",
      detail: "Resubscribe to start using TradeRefer again.",
      tone: "warning",
      cta: "resubscribe",
    };
  }

  return { label: company.status, detail: null, tone: "info", cta: "none" };
}
