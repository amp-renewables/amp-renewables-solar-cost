import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCompanyBySlug,
  formatCompanyMoney,
  payoutsForCompany,
} from "@/lib/company";
import { getSessionUser, landingPathForRole } from "@/lib/auth";
import { PartnerSignupForm, JoinProgrammeForm } from "./PartnerSignupForm";

export default async function PartnerSignupPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ invite?: string }>;
}) {
  const { slug } = await params;
  const company = await getCompanyBySlug(slug);
  if (!company) notFound();

  // Optional invite token from a bulk SMS/email invitation. Passed
  // through the form so the signup action can attribute the conversion
  // back to the specific invite. Invalid/expired tokens are harmless —
  // attribution just silently doesn't happen.
  const sp = await searchParams;
  const inviteToken = sp.invite?.trim() || null;

  const user = await getSessionUser();
  // Three audiences: anonymous visitors get the signup form; logged-in
  // users who already belong here get a preview banner (admins QA this
  // page); logged-in users who DON'T belong here get a one-click join.
  const alreadyMember = user
    ? user.memberships.some((m) => m.companyId === company.id)
    : false;

  // Mirror of the server-side rule in actions.ts: business partners are
  // accepted unless explicitly off AND ambassadors are on.
  const allowBusiness =
    company.acceptsBusinessPartners || !company.acceptsAmbassadors;
  const allowAmbassador = company.acceptsAmbassadors;

  // Same rates for every referrer type — one honest headline number.
  const payouts = payoutsForCompany(company);
  const headlineTotal = formatCompanyMoney(company, payouts.total);

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <style
        dangerouslySetInnerHTML={{
          __html: `:root { --brand-primary: ${company.primaryColor}; --brand-accent: ${company.accentColor}; }`,
        }}
      />

      <div className="bg-brand text-white px-8 py-12 flex flex-col">
        <div className="flex items-center gap-3">
          {/* Dark panel — prefer the light/inverse logo. If only a standard
              logo is uploaded, fall back to company name as text rather
              than risk the dark logo disappearing into the background. */}
          {company.logoUrlLight ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={company.logoUrlLight}
              alt={company.name}
              className="h-10 w-auto"
            />
          ) : (
            <span className="font-bold text-xl">{company.name}</span>
          )}
        </div>

        {/* Centre the pitch in the space between logo and contact line so
            it doesn't float adrift on tall viewports. */}
        <div className="flex-1 flex flex-col justify-center max-w-md py-12">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70 mb-5">
            Partner programme
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold mb-8 leading-[1.1]">
            Earn up to {headlineTotal} per customer you refer to{" "}
            {company.name}.
          </h1>

          {/* The deal, in numbers — the conversion moment. The figures are
              the loudest thing on the panel, paired tightly with their
              label. Adapts to sold-jobs-only deals (zero appointment rate). */}
          <div className="space-y-5 mb-9">
            {payouts.appointment > 0 ? (
              <>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-extrabold leading-none">
                    {formatCompanyMoney(company, payouts.appointment)}
                  </span>
                  <span className="text-white/80">
                    when the appointment is booked
                  </span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-extrabold leading-none">
                    {formatCompanyMoney(company, payouts.job)}
                  </span>
                  <span className="text-white/80">more when the job sells</span>
                </div>
              </>
            ) : (
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-extrabold leading-none">
                  {formatCompanyMoney(company, payouts.job)}
                </span>
                <span className="text-white/80">when the job sells</span>
              </div>
            )}
          </div>

          <ul className="space-y-2.5 text-sm text-white/80 mb-8">
            {[
              "Free to join — signing up takes 30 seconds",
              "Every referral tracked — see exactly where each one is",
              "Paid by bank transfer; your details are encrypted",
            ].map((point) => (
              <li key={point} className="flex items-start gap-2.5">
                <Check />
                <span>{point}</span>
              </li>
            ))}
          </ul>

          {/* White, not accentColor — some companies' accents land
              around 3:1 against their own dark primary, too low for
              small text. White passes on any brand colour. */}
          <p className="text-white/80">
            Already a partner?{" "}
            <Link href="/login" className="font-medium underline text-white">
              Log in here
            </Link>
            .
          </p>
        </div>

        <p className="text-sm text-white/60">
          Questions? Email{" "}
          <a href={`mailto:${company.contactEmail}`} className="underline">
            {company.contactEmail}
          </a>
          .
        </p>
      </div>

      <div className="px-6 py-10 sm:px-12 flex items-center">
        <div className="w-full max-w-md mx-auto">
          {user && alreadyMember && (
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-medium">Preview mode</p>
              <p className="mt-1 text-amber-800">
                You&apos;re viewing this page as{" "}
                <span className="font-medium">{user.email}</span>
                {" and "}you&apos;re already part of this programme. This is
                exactly what new partners see.{" "}
                <Link
                  href={landingPathForRole(user.role)}
                  className="underline font-medium"
                >
                  Back to{" "}
                  {user.role === "COMPANY_ADMIN" ? "admin" : "dashboard"}
                </Link>
                .
              </p>
            </div>
          )}

          {user && !alreadyMember ? (
            <>
              <h2 className="text-2xl font-bold text-brand mb-2">
                Join {company.name}&apos;s programme
              </h2>
              <p className="text-slate-600 mb-6 text-sm">
                You&apos;re logged in as{" "}
                <span className="font-medium">{user.email}</span> — one
                click adds this programme to your existing account. No new
                password, no second login.
              </p>
              <JoinProgrammeForm
                slug={company.slug}
                companyName={company.name}
                inviteToken={inviteToken}
                allowBusiness={allowBusiness}
                allowAmbassador={allowAmbassador}
              />
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-brand mb-2">
                Join the {company.name} referral programme
              </h2>
              <p className="text-slate-600 mb-6 text-sm">
                Sign up takes 30 seconds. No fees, no contracts.
              </p>
              <PartnerSignupForm
                slug={company.slug}
                inviteToken={inviteToken}
                allowBusiness={allowBusiness}
                allowAmbassador={allowAmbassador}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Crisp, consistently-sized tick for the benefit list. Replaces the thin
// grey ✓ glyph, which rendered weakly at body size. White stroke reads
// cleanly on any tenant's dark primary (some accents are too low-contrast).
function Check() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="mt-0.5 h-4 w-4 shrink-0 text-white"
    >
      <path
        d="M4.5 10.5l3.5 3.5 7.5-8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
