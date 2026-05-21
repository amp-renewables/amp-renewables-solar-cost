import { requireCompanyAdmin } from "@/lib/auth";
import { getCurrentCompany } from "@/lib/company";
import { platform, formatPrice } from "@/lib/platform";
import { billingDisplay, stripeConfigured } from "@/lib/stripe";
import {
  openBillingPortalAction,
  startCheckoutAction,
} from "./actions";

const TONE_CLASSES: Record<string, string> = {
  success: "bg-emerald-50 border-emerald-200 text-emerald-900",
  warning: "bg-amber-50 border-amber-200 text-amber-900",
  danger: "bg-rose-50 border-rose-200 text-rose-900",
  info: "bg-sky-50 border-sky-200 text-sky-900",
};

const BADGE_CLASSES: Record<string, string> = {
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-rose-100 text-rose-800",
  info: "bg-sky-100 text-sky-800",
};

export default async function CompanyBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; cancelled?: string }>;
}) {
  await requireCompanyAdmin();
  const company = await getCurrentCompany();
  if (!company) return null;
  const sp = await searchParams;
  const justUpgraded = sp.success === "1";
  const checkoutCancelled = sp.cancelled === "1";

  const display = billingDisplay(company);
  const configured = stripeConfigured();

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1
          className="text-2xl font-bold text-brand"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          Billing
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Manage your {platform.name} subscription —
          {formatPrice(platform.pricing.monthly)}/month after the{" "}
          {platform.pricing.trialDays}-day free trial.
        </p>
      </div>

      {justUpgraded && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl px-5 py-4">
          <p className="font-semibold">You're subscribed. Thank you!</p>
          <p className="text-sm mt-1">
            We've emailed you a receipt. You can update your card or cancel any
            time from this page.
          </p>
        </div>
      )}

      {checkoutCancelled && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-5 py-3 text-sm">
          Checkout cancelled — no payment taken. Pick it up again whenever
          you're ready.
        </div>
      )}

      <section
        className={`border rounded-xl p-6 ${TONE_CLASSES[display.tone]}`}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <span
              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${BADGE_CLASSES[display.tone]}`}
            >
              {display.label}
            </span>
            {display.detail && (
              <p className="text-sm mt-2 opacity-90">{display.detail}</p>
            )}
          </div>

          {!configured ? (
            <p className="text-xs opacity-75">
              Billing isn't configured yet. The platform owner needs to add
              Stripe keys.
            </p>
          ) : (
            <BillingActionButton cta={display.cta} />
          )}
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-brand">What you're paying for</h2>
        <ul className="text-sm text-slate-700 grid sm:grid-cols-2 gap-x-6 gap-y-2">
          <li>✓ Unlimited partners</li>
          <li>✓ Unlimited referrals</li>
          <li>✓ Branded landing page at /{company.slug}</li>
          <li>✓ Automated payout tracking</li>
          <li>✓ SMS &amp; email templates</li>
          <li>✓ Up to 4 admin team members</li>
        </ul>
        <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
          Cancel any time from the billing portal — your account stays
          read-only after the current period ends.
        </p>
      </section>

      <p className="text-xs text-slate-500">
        Questions about billing? Email{" "}
        <a
          href={`mailto:${platform.supportEmail}`}
          className="text-brand underline"
        >
          {platform.supportEmail}
        </a>
        .
      </p>
    </div>
  );
}

function BillingActionButton({ cta }: { cta: "upgrade" | "manage" | "resubscribe" | "none" }) {
  if (cta === "none") return null;

  const action =
    cta === "manage" ? openBillingPortalAction : startCheckoutAction;
  const label =
    cta === "manage"
      ? "Manage subscription"
      : cta === "resubscribe"
        ? "Resubscribe"
        : "Upgrade now";

  return (
    <form action={action}>
      <button
        type="submit"
        className="bg-brand text-white font-semibold px-5 py-2.5 rounded-lg hover:opacity-90 cursor-pointer whitespace-nowrap"
      >
        {label} →
      </button>
    </form>
  );
}
