import { platform } from "@/lib/platform";
import { PublicShell } from "@/components/PublicShell";

export const metadata = {
  title: `Privacy Policy · ${platform.name}`,
  description: `How ${platform.name} handles your personal information.`,
};

const EFFECTIVE_DATE = "21 May 2026";

export default function PrivacyPage() {
  return (
    <PublicShell>
      <main className="max-w-3xl mx-auto px-6 py-12">
        <p className="text-xs uppercase tracking-wider text-brand-accent font-bold mb-2">
          Legal
        </p>
        <h1 className="text-4xl font-extrabold text-brand tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-sm text-slate-500 mt-2">
          Effective {EFFECTIVE_DATE}. Plain English summary, then the
          detail.
        </p>

        <div className="legal-content mt-10">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 not-prose">
            <p className="font-semibold text-brand">In one paragraph</p>
            <p className="text-sm text-slate-700 mt-2">
              We collect the minimum information needed to run a referral
              platform: account details for users, customer contact details
              that partners submit (with the customer&apos;s consent), and
              standard billing details for paying companies. We don&apos;t
              sell data, don&apos;t use it for advertising, and only share
              it with the services we need to operate (Stripe, Resend,
              Vercel, Neon). You can ask us for a copy of your data, or to
              delete it, by emailing{" "}
              <a
                href={`mailto:${platform.supportEmail}`}
                className="text-brand underline"
              >
                {platform.supportEmail}
              </a>
              .
            </p>
          </div>

          <h2>1. Who we are</h2>
          <p>
            {platform.name} (&quot;we&quot;, &quot;us&quot;) is operated as
            a sole trader business in the United Kingdom. For privacy
            matters, contact{" "}
            <a href={`mailto:${platform.supportEmail}`}>
              {platform.supportEmail}
            </a>
            .
          </p>

          <h2>2. What we collect &amp; why</h2>
          <p>
            We collect three categories of personal data:
          </p>
          <ul>
            <li>
              <strong>Account information</strong> — name, email, phone,
              business name and (where relevant) UK bank sort code and
              account number, so partners can be paid. Lawful basis:
              performance of a contract (you&apos;ve asked us to provide
              the service).
            </li>
            <li>
              <strong>Customer referral data</strong> — when a partner
              submits a referral, we receive the end customer&apos;s name,
              phone, email, address and any notes. The partner confirms at
              submission that they have the customer&apos;s permission to
              share these details. Lawful basis: legitimate interest of
              the business receiving the referral, with the partner having
              obtained the customer&apos;s consent.
            </li>
            <li>
              <strong>Billing information</strong> — handled by Stripe.
              We see the last 4 digits of the card and the billing email;
              we never see or store full card numbers.
            </li>
          </ul>

          <h2>3. Who&apos;s the data controller?</h2>
          <p>
            For account-level data (logins, billing, partner profiles),
            {platform.name} is the data controller. For end-customer
            referral data submitted by partners, the Customer business
            running the programme is the data controller — we act as
            their processor. If you&apos;re a customer who was referred to
            a business through this platform and want to exercise your
            rights, contact that business directly; we&apos;ll cooperate
            with them on any request.
          </p>

          <h2>4. How we use your data</h2>
          <ul>
            <li>To create and manage your account and provide the service.</li>
            <li>
              To send transactional emails (signup confirmation, password
              reset, new-referral alerts, billing receipts).
            </li>
            <li>
              To debug, secure and improve the platform — we keep server
              logs and error traces for a limited period.
            </li>
            <li>
              To comply with legal obligations (tax records, anti-fraud,
              valid requests from authorities).
            </li>
          </ul>
          <p>
            We do <strong>not</strong> use your data for advertising,
            don&apos;t sell it to anyone, and don&apos;t share it with
            third parties beyond the operational subprocessors below.
          </p>

          <h2>5. Subprocessors</h2>
          <p>
            We use the following services to operate {platform.name}:
          </p>
          <ul>
            <li>
              <strong>Vercel</strong> — hosting and edge delivery (USA,
              with EU edge locations). Standard Contractual Clauses in
              place.
            </li>
            <li>
              <strong>Neon</strong> — managed Postgres database, EU
              (London / Ireland) region.
            </li>
            <li>
              <strong>Stripe</strong> — subscription billing and payments.
              Stripe is the data controller for card data.
            </li>
            <li>
              <strong>Resend</strong> — transactional email delivery (EU).
            </li>
            <li>
              <strong>Cloudflare</strong> — DNS, CDN and edge security
              (USA with EU edge locations).
            </li>
          </ul>
          <p>
            Each service has its own privacy policy and processes data
            only on our instructions.
          </p>

          <h2>6. How long we keep data</h2>
          <ul>
            <li>
              <strong>Account data</strong> — for as long as the account
              is open, plus 6 years afterwards for accounting/tax
              compliance (HMRC requires retention of business records).
            </li>
            <li>
              <strong>Referral data</strong> — retained while the
              receiving business&apos;s account is active. Closed accounts
              have their referral data deleted after a reasonable wind-down
              period.
            </li>
            <li>
              <strong>Server logs</strong> — usually 30 days, longer for
              security investigations.
            </li>
          </ul>

          <h2>7. Your rights</h2>
          <p>Under UK GDPR you have the right to:</p>
          <ul>
            <li>Access the personal data we hold about you.</li>
            <li>Have it corrected if inaccurate.</li>
            <li>
              Have it deleted (subject to retention obligations above).
            </li>
            <li>Restrict or object to processing.</li>
            <li>Export it in a portable format.</li>
            <li>
              Complain to the UK Information Commissioner&apos;s Office
              (ICO) at <a href="https://ico.org.uk">ico.org.uk</a>.
            </li>
          </ul>
          <p>
            To exercise any of these rights, email{" "}
            <a href={`mailto:${platform.supportEmail}`}>
              {platform.supportEmail}
            </a>
            . We&apos;ll respond within one calendar month.
          </p>

          <h2>8. Cookies</h2>
          <p>
            We use a single first-party cookie (
            <code>traderefer_session</code>) to keep you logged in. It&apos;s
            essential for the service to work — no marketing or analytics
            cookies are set. We don&apos;t use Google Analytics or any
            similar tracking.
          </p>

          <h2>9. International transfers</h2>
          <p>
            Most of our data sits in EU regions (Neon, Resend) or
            on-premise UK infrastructure. Where data flows to non-EU
            countries (Vercel and Cloudflare edge infrastructure), we rely
            on the UK&apos;s adequacy mechanisms and Standard Contractual
            Clauses.
          </p>

          <h2>10. Security</h2>
          <p>
            Passwords are hashed with bcrypt before storage. All traffic
            is encrypted in transit (HTTPS, HSTS). Database backups are
            encrypted at rest. We&apos;ll notify affected users and the
            ICO within 72 hours of any breach that puts personal data at
            risk.
          </p>

          <h2>11. Changes to this policy</h2>
          <p>
            We&apos;ll update this page when our practices change. If the
            change is material, we&apos;ll notify active users by email.
            The effective date at the top of this page always shows the
            current version.
          </p>

          <h2>12. Contact</h2>
          <p>
            Privacy questions, data requests, or complaints:{" "}
            <a href={`mailto:${platform.supportEmail}`}>
              {platform.supportEmail}
            </a>
            .
          </p>

          <p className="text-xs text-slate-500 mt-10 border-t border-slate-200 pt-6">
            This policy is a working draft pending review by a UK
            solicitor. The substance reflects our actual practice, but the
            wording will be tightened before {platform.name} reaches
            material scale.
          </p>
        </div>
      </main>
    </PublicShell>
  );
}
