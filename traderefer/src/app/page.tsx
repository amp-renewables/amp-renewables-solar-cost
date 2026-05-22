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

      {/* ───────────────────────── HERO ───────────────────────── */}
      <section className="bg-brand text-white">
        <div className="max-w-4xl mx-auto px-6 py-20 sm:py-28 text-center">
          <span className="inline-block bg-brand-accent text-brand px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
            For installers, trades &amp; home-service businesses
          </span>
          <h1 className="text-5xl sm:text-7xl font-extrabold leading-[1.02] mb-6 tracking-tight">
            Stop Hoping for Word-of-Mouth.
            <br />
            Systemise It.
          </h1>
          <p className="text-xl sm:text-2xl text-white font-semibold max-w-2xl mx-auto mb-4 leading-snug">
            Weaponise your contacts.
          </p>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            {platform.name} lets installers and trades businesses launch
            their own branded referral programme in minutes — with partner
            sign-ups, referral tracking and payout records built in.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="bg-brand-accent text-brand font-semibold px-6 py-3 rounded-lg w-full sm:w-auto"
            >
              Launch My Referral Programme →
            </Link>
            <Link
              href="/amprenewables"
              className="border border-slate-500 text-slate-300 px-6 py-3 rounded-lg w-full sm:w-auto hover:bg-white/5"
            >
              See live example
            </Link>
          </div>
          <p className="text-sm text-slate-400 mt-6">
            No card required · {platform.pricing.trialDays}-day free trial · {formatPrice(platform.pricing.monthly)}/month
            after · Cancel anytime
          </p>
        </div>
      </section>

      {/* ─────────── PROBLEM AGITATION ─────────── */}
      <section className="bg-slate-50 border-y border-slate-200 py-20">
        <div className="max-w-3xl mx-auto px-6">
          <p className="text-xs uppercase tracking-wider text-brand-accent font-bold mb-3 text-center">
            The problem
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-brand text-center mb-6 leading-tight">
            Your best leads are sitting in other people&apos;s phones.
          </h2>
          <p className="text-lg text-slate-700 leading-relaxed mb-6">
            Every roofer, electrician, plumber, builder, cleaner, estate
            agent and past customer of yours knows someone who needs work
            done. But most businesses leave those referrals to chance.
          </p>
          <ul className="space-y-2 text-slate-700 text-lg mb-6">
            <li className="flex gap-3">
              <span className="text-rose-500 font-bold">✗</span>
              <span>No system.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-rose-500 font-bold">✗</span>
              <span>No tracking.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-rose-500 font-bold">✗</span>
              <span>No proper incentive.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-rose-500 font-bold">✗</span>
              <span>No follow-up.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-rose-500 font-bold">✗</span>
              <span>No idea who&apos;s owed what.</span>
            </li>
          </ul>
          <p className="text-xl font-semibold text-brand text-center pt-4 border-t border-slate-200">
            {platform.name} gives you the system.
          </p>
        </div>
      </section>

      {/* ─────────── LIVE EXAMPLE (elevated) ─────────── */}
      <section className="bg-brand text-white py-20">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-xs uppercase tracking-wider text-brand-accent font-bold mb-3 text-center">
            Live programme
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-6 leading-tight">
            See a real referral programme in action.
          </h2>
          <p className="text-center text-slate-300 max-w-2xl mx-auto mb-10 text-lg">
            AMP Renewables (a solar installer) pays partners{" "}
            <strong className="text-white">up to £300</strong> per referred
            customer — all tracked through {platform.name}.
          </p>

          <div className="grid sm:grid-cols-3 gap-4 mb-10">
            <PayoutCard
              amount="£50"
              when="When the appointment is booked"
            />
            <PayoutCard
              amount="£250"
              when="When the job sells"
            />
            <PayoutCard
              amount="Up to £300"
              when="Per referred customer"
              highlight
            />
          </div>

          <div className="text-center">
            <Link
              href="/amprenewables"
              className="inline-block bg-brand-accent text-brand font-semibold px-6 py-3 rounded-lg"
            >
              View AMP&apos;s live programme →
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────── HOW IT WORKS ─────────── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <p className="text-xs uppercase tracking-wider text-brand-accent font-bold mb-3 text-center">
          How it works
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold text-brand text-center mb-4 leading-tight">
          Three steps from idea to first paid referral.
        </h2>
        <p className="text-center text-slate-600 max-w-2xl mx-auto mb-14">
          Built for solar installers, roofers, plumbers, electricians,
          heat-pump fitters — anyone who relies on word-of-mouth and wants
          to systemise it.
        </p>
        <div className="grid sm:grid-cols-3 gap-8">
          <Step
            n={1}
            title="Build your referral programme"
            body="Upload your logo, choose your colours, set what you'll pay for a booked appointment and for a sold job. You get a branded landing page at /yourcompany — ready to share in minutes."
          />
          <Step
            n={2}
            title="Invite people who meet your ideal customers"
            body="Send your link to local trades, past customers, estate agents, landlords, developers — anyone who can put work your way. They sign up in seconds and can start sending you leads."
          />
          <Step
            n={3}
            title="Track every referral from lead to payout"
            body="See who sent the lead, what happened next, what stage it's at, and what you owe when the job sells. Partners get their own dashboard. Mark each payout paid once you've sent the money."
          />
        </div>
      </section>

      {/* ─────────── FEATURES AS OUTCOMES ─────────── */}
      <section className="bg-white border-y border-slate-200 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-xs uppercase tracking-wider text-brand-accent font-bold mb-3 text-center">
            What you get
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-brand text-center mb-12 leading-tight">
            Everything you need to run a proper referral programme.
          </h2>
          <div className="grid sm:grid-cols-2 gap-x-12 gap-y-7 max-w-3xl mx-auto">
            <Feature
              title="Look professional from day one"
              body="Give partners a proper branded sign-up page instead of asking them to text you random leads."
            />
            <Feature
              title="Pay what makes sense for your margins"
              body="You decide what you pay per booked appointment and per sold job. Higher payouts for high-value jobs, lower for quick wins."
            />
            <Feature
              title="Never lose track of a referral"
              body="Every lead from submission to install, with full status history and timestamps. Audit trail built in."
            />
            <Feature
              title="No awkward 'what do I owe you?' chats"
              body="When a lead becomes a sale, the payout appears automatically. Partners see exactly what they've earned. You see exactly what you owe."
            />
            <Feature
              title="Make it easy for partners to promote you"
              body="Pre-written SMS and email templates partners can copy and send to their customers — so they actually do it."
            />
            <Feature
              title="Know the moment a referral lands"
              body="Email notifications the second a partner submits a new customer — so you can pick up the phone before the lead goes cold."
            />
          </div>
        </div>
      </section>

      {/* ─────────── THE OFFER (Hormozi-style) ─────────── */}
      <section className="max-w-3xl mx-auto px-6 py-20">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-8 sm:p-12">
          <p className="text-xs uppercase tracking-wider text-brand-accent font-bold mb-3">
            The offer
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold leading-tight mb-6">
            You already know who could send you work.
            <br />
            You just need a system that turns them into a sales team.
          </h2>
          <p className="text-slate-300 mb-10 text-lg">
            Past customers. Local trades. Suppliers. Their suppliers. Estate
            agents. Right now they&apos;re not sending you anything because
            there&apos;s no reason to and no system for it.{" "}
            <strong className="text-white">{platform.name} is the system.</strong>
          </p>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6 sm:p-8 mb-6">
            <p className="text-xs uppercase tracking-wider text-brand-accent font-bold mb-4">
              Here&apos;s what you get
            </p>
            <ul className="space-y-3 text-slate-100">
              <OfferLine>
                Your own branded sign-up page — your logo, your colours,
                your URL — live in under 60 seconds
              </OfferLine>
              <OfferLine>
                Unlimited partners. Your contacts and theirs.
                No per-seat fees, no caps
              </OfferLine>
              <OfferLine>
                Unlimited referrals. Track 5 a year or 5 a day — same price
              </OfferLine>
              <OfferLine>
                Every lead tracked from first call → appointment → signed
                job, with full audit trail
              </OfferLine>
              <OfferLine>
                Automatic payout maths so you never have an awkward
                &quot;what do I owe you?&quot; conversation
              </OfferLine>
              <OfferLine>
                Pre-written SMS &amp; email templates your partners can
                copy and send — so they actually share you
              </OfferLine>
              <OfferLine>
                Email alerts the moment a referral lands so you can call
                while the lead is hot
              </OfferLine>
            </ul>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6 sm:p-8 mb-10">
            <p className="text-xs uppercase tracking-wider text-brand-accent font-bold mb-4">
              And here&apos;s the catch (there isn&apos;t one)
            </p>
            <ul className="space-y-3 text-slate-100">
              <OfferLine icon="🔒">
                <strong className="text-white">
                  Partners only earn when they actually deliver.
                </strong>{" "}
                No payment until an appointment is booked or a job is sold.
                If a referral fizzles, you owe nothing
              </OfferLine>
              <OfferLine icon="🔒">
                <strong className="text-white">
                  {platform.name} costs less than your phone bill.
                </strong>{" "}
                Flat {formatPrice(platform.pricing.monthly)}/month — no
                tiers, no per-user, no add-ons
              </OfferLine>
              <OfferLine icon="🔒">
                <strong className="text-white">
                  Doesn&apos;t produce? Cancel anytime.
                </strong>{" "}
                No commitment, no contract, no questions asked
              </OfferLine>
            </ul>
          </div>

          <div className="border-t border-white/15 pt-8 text-center">
            <p className="text-2xl sm:text-3xl font-bold leading-snug mb-3">
              You have a hidden sales team in your phone contacts.
              <br />
              <span className="text-brand-accent">
                {platform.name} is what activates them.
              </span>
            </p>
            <p className="text-slate-400 text-sm mt-6">
              What else can you buy for {formatPrice(platform.pricing.monthly)}/month
              that has any chance of putting a five-figure job through your
              door?
            </p>
          </div>
        </div>
      </section>

      {/* ─────────── PRICING ─────────── */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <p className="text-xs uppercase tracking-wider text-brand-accent font-bold mb-3">
          Pricing
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold text-brand mb-4 leading-tight">
          Simple pricing. No card required to try.
        </h2>
        <div className="bg-white border border-slate-200 rounded-2xl p-10 mt-8 shadow-sm">
          <div className="text-6xl font-bold text-brand mb-2">
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
            <li>✓ {platform.pricing.trialDays}-day free trial — no card</li>
          </ul>
          <Link
            href="/signup"
            className="inline-block btn-primary px-6 py-3 rounded-lg font-semibold"
          >
            Launch My Referral Programme →
          </Link>
        </div>
      </section>

      {/* ─────────── FINAL CTA ─────────── */}
      <section className="bg-brand text-white">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">
            Launch your referral programme today.
          </h2>
          <p className="text-slate-300 mb-8">
            30 seconds to sign up. No card required.
            Your branded landing page is live before you&apos;ve put the
            kettle on.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-brand-accent text-brand font-semibold px-6 py-3 rounded-lg"
          >
            Launch My Referral Programme →
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
        for trades, installers and local service businesses.
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
      <p className="text-slate-600 text-sm leading-relaxed">{body}</p>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-brand-accent font-bold pt-0.5">✓</span>
      <div>
        <div className="font-semibold text-brand mb-1">{title}</div>
        <p className="text-slate-600 text-sm leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function PayoutCard({
  amount,
  when,
  highlight,
}: {
  amount: string;
  when: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-5 border ${
        highlight
          ? "bg-brand-accent text-brand border-brand-accent"
          : "bg-white/5 border-white/15"
      }`}
    >
      <div className="text-3xl font-extrabold mb-1">{amount}</div>
      <div
        className={`text-sm ${
          highlight ? "text-brand opacity-80" : "text-slate-300"
        }`}
      >
        {when}
      </div>
    </div>
  );
}

function OfferLine({
  children,
  icon = "✓",
}: {
  children: React.ReactNode;
  icon?: string;
}) {
  return (
    <li className="flex gap-3 leading-relaxed">
      <span className="text-brand-accent font-bold flex-shrink-0 mt-0.5">
        {icon}
      </span>
      <span>{children}</span>
    </li>
  );
}
