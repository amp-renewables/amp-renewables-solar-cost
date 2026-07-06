// Internal referral programme — TradeRefer paying for itself.
//
// MECHANIC:
//   - Customer A signs up via `/signup?ref=<companyA-slug>` — we record
//     Company.referredByCompanyId so the link survives.
//   - Customer B (referred) eventually pays their first invoice → we
//     set their referralQualifiedAt and call recalcReferralDiscount()
//     for Customer A.
//   - Each qualifying referral A has gives them 25% off, up to 4 = 100%
//     (free). Refer 5+ acts as insurance against one churning.
//   - When a referral churns (subscription deleted), we recalc A's
//     discount — they drop a tier.
//
// IMPLEMENTATION:
//   - 4 percent-off coupons live in Stripe (created out-of-band; see
//     CLAUDE.md and below for the setup step).
//   - We use stripe.subscriptions.update({ discounts: [{ coupon }] })
//     to apply the right one, or stripe.subscriptions.deleteDiscount()
//     to clear when count drops to 0.
//   - This is idempotent — calling recalc twice in a row produces the
//     same Stripe state, so we don't have to dedupe webhook events.
//
// THE 4 STRIPE COUPONS (create these manually in Stripe live mode):
//   - TR_REFERRAL_25PCT   25%  forever
//   - TR_REFERRAL_50PCT   50%  forever
//   - TR_REFERRAL_75PCT   75%  forever
//   - TR_REFERRAL_100PCT  100% forever
// All with metadata.programme=internal_referral so we can find them
// again if we ever need to rotate.
//
// SKIPS:
//   - Comped companies (isComped=true, e.g. AMP) — they're already
//     free; nothing to discount.
//   - Companies with no stripeSubscriptionId — they haven't started
//     billing yet; nothing to update. (When they do, the next webhook
//     event will trigger another recalc.)

import "server-only";
import { prisma } from "./db";
import { getStripe } from "./stripe";
import { platform } from "./platform";
import {
  sendReferralQualifiedEmail,
  sendReferralChurnedEmail,
} from "./email";

/** Per-tier coupon IDs in Stripe live mode. Must match what's created
 *  in the Stripe dashboard. */
const COUPON_BY_TIER: Record<number, string | null> = {
  0: null, // no qualifying referrals — discount is removed
  1: "TR_REFERRAL_25PCT",
  2: "TR_REFERRAL_50PCT",
  3: "TR_REFERRAL_75PCT",
  4: "TR_REFERRAL_100PCT",
};

const MAX_TIER = 4;
const PCT_PER_REFERRAL = 25;

export type ReferralStanding = {
  /** How many referred companies have paid at least once and not churned. */
  qualifyingCount: number;
  /** Capped at MAX_TIER. */
  tier: number;
  /** Percentage discount currently earned (0–100). */
  percentOff: number;
  /** Stripe coupon ID that should be on the subscription, if any. */
  expectedCouponId: string | null;
};

/**
 * Compute (but don't apply) the referrer's current standing. Used by UI
 * surfaces that want to display "you have N referrals, X% off" without
 * touching Stripe.
 */
export async function getReferralStanding(
  referrerCompanyId: string,
): Promise<ReferralStanding> {
  const qualifyingCount = await prisma.company.count({
    where: {
      referredByCompanyId: referrerCompanyId,
      referralQualifiedAt: { not: null },
      // CANCELLED means they've left and aren't paying — drop from the
      // count. TRIAL/ACTIVE/PAST_DUE all still count (PAST_DUE is in
      // dunning but Stripe will retry; we don't yank the discount until
      // they actually cancel).
      status: { in: ["TRIAL", "ACTIVE", "PAST_DUE"] },
    },
  });

  const tier = Math.min(qualifyingCount, MAX_TIER);
  const percentOff = tier * PCT_PER_REFERRAL;
  const expectedCouponId = COUPON_BY_TIER[tier] ?? null;

  return { qualifyingCount, tier, percentOff, expectedCouponId };
}

/**
 * Recompute the referrer's discount and reconcile Stripe so the right
 * coupon is on their subscription. Idempotent — safe to call from
 * multiple webhook handlers and the optional cron.
 *
 * If `notifyEvent` is supplied, an appropriate transactional email
 * fires after the Stripe update: 'qualified' when a new referral
 * activated the discount slice, 'churned' when a referral cancelled.
 * Cron / safety-net callers can omit it to recompute silently.
 *
 * Returns the final standing for logging / audit purposes.
 */
export async function recalcReferralDiscount(
  referrerCompanyId: string,
  notifyEvent?: {
    kind: "qualified" | "churned";
    referredCompanyName: string;
  },
): Promise<ReferralStanding | null> {
  const referrer = await prisma.company.findUnique({
    where: { id: referrerCompanyId },
    select: {
      id: true,
      slug: true,
      name: true,
      contactEmail: true,
      currencySymbol: true,
      stripeSubscriptionId: true,
      isComped: true,
    },
  });

  if (!referrer) {
    console.warn(
      `[referral] recalc called for missing company ${referrerCompanyId}`,
    );
    return null;
  }

  if (referrer.isComped) {
    // Comped companies are already free — nothing to discount. We could
    // later credit them in cash, but that's a separate decision.
    return null;
  }

  if (!referrer.stripeSubscriptionId) {
    // Hasn't paid yet (still in pre-Checkout trial). Their next
    // webhook (checkout.session.completed or invoice.payment_succeeded)
    // will trigger another recalc which will pick up the right state.
    return null;
  }

  const standing = await getReferralStanding(referrerCompanyId);

  // Apply the right Stripe discount (or remove it entirely).
  const stripe = getStripe();
  try {
    if (standing.expectedCouponId) {
      await stripe.subscriptions.update(referrer.stripeSubscriptionId, {
        discounts: [{ coupon: standing.expectedCouponId }],
      });
    } else {
      // Tier 0 — remove any existing discount. Stripe throws if there
      // isn't one to remove; catch and ignore that specific case.
      try {
        await stripe.subscriptions.deleteDiscount(
          referrer.stripeSubscriptionId,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (!message.includes("has no discount")) {
          throw err;
        }
      }
    }
  } catch (err) {
    console.error(
      `[referral] Stripe update failed for ${referrer.slug}:`,
      err,
    );
    // Don't rethrow — webhook handlers shouldn't 500 just because the
    // discount apply failed. The nightly safety-net cron (if added)
    // will retry.
    return standing;
  }

  console.log(
    `[referral] ${referrer.slug}: ${standing.qualifyingCount} qualifying → tier ${standing.tier} (${standing.percentOff}%) → coupon ${standing.expectedCouponId ?? "(none)"}`,
  );

  // Fire transactional email if the caller asked us to. Email failures
  // never throw — same fire-and-forget principle as the other notifs.
  if (notifyEvent) {
    try {
      if (notifyEvent.kind === "qualified") {
        await sendReferralQualifiedEmail(
          { contactEmail: referrer.contactEmail, name: referrer.name },
          notifyEvent.referredCompanyName,
          standing.percentOff,
          platform.pricing.monthly,
          referrer.currencySymbol,
        );
      } else {
        await sendReferralChurnedEmail(
          { contactEmail: referrer.contactEmail, name: referrer.name },
          notifyEvent.referredCompanyName,
          standing.percentOff,
          platform.pricing.monthly,
          referrer.currencySymbol,
        );
      }
    } catch (err) {
      console.error("[referral] notify email failed:", err);
    }
  }

  return standing;
}
