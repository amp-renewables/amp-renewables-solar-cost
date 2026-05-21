"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth";
import { getStripe, getPriceId, stripeConfigured } from "@/lib/stripe";
import { platform } from "@/lib/platform";

/**
 * Kick the user into Stripe Checkout to start (or restart) a subscription.
 *
 * Reuses an existing Stripe customer if we already have one on the Company
 * row — important so that re-subscribers don't end up with duplicate
 * customers in Stripe. Creates one inline otherwise.
 */
export async function startCheckoutAction(): Promise<void> {
  const admin = await requireCompanyAdmin();

  if (!stripeConfigured()) {
    throw new Error(
      "Billing isn't configured for this deployment yet. Try again shortly.",
    );
  }

  const company = await prisma.company.findUnique({
    where: { id: admin.companyId },
    select: {
      id: true,
      name: true,
      slug: true,
      contactEmail: true,
      isComped: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      status: true,
    },
  });
  if (!company) {
    throw new Error("Company not found.");
  }
  if (company.isComped) {
    // Belt and braces — UI shouldn't expose Checkout for comped companies.
    throw new Error("This account is comped and doesn't need to subscribe.");
  }
  if (company.stripeSubscriptionId && company.status === "ACTIVE") {
    // Already subscribed — send them to the portal instead of double-charging.
    redirect("/company/billing");
  }

  const stripe = getStripe();
  const baseUrl = platform.url;
  const successUrl = `${baseUrl}/company/billing?success=1`;
  const cancelUrl = `${baseUrl}/company/billing?cancelled=1`;

  // Create the Stripe Customer up-front if we don't already have one. Doing
  // it here (vs at signup time) means we only create customers for companies
  // that actually try to pay — keeps the Stripe customer list tidy.
  let customerId = company.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: company.contactEmail,
      name: company.name,
      metadata: {
        companyId: company.id,
        companySlug: company.slug,
      },
    });
    customerId = customer.id;
    await prisma.company.update({
      where: { id: company.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: getPriceId(), quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    // Persist the company ID on the session and downstream subscription so
    // the webhook can look up the company from any future event.
    client_reference_id: company.id,
    subscription_data: {
      metadata: {
        companyId: company.id,
        companySlug: company.slug,
      },
    },
    // UK customers — allow promotion codes if we ever want to run discounts.
    allow_promotion_codes: true,
    // Don't double-prompt for VAT — we're VAT-inclusive for v1.
    automatic_tax: { enabled: false },
  });

  if (!session.url) {
    throw new Error("Stripe didn't return a Checkout URL. Try again.");
  }
  redirect(session.url);
}

/**
 * Open the Stripe-hosted Customer Portal so a paying customer can update
 * their card, change billing email, view invoices, or cancel.
 */
export async function openBillingPortalAction(): Promise<void> {
  const admin = await requireCompanyAdmin();

  if (!stripeConfigured()) {
    throw new Error("Billing isn't configured for this deployment yet.");
  }

  const company = await prisma.company.findUnique({
    where: { id: admin.companyId },
    select: { stripeCustomerId: true },
  });
  if (!company?.stripeCustomerId) {
    throw new Error(
      "No Stripe customer on this account yet. Start a subscription first.",
    );
  }

  const stripe = getStripe();
  const portal = await stripe.billingPortal.sessions.create({
    customer: company.stripeCustomerId,
    return_url: `${platform.url}/company/billing`,
  });

  redirect(portal.url);
}
