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
          <FAQ q="How do I quietly promote the programme in every email I send?">
            <strong>Settings → Signature.</strong> We generate a one-line
            email-signature snippet that includes your sign-up link and your
            current payout total. Paste it into your email signature in
            Gmail, Outlook, Apple Mail or iOS Mail (we provide
            click-by-click install instructions for each), and from then on
            every email you send — quotes, replies, replies to suppliers,
            replies to anyone — quietly prompts the recipient to become a
            referrer. It&apos;s the highest-leverage thing you can do once
            you&apos;ve set up your programme. If you change your payout
            amounts later, the figure in the signature updates automatically
            so you never have stale numbers floating around.
          </FAQ>
          <FAQ q="Are there other low-effort ways to recruit partners?">
            A few that work well:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>
                Add the sign-up link to your invoice template so every
                completed customer sees it
              </li>
              <li>
                Mention it on your job-completion / customer feedback emails
              </li>
              <li>
                Print a QR code linking to your sign-up page on van decals
                or business cards
              </li>
              <li>
                Send a direct one-liner to past customers offering them the
                deal — they already trust you
              </li>
            </ul>
            The email signature is the easiest place to start because it
            requires zero ongoing effort once installed.
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

        <Section
          title="How we keep your data safe"
          id="data-safety"
        >
          <FAQ q="How are partner bank details stored?">
            Sort codes and account numbers are <strong>encrypted with
            AES-256-GCM</strong> the moment a partner saves them. What
            lives in our database is base64-encoded ciphertext, not the
            digits themselves. The decryption key sits in a separate
            environment from the database — even if someone got a copy of
            the database, they&apos;d see scrambled text without the key,
            which they don&apos;t have access to.
          </FAQ>
          <FAQ q="Who can see partner bank details?">
            Three groups, no-one else:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>
                The partner themselves, in their own account settings
              </li>
              <li>
                Authorised admins at the company the partner is partnered
                with — and only by explicitly clicking &quot;Reveal&quot;
                on the masked display when they&apos;re processing a
                payout
              </li>
              <li>
                {platform.name} support, only on a legitimate written
                request from the partner or company
              </li>
            </ul>
            Every admin reveal is logged with the admin&apos;s ID, a
            timestamp, and the reason. If you want the access history for
            your account, email{" "}
            <a
              href={`mailto:${platform.supportEmail}`}
              className="text-brand underline"
            >
              {platform.supportEmail}
            </a>{" "}
            and we&apos;ll send it over within one working day.
          </FAQ>
          <FAQ q="What about customer referral data?">
            When a partner submits a referral they tick a box confirming
            they have the customer&apos;s permission to share their
            details. We record that confirmation with a timestamp so it
            can be produced if a customer ever queries it. The receiving
            business is the data controller for those customer details —
            we process them on the business&apos;s behalf.
          </FAQ>
          <FAQ q="How are passwords protected?">
            Passwords are{" "}
            <strong>hashed with bcrypt</strong> before storage — we never
            store plain passwords, and we can&apos;t see what your password
            is even from inside the platform. Password reset tokens are
            also hashed (SHA-256), expire after 1 hour, and are single-use.
          </FAQ>
          <FAQ q="What's encrypted in transit?">
            Everything. All traffic between your browser and{" "}
            {platform.name} uses TLS 1.2+, and our domain has HSTS enabled
            — meaning modern browsers refuse to even attempt a non-HTTPS
            connection. The same applies to our connections to Stripe,
            Resend, Neon and every other service we talk to.
          </FAQ>
          <FAQ q="Who else can touch the data?">
            Our subprocessors, all listed in our{" "}
            <Link href="/privacy" className="text-brand underline">
              privacy policy
            </Link>
            . In short:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>
                <strong>Vercel</strong> — hosts the app
              </li>
              <li>
                <strong>Neon</strong> — runs the database (EU region,
                encrypted at rest)
              </li>
              <li>
                <strong>Stripe</strong> — handles company subscription
                payments (Stripe is the data controller for card data, not
                us — we never see card numbers)
              </li>
              <li>
                <strong>Resend</strong> — sends transactional email
              </li>
              <li>
                <strong>Cloudflare</strong> — handles DNS and edge
                security
              </li>
            </ul>
            Each processor acts only on our instruction. We don&apos;t
            sell data to anyone, and there are no advertising or analytics
            trackers on the platform.
          </FAQ>
          <FAQ q="What if I want my data deleted?">
            Email{" "}
            <a
              href={`mailto:${platform.supportEmail}`}
              className="text-brand underline"
            >
              {platform.supportEmail}
            </a>{" "}
            and we&apos;ll process the request within one calendar month
            (UK GDPR&apos;s default). Some records have to be retained for
            tax / accounting purposes (HMRC requires 6 years for business
            records), but we&apos;ll anonymise what we can and delete what
            we don&apos;t need to keep.
          </FAQ>
          <FAQ q="What happens if there's a breach?">
            We&apos;ll notify affected users and the UK Information
            Commissioner&apos;s Office within 72 hours of becoming aware,
            in line with UK GDPR. We&apos;d also tell you what was
            affected, what we&apos;re doing about it, and what (if
            anything) you should do.
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
  id,
}: {
  title: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className={id ? "scroll-mt-8" : undefined}>
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
