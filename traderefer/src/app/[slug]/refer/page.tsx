import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCompanyBySlug,
  formatCompanyMoney,
  payoutsForCompany,
} from "@/lib/company";
import { platform } from "@/lib/platform";
import { GoldenTicketForm } from "./GoldenTicketForm";

// Public "refer a friend" (Golden Ticket) page: /<slug>/refer. Anyone can
// refer with no account — they sign up only if a referral pays out.
export default async function GoldenTicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ done?: string }>;
}) {
  const { slug } = await params;
  const done = (await searchParams).done === "1";

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

      {done ? (
        <section className="max-w-xl mx-auto px-6 py-16 text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white text-2xl">
            ✓
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand mb-3">
            Thanks — your referral is in
          </h1>
          <p className="text-slate-600">
            {company.name} will be in touch with them shortly. If it goes
            ahead, you&apos;ll earn a reward — we&apos;ll message you with a
            link to claim it. Nothing more to do for now.
          </p>
        </section>
      ) : (
        <section className="max-w-xl mx-auto px-6 py-8 sm:py-12">
          <div className="mb-8">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Refer &amp; earn
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand mt-2 leading-tight">
              Know someone who needs {company.name}? Earn up to {total}.
            </h1>
            <p className="text-slate-600 mt-3">
              Refer them in under a minute — no account, no sign-up. If it goes
              ahead, you get paid. We&apos;ll only ask you to set up your
              details when there&apos;s a reward waiting for you.
            </p>
          </div>

          <GoldenTicketForm
            slug={company.slug}
            companyName={company.name}
            services={company.services}
          />
        </section>
      )}

      <footer className="text-center text-xs text-slate-400 py-10 px-6">
        Powered by{" "}
        <Link href="/" className="underline">
          {platform.name}
        </Link>
      </footer>
    </div>
  );
}
