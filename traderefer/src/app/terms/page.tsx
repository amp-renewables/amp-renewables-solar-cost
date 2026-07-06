import { platform, formatPrice } from "@/lib/platform";
import { PublicShell } from "@/components/PublicShell";

export const metadata = {
  title: `Terms of Service · ${platform.name}`,
  description: `Terms of Service for ${platform.name}.`,
};

// Boilerplate terms — pending review by a UK solicitor before scale-up.
// Effective date shown to users is set here; bump it whenever material
// changes ship.
const EFFECTIVE_DATE = "21 May 2026";

export default function TermsPage() {
  return (
    <PublicShell>
      <main className="max-w-3xl mx-auto px-6 py-12">
        <p className="text-xs uppercase tracking-wider text-brand-accent font-bold mb-2">
          Legal
        </p>
        <h1 className="text-4xl font-extrabold text-brand tracking-tight">
          Terms of Service
        </h1>
        <p className="text-sm text-slate-500 mt-2">
          Effective {EFFECTIVE_DATE}. We&apos;ll update this page if the
          terms change materially. Continued use after a change means you
          accept the updated terms.
        </p>

        <div className="legal-content mt-10">
          <p className="text-slate-700">
            These Terms of Service (&quot;Terms&quot;) govern your use of{" "}
            {platform.name} (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;)
            at <a href={platform.url}>{platform.domain}</a> and any related
            services we provide. By creating an account or using the
            platform you agree to these Terms.
          </p>

          <h2>1. Who we are</h2>
          <p>
            {platform.name} is operated as a sole trader business in the
            United Kingdom. For questions about these Terms, email{" "}
            <a href={`mailto:${platform.supportEmail}`}>
              {platform.supportEmail}
            </a>
            .
          </p>

          <h2>2. The service</h2>
          <p>
            {platform.name}{" "}
            is a software-as-a-service platform that lets businesses run
            their own referral programmes. Businesses
            (&quot;Customers&quot;) subscribe and use the platform to
            recruit partners (tradesmen and former customers, &quot;Partners&quot;)
            who refer end customers. Partners use the platform free of
            charge; only Customers pay a subscription fee.
          </p>

          <h2>3. Account &amp; eligibility</h2>
          <ul>
            <li>You must be at least 18 years old.</li>
            <li>
              You&apos;re responsible for keeping your password
              confidential and for all activity that happens under your
              account.
            </li>
            <li>
              You agree to provide accurate information at signup and to
              keep your account details current.
            </li>
          </ul>

          <h2>4. Subscription &amp; payment</h2>
          <ul>
            <li>
              The current subscription price is{" "}
              {formatPrice(platform.pricing.monthly)} per calendar month,
              billed in advance via Stripe. We may change the price by
              giving at least 30 days&apos; notice via email or in-app
              banner.
            </li>
            <li>
              New Customers get a free {platform.pricing.trialDays}-day
              trial. The trial ends automatically; if you upgrade during or
              after the trial we charge the card on file.
            </li>
            <li>
              You may cancel any time from your billing page. Cancellation
              takes effect at the end of your current paid period — we
              don&apos;t pro-rate refunds for partial months.
            </li>
            <li>
              If a payment fails, we&apos;ll retry over a short grace
              period. If unrecovered, your account is paused (read-only)
              until payment is updated.
            </li>
          </ul>

          <h2>5. Acceptable use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>
              Use the platform to send unsolicited marketing, spam, or
              communications that breach UK PECR or GDPR rules.
            </li>
            <li>
              Submit a referral without the customer&apos;s explicit
              permission to share their personal information with the
              receiving business. The platform records your confirmation
              of consent at submission — providing false confirmation is a
              breach of these Terms and may also be unlawful.
            </li>
            <li>
              Misrepresent your identity, the business you&apos;re partnered
              with, or the services on offer.
            </li>
            <li>
              Attempt to reverse engineer the platform, abuse the API,
              probe for vulnerabilities, or scrape data.
            </li>
            <li>
              Use the platform for any illegal purpose or in any way that
              damages our reputation or the reputation of other users.
            </li>
          </ul>

          <h2>6. Data &amp; privacy</h2>
          <p>
            We process personal data in line with our{" "}
            <a href="/privacy">Privacy Policy</a>. The Customer business
            running a programme is the data controller for end-customer
            details submitted as referrals; we process those details on
            their behalf. Partners are responsible for ensuring they have
            valid consent before sharing customer details with a business.
          </p>

          <h2>7. Payouts to partners</h2>
          <p>
            Payout amounts are set by each Customer business and tracked by
            the platform. {platform.name} does <strong>not</strong> handle
            partner payouts — the Customer business pays partners directly
            (typically by UK bank transfer) and marks each payout as paid
            inside the platform. We&apos;re not a party to any payment
            obligation between a business and its partners.
          </p>

          <h2>8. Intellectual property</h2>
          <p>
            The platform, including its source code, design, branding and
            documentation, is owned by us. You retain ownership of all
            content you upload (logos, copy, customer details, etc.) but
            grant us a non-exclusive licence to host and process it for the
            purpose of providing the service.
          </p>

          <h2>9. Termination</h2>
          <p>
            You can stop using the platform any time. We may suspend or
            terminate accounts that breach these Terms, with notice except
            in cases of serious or repeated breach. On termination your
            data may be retained for a reasonable period in case of
            disputes, then deleted in line with our Privacy Policy.
          </p>

          <h2>10. Liability</h2>
          <p>
            To the maximum extent permitted by law, our total liability to
            you for any claims arising from your use of the platform is
            limited to the subscription fees you paid us in the 12 months
            preceding the claim. We are not liable for indirect or
            consequential losses, lost profits, or lost goodwill.
          </p>
          <p>
            Nothing in these Terms limits liability for death, personal
            injury, fraud or anything else that cannot be excluded under UK
            law.
          </p>

          <h2>11. Changes to the service</h2>
          <p>
            We may add, change or remove features at any time. If we make a
            material change that materially reduces the value of your
            subscription, we&apos;ll give you reasonable notice and a way
            to cancel without penalty.
          </p>

          <h2>12. Governing law</h2>
          <p>
            These Terms are governed by the laws of England and Wales, and
            the courts of England and Wales have exclusive jurisdiction
            over any disputes.
          </p>

          <h2>13. Contact</h2>
          <p>
            Email{" "}
            <a href={`mailto:${platform.supportEmail}`}>
              {platform.supportEmail}
            </a>{" "}
            for anything related to these Terms.
          </p>

          <p className="text-xs text-slate-500 mt-10 border-t border-slate-200 pt-6">
            These Terms are a working draft pending review by a UK
            solicitor. They will be refined before {platform.name} reaches
            material scale. If you spot something unclear or unfair, please
            tell us at {platform.supportEmail}.
          </p>
        </div>
      </main>
    </PublicShell>
  );
}
