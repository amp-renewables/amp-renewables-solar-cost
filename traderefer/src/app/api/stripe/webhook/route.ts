// Stripe webhook handler. THIS IS THE SOURCE OF TRUTH for Company.status
// changes driven by billing events. The /company/billing UI never flips
// status itself — Checkout redirects the user back with ?success=1, and
// the webhook (which Stripe always fires) does the actual DB update.
//
// Events handled:
//   - checkout.session.completed     → TRIAL → ACTIVE on first subscription
//   - customer.subscription.updated  → keep status + currentPeriodEnd fresh
//   - customer.subscription.deleted  → ACTIVE → CANCELLED
//   - invoice.payment_failed         → ACTIVE → PAST_DUE (after retries exhausted)
//   - invoice.payment_succeeded      → PAST_DUE → ACTIVE
//
// Idempotency: Stripe can resend events. All our handlers are write-the-same-
// value-on-replay operations, so we don't dedupe explicitly. If we ever do
// non-idempotent work here, add a StripeEvent table to record processed IDs.

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import type { CompanyStatus } from "@prisma/client";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Next.js needs the raw body for signature verification. The default
// request.json() / formData() would re-encode and break the HMAC. Reading
// request.text() preserves it byte-for-byte.
export async function POST(request: Request) {
  if (!WEBHOOK_SECRET) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET is not set");
    return new NextResponse("Webhook secret not configured", { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new NextResponse("Missing stripe-signature header", { status: 400 });
  }

  const rawBody = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe-webhook] signature verification failed:", err);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.updated":
      case "customer.subscription.created":
        await handleSubscriptionUpsert(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "invoice.payment_failed":
        await handleInvoiceFailed(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_succeeded":
        await handleInvoiceSucceeded(event.data.object as Stripe.Invoice);
        break;

      default:
        // Unhandled event types are fine — Stripe sends a lot we don't care about.
        // Log at info level so we can spot any we should add.
        console.log(`[stripe-webhook] ignoring event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`[stripe-webhook] handler failed for ${event.type}:`, err);
    // Return 500 so Stripe retries — but ONLY if this is a transient error.
    // If we return 200, Stripe stops retrying even if we didn't actually
    // process the event. Trade-off here is in Stripe's favour (retries are
    // idempotent given our handlers).
    return new NextResponse("Handler failed", { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// --- Handlers -----------------------------------------------------------

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const companyId = session.client_reference_id;
  if (!companyId) {
    console.error("[stripe-webhook] checkout.session.completed with no client_reference_id");
    return;
  }

  // The session itself doesn't always carry the subscription details we need
  // (period end). Fetch the subscription to get them fresh.
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;
  if (!subscriptionId) {
    console.error("[stripe-webhook] checkout.session.completed with no subscription");
    return;
  }

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  await prisma.company.update({
    where: { id: companyId },
    data: {
      stripeSubscriptionId: subscription.id,
      stripeCustomerId:
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id,
      status: mapStripeStatus(subscription.status),
      currentPeriodEnd: subscriptionPeriodEnd(subscription),
    },
  });
  console.log(`[stripe-webhook] company ${companyId} → ACTIVE via checkout`);
}

async function handleSubscriptionUpsert(subscription: Stripe.Subscription) {
  const company = await companyFromSubscription(subscription);
  if (!company) return;

  await prisma.company.update({
    where: { id: company.id },
    data: {
      stripeSubscriptionId: subscription.id,
      status: mapStripeStatus(subscription.status),
      currentPeriodEnd: subscriptionPeriodEnd(subscription),
    },
  });
  console.log(
    `[stripe-webhook] company ${company.id} → ${mapStripeStatus(subscription.status)} via sub update`,
  );
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const company = await companyFromSubscription(subscription);
  if (!company) return;

  await prisma.company.update({
    where: { id: company.id },
    data: {
      status: "CANCELLED",
      // Keep stripeSubscriptionId so we can show "previous subscription" UI
      // and let them resubscribe via the same customer record.
    },
  });
  console.log(`[stripe-webhook] company ${company.id} → CANCELLED`);
}

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  const subscriptionId =
    typeof (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription }).subscription === "string"
      ? ((invoice as Stripe.Invoice & { subscription?: string }).subscription as string)
      : (invoice as Stripe.Invoice & { subscription?: Stripe.Subscription }).subscription?.id;
  if (!subscriptionId) return;

  const company = await prisma.company.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
    select: { id: true },
  });
  if (!company) return;

  await prisma.company.update({
    where: { id: company.id },
    data: { status: "PAST_DUE" },
  });
  console.log(`[stripe-webhook] company ${company.id} → PAST_DUE (invoice failed)`);
}

async function handleInvoiceSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId =
    typeof (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription }).subscription === "string"
      ? ((invoice as Stripe.Invoice & { subscription?: string }).subscription as string)
      : (invoice as Stripe.Invoice & { subscription?: Stripe.Subscription }).subscription?.id;
  if (!subscriptionId) return;

  const company = await prisma.company.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
    select: { id: true, status: true },
  });
  if (!company) return;

  // Only flip status if recovering from PAST_DUE — otherwise let the
  // subscription.updated handler manage normal transitions.
  if (company.status === "PAST_DUE") {
    await prisma.company.update({
      where: { id: company.id },
      data: { status: "ACTIVE" },
    });
    console.log(`[stripe-webhook] company ${company.id} → ACTIVE (invoice paid)`);
  }
}

// --- Helpers ------------------------------------------------------------

async function companyFromSubscription(
  subscription: Stripe.Subscription,
): Promise<{ id: string } | null> {
  // Prefer metadata.companyId (set when we create the Checkout session) —
  // most reliable across Stripe's internal data refreshes.
  const metaCompanyId = subscription.metadata?.companyId;
  if (metaCompanyId) {
    const c = await prisma.company.findUnique({
      where: { id: metaCompanyId },
      select: { id: true },
    });
    if (c) return c;
  }

  // Fall back to looking up by customer ID or subscription ID.
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  let company = await prisma.company.findFirst({
    where: { stripeSubscriptionId: subscription.id },
    select: { id: true },
  });
  if (company) return company;

  company = await prisma.company.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  if (company) return company;

  console.error(
    `[stripe-webhook] couldn't find Company for subscription ${subscription.id}`,
  );
  return null;
}

function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): CompanyStatus {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "ACTIVE";
    case "past_due":
    case "unpaid":
      return "PAST_DUE";
    case "canceled":
    case "incomplete_expired":
      return "CANCELLED";
    case "incomplete":
    case "paused":
    default:
      // Conservative: treat unknown / pending states as ACTIVE so we don't
      // accidentally lock paying customers out during odd transitions.
      return "ACTIVE";
  }
}

function subscriptionPeriodEnd(subscription: Stripe.Subscription): Date | null {
  // Stripe's subscription type has `current_period_end` as a unix timestamp (seconds).
  // It's been moved around in different API versions; we read it defensively.
  const raw = (subscription as Stripe.Subscription & {
    current_period_end?: number;
  }).current_period_end;
  if (typeof raw === "number") {
    return new Date(raw * 1000);
  }
  return null;
}
