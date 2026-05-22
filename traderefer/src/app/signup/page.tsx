import Link from "next/link";
import { redirect } from "next/navigation";
import { platform, formatPrice } from "@/lib/platform";
import { getSessionUser, landingPathForRole } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { CompanySignupForm } from "./CompanySignupForm";

export default async function CompanySignupPage() {
  const user = await getSessionUser();
  if (user) redirect(landingPathForRole(user.role));

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="bg-brand text-white px-8 py-12 flex flex-col justify-between">
        <Logo variant="light" size="md" />
        <div className="my-12">
          <h1
            className="text-3xl sm:text-4xl font-bold mb-4 leading-tight"
          >
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
          <h2 className="text-2xl font-bold text-brand mb-2">
            Start your free trial
          </h2>
          <p className="text-slate-600 mb-6 text-sm">
            Takes 30 seconds. No card required.
          </p>
          <CompanySignupForm />
        </div>
      </div>
    </div>
  );
}
