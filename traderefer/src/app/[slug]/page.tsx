import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCompanyBySlug,
  formatCompanyMoney,
  payoutsForCompany,
} from "@/lib/company";
import { platform } from "@/lib/platform";

export default async function CompanyLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const company = await getCompanyBySlug(slug);
  if (!company) notFound();

  // NB: this page is intentionally accessible to logged-in users too.
  // Company admins need to be able to view their own landing page to QA
  // it (logo, copy, colours) without having to log out. The header CTAs
  // still send users to /login or /<slug>/signup, both of which handle
  // already-authenticated visitors gracefully.

  const payouts = payoutsForCompany(company);

  // Inline per-company CSS variables so this page picks up the company's
  // colours regardless of what the root layout has set.
  const themeVars = `
    :root {
      --brand-primary: ${company.primaryColor};
      --brand-accent: ${company.accentColor};
    }
  `;

  return (
    <div className="min-h-screen">
      <style dangerouslySetInnerHTML={{ __html: themeVars }} />

      <header className="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          {company.logoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={company.logoUrl}
              alt={company.name}
              className="h-10 w-auto"
            />
          ) : (
            <span
              className="font-bold text-xl text-brand"
            >
              {company.name}
            </span>
          )}
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/login" className="px-4 py-2 text-brand hover:underline">
            Log in
          </Link>
          <Link
            href={`/${company.slug}/signup`}
            className="px-4 py-2 rounded-lg btn-primary font-medium"
          >
            Sign up
          </Link>
        </nav>
      </header>

      <section className="bg-brand text-white">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <span className="inline-block bg-brand-accent text-brand px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
            Partner programme
          </span>
          <h1
            className="text-4xl sm:text-5xl font-bold leading-tight mb-6"
          >
            Refer customers to {company.name}. Earn up to{" "}
            {formatCompanyMoney(company, payouts.total)} per job.
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto mb-8">
            {company.heroSubheading ??
              (payouts.appointment > 0
                ? `A simple referral programme for roofers, electricians and other trades. Send a customer to ${company.name} — they book the appointment and pay you ${formatCompanyMoney(company, payouts.appointment)}. If the job sells, you earn another ${formatCompanyMoney(company, payouts.job)}.`
                : `A simple referral programme for roofers, electricians and other trades. Send a customer to ${company.name} — when their job sells, you earn ${formatCompanyMoney(company, payouts.job)}.`)}
          </p>

          {/* The deal as cards, not just prose — same treatment the
              TradeRefer homepage gives this programme. Accent card =
              the headline total. Collapses to one card for
              sold-jobs-only deals. */}
          {payouts.appointment > 0 ? (
            <div className="grid sm:grid-cols-3 gap-3 max-w-3xl mx-auto mb-10 text-left">
              <div className="bg-white/10 border border-white/15 rounded-xl px-5 py-4">
                <div className="text-2xl font-bold">
                  {formatCompanyMoney(company, payouts.appointment)}
                </div>
                <div className="text-sm text-white/80 mt-0.5">
                  when the appointment is booked
                </div>
              </div>
              <div className="bg-white/10 border border-white/15 rounded-xl px-5 py-4">
                <div className="text-2xl font-bold">
                  {formatCompanyMoney(company, payouts.job)}
                </div>
                <div className="text-sm text-white/80 mt-0.5">
                  more when the job sells
                </div>
              </div>
              <div className="bg-brand-accent text-brand rounded-xl px-5 py-4">
                <div className="text-2xl font-bold">
                  Up to {formatCompanyMoney(company, payouts.total)}
                </div>
                <div className="text-sm mt-0.5">per referred customer</div>
              </div>
            </div>
          ) : (
            <div className="max-w-xs mx-auto mb-10 text-left">
              <div className="bg-brand-accent text-brand rounded-xl px-5 py-4 text-center">
                <div className="text-2xl font-bold">
                  {formatCompanyMoney(company, payouts.job)}
                </div>
                <div className="text-sm mt-0.5">
                  for every referred job that sells
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={`/${company.slug}/signup`}
              className="bg-brand-accent text-brand font-semibold px-6 py-3 rounded-lg w-full sm:w-auto"
            >
              Start referring →
            </Link>
            <Link
              href="/login"
              className="border border-white/30 text-white/90 px-6 py-3 rounded-lg w-full sm:w-auto hover:bg-white/5"
            >
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2
          className="text-3xl font-bold text-brand text-center mb-12"
        >
          How it works
        </h2>
        <div className="grid sm:grid-cols-3 gap-8">
          <Step
            n={1}
            title="Send a referral"
            body={`Spot a customer interested in ${company.services.slice(0, 2).join(", ").toLowerCase()} or similar? Submit their details in under a minute.`}
          />
          <Step
            n={2}
            title="We book the appointment"
            body={
              payouts.appointment > 0
                ? `${company.name} contacts the customer and books a free survey. You earn ${formatCompanyMoney(company, payouts.appointment)} the moment that appointment is confirmed.`
                : `${company.name} contacts the customer and books a free survey — no chasing, no quoting, nothing more for you to do.`
            }
          />
          <Step
            n={3}
            title={
              payouts.appointment > 0
                ? "They go ahead — you get paid again"
                : "They go ahead — you get paid"
            }
            body={
              payouts.appointment > 0
                ? `If the customer goes ahead with the install, you earn an additional ${formatCompanyMoney(company, payouts.job)}. Up to ${formatCompanyMoney(company, payouts.total)} per referred customer.`
                : `If the customer goes ahead with the install, you earn ${formatCompanyMoney(company, payouts.job)} — for every customer you refer.`
            }
          />
        </div>
      </section>

      <section className="bg-white border-y border-slate-200 py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2
            className="text-2xl font-bold text-brand mb-4"
          >
            What {company.name} cover
          </h2>
          <ul className="flex flex-wrap gap-2 justify-center mt-6">
            {company.services.map((s) => (
              <li
                key={s}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-full text-sm"
              >
                {s}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-brand text-white">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h2
            className="text-3xl font-bold mb-4"
          >
            Ready to start earning?
          </h2>
          <p className="text-white/80 mb-8">
            Sign up takes 30 seconds. No fees, no contracts.
          </p>
          <Link
            href={`/${company.slug}/signup`}
            className="inline-block bg-brand-accent text-brand font-semibold px-6 py-3 rounded-lg"
          >
            Sign up now
          </Link>
        </div>
      </section>

      <footer className="text-center text-xs text-slate-500 py-8 px-6 space-y-2">
        {company.addressLine && <p>{company.addressLine}</p>}
        <p>
          {company.contactPhone && (
            <a
              href={`tel:${company.contactPhone}`}
              className="text-brand underline"
            >
              {company.contactPhone}
            </a>
          )}
          {company.contactPhone && company.contactEmail && " · "}
          <a
            href={`mailto:${company.contactEmail}`}
            className="text-brand underline"
          >
            {company.contactEmail}
          </a>
        </p>
        <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-slate-500 pt-4">
          <Link href="/help" className="hover:text-brand">
            Help
          </Link>
          <Link href="/terms" className="hover:text-brand">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-brand">
            Privacy
          </Link>
        </nav>
        <p className="text-slate-400">
          Programme powered by{" "}
          <Link href="/" className="underline">
            {platform.name}
          </Link>
        </p>
      </footer>
    </div>
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
