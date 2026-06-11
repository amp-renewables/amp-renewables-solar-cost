import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompanyBySlug, formatCompanyMoney } from "@/lib/company";
import { ratesForRole } from "@/lib/payouts";
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

  const businessRates = ratesForRole(company, "BUSINESS_PARTNER");
  const ambassadorRates = ratesForRole(company, "AMBASSADOR");
  const businessTotal = formatCompanyMoney(company, businessRates.total);
  const ambassadorTotal = formatCompanyMoney(company, ambassadorRates.total);
  // Headline shows the best rate on offer to whoever's allowed in.
  const headlineTotal = allowBusiness ? businessTotal : ambassadorTotal;

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <style
        dangerouslySetInnerHTML={{
          __html: `:root { --brand-primary: ${company.primaryColor}; --brand-accent: ${company.accentColor}; }`,
        }}
      />

      <div className="bg-brand text-white px-8 py-12 flex flex-col justify-between">
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
        <div className="my-12">
          <h1
            className="text-3xl sm:text-4xl font-bold mb-4 leading-tight"
          >
            Earn up to {headlineTotal} per customer you refer to{" "}
            {company.name}.
          </h1>
          <p className="text-emerald-100">
            Already a partner?{" "}
            <Link
              href="/login"
              className="font-medium underline"
              style={{ color: company.accentColor }}
            >
              Log in here
            </Link>
            .
          </p>
        </div>
        <p className="text-sm text-emerald-200">
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
                <span className="font-medium">{user.email}</span> and
                you&apos;re already part of this programme. This is exactly
                what new partners see.{" "}
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
                businessTotal={businessTotal}
                ambassadorTotal={ambassadorTotal}
              />
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-brand mb-2">
                Become a {company.name} partner
              </h2>
              <p className="text-slate-600 mb-6 text-sm">
                Sign up takes 30 seconds. No fees, no contracts.
              </p>
              <PartnerSignupForm
                slug={company.slug}
                inviteToken={inviteToken}
                allowBusiness={allowBusiness}
                allowAmbassador={allowAmbassador}
                businessTotal={businessTotal}
                ambassadorTotal={ambassadorTotal}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
