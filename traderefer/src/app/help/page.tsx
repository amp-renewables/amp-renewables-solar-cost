import Link from "next/link";
import { platform, formatPrice } from "@/lib/platform";
import { Logo } from "@/components/Logo";

export const metadata = {
  title: `Help · ${platform.name}`,
  description: `Frequently asked questions about ${platform.name} — for companies running a referral programme and for the tradesmen and customers who refer to them.`,
};

export default function HelpPage() {
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

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-12">
        <div>
          <p className="text-xs uppercase tracking-wider text-brand-accent font-bold mb-2">
            Help & FAQs
          </p>
          <h1 className="text-4xl font-extrabold text-brand tracking-tight">
            Common questions
          </h1>
          <p className="text-slate-600 mt-3">
            Quick answers for both companies running a programme and the
            tradesmen / customers who refer to them. Can&apos;t find what you
            need? Email{" "}
            <a
              href={`mailto:${platform.supportEmail}`}
              className="text-brand underline"
            >
              {platform.supportEmail}
            </a>
            .
          </p>
        </div>

        <Section title="For businesses running a programme">
          <FAQ q="What is TradeRefer?">
            A subscription platform that lets your business run its own
            referral programme. You get a branded landing page at{" "}
            <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">
              {platform.domain}/yourcompany
            </code>{" "}
            where tradesmen and former customers can sign up as partners,
            then refer customers to you. We track each referral end-to-end
            and tell you exactly what you owe each partner.
          </FAQ>
          <FAQ q="How much does it cost?">
            {formatPrice(platform.pricing.monthly)} per month, all-in. No
            per-partner fees, no per-referral fees, no setup. Cancel any time
            from your billing page. We give every new account a free{" "}
            {platform.pricing.trialDays}-day trial.
          </FAQ>
          <FAQ q="Who can I invite as a partner?">
            Anyone you trust to recommend you. The common picks: local
            tradesmen in adjacent specialisms (a roofer working with a solar
            installer, a plumber working with a heat-pump fitter), and your
            own past customers acting as ambassadors. They sign up via your
            landing page, and you decide what to pay each side.
          </FAQ>
          <FAQ q="When do I pay partners?">
            Whenever you want — we just track what&apos;s owed. As soon as
            you mark an appointment booked, a payout appears for the partner.
            Same again when you mark the job sold. You pay by bank transfer
            on your own schedule (weekly, monthly, whatever works) and tick
            payouts off in the admin as you send them.
          </FAQ>
          <FAQ q="How do I customise my landing page?">
            Head to <strong>Settings</strong> in the company admin. Upload
            your logo, pick your brand colours, set your payout amounts per
            appointment and per job sold, and choose which services you
            cover. Changes are live on your public page within seconds.
          </FAQ>
          <FAQ q="Can I add other admins?">
            Yes — up to 4 team members per company. <strong>Settings</strong>{" "}
            → Team → invite by email. They get a link to set their own
            password and join with full admin access.
          </FAQ>
          <FAQ q="Can I cancel?">
            Any time. <strong>Billing</strong> → <em>Manage subscription</em>{" "}
            → Cancel. You keep access until the end of your paid period,
            then the account becomes read-only — your data stays intact in
            case you come back.
          </FAQ>
          <FAQ q="What about GDPR / data protection?">
            We require every partner to confirm — by ticking a box at
            submission — that they have the customer&apos;s permission to
            share their details with you. The confirmation is recorded with
            a timestamp so you can prove consent if challenged. Beyond that,
            you remain the data controller for the customer details that
            land in your account.{" "}
            <Link href="/privacy" className="text-brand underline">
              Read our privacy policy
            </Link>
            .
          </FAQ>
        </Section>

        <Section title="For partners (tradesmen & ambassadors)">
          <FAQ q="How do I refer a customer?">
            Log into your dashboard, click <strong>Refer a customer</strong>,
            and fill in their name, contact details, address and which
            services they&apos;re interested in. The business gets notified
            immediately and contacts the customer within a working day.
          </FAQ>
          <FAQ q="Do I need the customer's permission first?">
            Yes — always. Under UK data protection law you need their
            consent before sharing their phone number, email or address
            with a third party. The form has a tick box where you confirm
            you&apos;ve got it. Easiest way: ring the customer, ask if
            they&apos;d be happy for the company to give them a no-obligation
            quote, then submit.
          </FAQ>
          <FAQ q="When do I get paid?">
            That&apos;s up to the company you refer to. As soon as your
            customer&apos;s appointment is booked, your appointment payout
            moves to <em>Pending</em>. When the job sells, the job payout
            does the same. The company pays out by bank transfer on their
            own schedule — usually weekly or monthly.
          </FAQ>
          <FAQ q="How do they pay me?">
            By UK bank transfer. Add your sort code and account number under{" "}
            <strong>Account</strong> in your dashboard — they&apos;re only
            ever shared with the company you&apos;re partnered with, never
            with anyone else.
          </FAQ>
          <FAQ q="What if my referral doesn't convert?">
            You won&apos;t earn a payout for that referral — no penalty
            either though. Status moves to <em>Rejected</em> with a reason
            (usually customer changed their mind, or out of area). Refer the
            next one when you&apos;re ready.
          </FAQ>
          <FAQ q="Is there a cap on how many people I can refer?">
            No cap. Refer as many as you like.
          </FAQ>
          <FAQ q="Does it cost me anything?">
            Nothing. The business you refer to pays {platform.name} a
            subscription; partners use the platform free.
          </FAQ>
        </Section>

        <Section title="Account & billing">
          <FAQ q="I've forgotten my password.">
            On the{" "}
            <Link href="/login" className="text-brand underline">
              login page
            </Link>{" "}
            click <em>Forgot password</em>. We&apos;ll email you a reset
            link valid for one hour.
          </FAQ>
          <FAQ q="My card was declined.">
            Most often it&apos;s an expired card or a bank fraud check.
            Update your card in the Stripe Customer Portal — accessed via{" "}
            <strong>Billing</strong> in your admin → <em>Manage
            subscription</em>. If problems persist, email us and we&apos;ll
            help.
          </FAQ>
          <FAQ q="I need a VAT invoice.">
            Every Stripe-issued receipt is available in the Customer Portal
            under <em>Invoice history</em>. If you need extra information
            on the invoice, email{" "}
            <a
              href={`mailto:${platform.supportEmail}`}
              className="text-brand underline"
            >
              {platform.supportEmail}
            </a>
            .
          </FAQ>
        </Section>

        <div className="border-t border-slate-200 pt-8 mt-4">
          <h2 className="text-xl font-bold text-brand mb-2">
            Still stuck?
          </h2>
          <p className="text-slate-600">
            Email{" "}
            <a
              href={`mailto:${platform.supportEmail}`}
              className="text-brand underline"
            >
              {platform.supportEmail}
            </a>{" "}
            and we&apos;ll come back within one working day.
          </p>
        </div>
      </main>

      <footer className="text-center text-sm text-slate-500 py-10 px-6 space-y-4 border-t border-slate-200 mt-12">
        <div className="flex justify-center opacity-60">
          <Logo variant="dark" size="sm" />
        </div>
        <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-slate-600">
          <Link href="/" className="hover:text-brand">
            Home
          </Link>
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
          © {new Date().getFullYear()} {platform.name}.
        </p>
      </footer>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-4">
        {title}
      </h2>
      <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
        {children}
      </div>
    </section>
  );
}

function FAQ({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group p-5 cursor-pointer">
      <summary className="flex items-center justify-between gap-4 list-none">
        <span className="font-semibold text-slate-900 group-hover:text-brand">
          {q}
        </span>
        <span className="text-slate-400 text-xl flex-shrink-0 group-open:rotate-45 transition-transform">
          +
        </span>
      </summary>
      <div className="mt-3 text-slate-600 text-sm leading-relaxed">
        {children}
      </div>
    </details>
  );
}
