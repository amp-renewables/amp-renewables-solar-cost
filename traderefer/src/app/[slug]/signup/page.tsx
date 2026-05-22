import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCompanyBySlug,
  formatCompanyMoney,
  payoutsForCompany,
} from "@/lib/company";
import { getSessionUser, landingPathForRole } from "@/lib/auth";
import { PartnerSignupForm } from "./PartnerSignupForm";

export default async function PartnerSignupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const company = await getCompanyBySlug(slug);
  if (!company) notFound();

  // Allow logged-in users to view this page so company admins can QA their
  // own partner-signup flow without logging out. The form will still
  // bounce a logged-in submitter via the action's session check, and we
  // show a banner up top so admins know what they're looking at.
  const user = await getSessionUser();

  const payouts = payoutsForCompany(company);

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <style
        dangerouslySetInnerHTML={{
          __html: `:root { --brand-primary: ${company.primaryColor}; --brand-accent: ${company.accentColor}; }`,
        }}
      />

      <div className="bg-brand text-white px-8 py-12 flex flex-col justify-between">
        <div className="flex items-center gap-3">
          {company.logoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={company.logoUrl}
              alt={company.name}
              className="h-10 w-auto bg-white/10 p-1 rounded"
            />
          ) : (
            <span className="font-bold text-xl">{company.name}</span>
          )}
        </div>
        <div className="my-12">
          <h1
            className="text-3xl sm:text-4xl font-bold mb-4 leading-tight"
          >
            Earn up to {formatCompanyMoney(company, payouts.total)} per customer
            you refer to {company.name}.
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
          {user && (
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-medium">Preview mode</p>
              <p className="mt-1 text-amber-800">
                You&apos;re viewing this page as{" "}
                <span className="font-medium">{user.email}</span>. This is
                exactly what new partners see — but the form below won&apos;t
                submit (you&apos;re already logged in).{" "}
                <Link
                  href={landingPathForRole(user.role)}
                  className="underline font-medium"
                >
                  Back to {user.role === "PARTNER" ? "dashboard" : "admin"}
                </Link>
                .
              </p>
            </div>
          )}
          <h2 className="text-2xl font-bold text-brand mb-2">
            Become a {company.name} partner
          </h2>
          <p className="text-slate-600 mb-6 text-sm">
            Sign up takes 30 seconds. No fees, no contracts.
          </p>
          <PartnerSignupForm slug={company.slug} />
        </div>
      </div>
    </div>
  );
}
