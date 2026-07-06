import Link from "next/link";
import { platform, formatPrice } from "@/lib/platform";
import { getSessionUser } from "@/lib/auth";
import { getCompanyBySlug } from "@/lib/company";
import { Logo } from "@/components/Logo";
import { CompanySignupForm } from "./CompanySignupForm";

export default async function CompanySignupPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  // Deliberately NO logged-in redirect here (unlike /login): with
  // multi-org accounts, an existing partner clicking "run your own
  // programme" from their dashboard is exactly who this page is for.
  // Entering their existing email + password attaches the new company
  // to their account.
  const user = await getSessionUser();

  // Resolve the optional ?ref=<slug> against a real company. If the slug
  // doesn't match anything, we silently ignore — links shouldn't break
  // signup for a typo / removed referrer.
  const sp = await searchParams;
  const refSlug = sp.ref?.trim().toLowerCase() || null;
  const referrer = refSlug ? await getCompanyBySlug(refSlug) : null;

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="bg-brand text-white px-8 py-12 flex flex-col justify-between">
        <Logo variant="light" size="md" />
        <div className="my-12">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">
            Run your own referral programme
          </h1>
          <p className="text-slate-300 mb-6">
            {platform.pricing.trialDays}-day free trial. No card needed today.
            After that, {formatPrice(platform.pricing.monthly)}/month. Cancel
            anytime.
          </p>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>✓ Branded landing page at /yourcompany</li>
            <li>✓ Unlimited referrers &amp; referrals</li>
            <li>✓ Custom payout amounts</li>
            <li>✓ Email notifications</li>
            <li>✓ SMS &amp; email templates for your partners</li>
          </ul>
        </div>
        <p className="text-sm text-slate-400">
          Already have an account?{" "}
          <Link href="/login" className="underline">
            Log in
          </Link>
          .
        </p>
      </div>

      <div className="px-6 py-10 sm:px-12 flex items-center">
        <div className="w-full max-w-md mx-auto">
          {referrer && (
            // Social proof banner — referred-in users see who sent them.
            // The hidden ref input below survives the form submit so the
            // server action knows to link them up.
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-900 mb-6">
              <p className="font-semibold">
                Referred by {referrer.name}
              </p>
              <p className="text-xs text-amber-800 mt-1">
                They think {platform.name} is worth recommending — and we
                give them 25% off their subscription for sending you our
                way.
              </p>
            </div>
          )}
          {user && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 mb-6">
              <p className="font-semibold">
                Adding a company to your account?
              </p>
              <p className="text-xs text-slate-600 mt-1">
                You&apos;re logged in as {user.email}. Use that email and
                your existing password below and the new company joins
                your account — switch between them from the menu, one
                login for everything.
              </p>
            </div>
          )}
          <h2 className="text-2xl font-bold text-brand mb-2">
            Start your free trial
          </h2>
          <p className="text-slate-600 mb-6 text-sm">
            Takes 30 seconds. No card required.
          </p>
          <CompanySignupForm
            referrerSlug={referrer ? referrer.slug : null}
          />
        </div>
      </div>
    </div>
  );
}
