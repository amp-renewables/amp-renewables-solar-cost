import Link from "next/link";
import { redirect } from "next/navigation";
import { platform, formatPrice } from "@/lib/platform";
import { getSessionUser, landingPathForRole } from "@/lib/auth";
import { Logo } from "@/components/Logo";

export default async function HomePage() {
  const user = await getSessionUser();
  if (user) redirect(landingPathForRole(user.role));

  return (
    <div className="min-h-screen">
      <header className="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <Logo variant="dark" size="md" />
        <nav className="flex items-center gap-3 text-sm">
          <Link
            href="/login"
            className="px-4 py-2 text-slate-700 hover:underline"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="px-4 py-2 rounded-lg btn-primary font-medium"
          >
            Start free trial
          </Link>
        </nav>
      </header>

      <section className="bg-brand text-white">
        <div className="max-w-4xl mx-auto px-6 py-20 sm:py-28 text-center">
          <span className="inline-block bg-brand-accent text-brand px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
            For tradesmen &amp; installers
          </span>
          <h1 className="text-5xl sm:text-7xl font-extrabold leading-[1.02] mb-6 tracking-tight">
            Weaponise Your Contacts.
          </h1>
          <p className="text-xl sm:text-2xl text-white font-semibold max-w-2xl mx-auto mb-6 leading-snug">
            Turn your contacts and customers into a referral engine for your
            business.
          </p>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-10">
            Let local tradesmen and former customers send you customers — and
            pay them a referral fee. {platform.name} gives you a branded
            sign-up page, partner dashboards, payout tracking and ready-made
            customer messages.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="bg-brand-accent text-brand font-semibold px-6 py-3 rounded-lg w-full sm:w-auto"
            >
              Start your {platform.pricing.trialDays}-day free trial →
            </Link>
            <Link
              href="/amprenewables"
              className="border border-slate-500 text-slate-300 px-6 py-3 rounded-lg w-full sm:w-auto hover:bg-white/5"
            >
              See an example
            </Link>
          </div>
          <p className="text-sm text-slate-400 mt-6">
            {formatPrice(platform.pricing.monthly)} / month after trial. Cancel
            anytime.
          </p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2
          className="text-3xl sm:text-4xl font-bold text-brand text-center mb-4"
        >
          How it works
        </h2>
        <p className="text-center text-slate-600 max-w-2xl mx-auto mb-14">
          Built for solar installers, roofers, plumbers, electricians, heat-pump
          fitters — anyone who relies on word-of-mouth and wants to systemise
          it.
        </p>
        <div className="grid sm:grid-cols-3 gap-8">
          <Step
            n={1}
            title="Sign up &amp; brand it"
            body="30-second signup. Upload your logo, set your colours, decide what you pay per appointment and per job sold. You get a branded landing page at /yourcompany."
          />
          <Step
            n={2}
            title="Invite local tradesmen"
            body="Send them your landing page link. They sign up in seconds and can start sending you customers — name, phone, address, services they want."
          />
          <Step
            n={3}
            title="Track &amp; pay out"
            body="See every referral, update statuses, and payouts are tracked automatically. Partners get a dashboard showing exactly what you owe them. Mark as paid when you've sent the money."
          />
        </div>
      </section>

      <section className="bg-white border-y border-slate-200 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2
            className="text-3xl font-bold text-brand text-center mb-12"
          >
            Everything you need, nothing you don&apos;t
          </h2>
          <div className="grid sm:grid-cols-2 gap-x-12 gap-y-6 max-w-3xl mx-auto">
            <Feature title="Branded landing page" body="Your logo, your colours, your URL — partners sign up under your name." />
            <Feature title="Custom payouts" body="Set your own rates — £50 / £250, or whatever works for your margins." />
            <Feature title="Referral tracking" body="Every lead from submission to install, with full status history." />
            <Feature title="Automatic payout maths" body="When you mark a job sold, the right payout appears for the partner." />
            <Feature title="Pre-written messages" body="SMS &amp; email templates partners can copy to send to their customers." />
            <Feature title="Email notifications" body="Get notified instantly when a new referral comes in." />
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2
          className="text-3xl font-bold text-brand mb-4"
        >
          Simple pricing
        </h2>
        <div className="bg-white border border-slate-200 rounded-2xl p-10 mt-8 shadow-sm">
          <div
            className="text-6xl font-bold text-brand mb-2"
          >
            {formatPrice(platform.pricing.monthly)}
            <span className="text-2xl text-slate-400 font-normal">/month</span>
          </div>
          <p className="text-slate-600 mb-6">
            One simple price. Everything included. Cancel anytime.
          </p>
          <ul className="text-left max-w-sm mx-auto space-y-2 text-slate-700 mb-8">
            <li>✓ Unlimited referrers</li>
            <li>✓ Unlimited referrals</li>
            <li>✓ Branded landing page</li>
            <li>✓ Email notifications</li>
            <li>✓ SMS &amp; email templates</li>
            <li>✓ {platform.pricing.trialDays}-day free trial</li>
          </ul>
          <Link
            href="/signup"
            className="inline-block btn-primary px-6 py-3 rounded-lg font-semibold"
          >
            Start your free trial
          </Link>
        </div>
      </section>

      <section className="bg-brand text-white">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h2
            className="text-3xl sm:text-4xl font-bold mb-4"
          >
            Want to see it in action?
          </h2>
          <p className="text-slate-300 mb-8">
            Have a look at how AMP Renewables use {platform.name} to run their
            partner programme.
          </p>
          <Link
            href="/amprenewables"
            className="inline-block bg-brand-accent text-brand font-semibold px-6 py-3 rounded-lg"
          >
            See the example →
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="text-center text-sm text-slate-500 py-10 px-6 space-y-4 border-t border-slate-200 mt-12">
      <div className="flex justify-center opacity-60">
        <Logo variant="dark" size="sm" />
      </div>
      <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-slate-600">
        <Link href="/help" className="hover:text-brand">
          Help
        </Link>
        <Link href="/terms" className="hover:text-brand">
          Terms
        </Link>
        <Link href="/privacy" className="hover:text-brand">
          Privacy
        </Link>
        <a
          href={`mailto:${platform.supportEmail}`}
          className="hover:text-brand"
        >
          Contact
        </a>
      </nav>
      <p className="text-xs text-slate-400">
        © {new Date().getFullYear()} {platform.name}. The referral platform
        for tradesmen.
      </p>
    </footer>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div>
      <div className="w-10 h-10 rounded-full bg-brand-accent text-brand font-bold flex items-center justify-center mb-4">
        {n}
      </div>
      <h3 className="font-semibold text-brand text-lg mb-2">{title}</h3>
      <p
        className="text-slate-600 text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: body }}
      />
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-brand-accent font-bold pt-0.5">✓</span>
      <div>
        <div className="font-semibold text-brand">{title}</div>
        <p
          className="text-slate-600 text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: body }}
        />
      </div>
    </div>
  );
}

