import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCompanyBySlug,
  formatCompanyMoney,
  payoutsForCompany,
} from "@/lib/company";
import { platform } from "@/lib/platform";
import { GetLinkForm } from "./GetLinkForm";

// "Get your referral link" (Build B): a past customer / advocate requests
// their own shareable link with no account. They forward it; whoever fills
// it in is credited to them; they sign up only if it pays out.
export default async function GetReferralLinkPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const company = await getCompanyBySlug(slug);
  if (!company) notFound();

  const total = formatCompanyMoney(company, payoutsForCompany(company).total);

  const themeVars = `
    :root {
      --brand-primary: ${company.primaryColor};
      --brand-accent: ${company.accentColor};
    }
  `;

  return (
    <div className="min-h-screen">
      <style dangerouslySetInnerHTML={{ __html: themeVars }} />

      <header className="px-6 py-4 max-w-3xl mx-auto flex items-center gap-3">
        {company.logoUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={company.logoUrl} alt={company.name} className="h-10 w-auto" />
        ) : (
          <span className="font-bold text-xl text-brand">{company.name}</span>
        )}
      </header>

      <section className="max-w-xl mx-auto px-6 py-8 sm:py-12">
        <div className="mb-8">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Refer &amp; earn
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand mt-2 leading-tight">
            Refer someone to {company.name} and earn up to {total}
          </h1>
          <p className="text-slate-600 mt-3">
            Get your own link to share — no account, no forms about anyone
            else. Send it to anyone who might want {company.name}; if they go
            ahead, you get paid. You&apos;ll only set up your details when
            there&apos;s a reward waiting for you.
          </p>
        </div>

        <GetLinkForm slug={company.slug} companyName={company.name} />
      </section>

      <footer className="text-center text-xs text-slate-400 py-10 px-6">
        Powered by{" "}
        <Link href="/" className="underline">
          {platform.name}
        </Link>
      </footer>
    </div>
  );
}
