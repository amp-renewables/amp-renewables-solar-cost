import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { platform } from "@/lib/platform";
import { CustomerReferralForm } from "./CustomerReferralForm";

// Public, customer-facing referral page reached via a partner's shareable
// link: /<slug>/refer/<membershipId>. The customer submits their own
// details and the referral is credited to the partner behind the link.
export default async function PartnerReferralPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; code: string }>;
  searchParams: Promise<{ done?: string }>;
}) {
  const { slug, code } = await params;
  const done = (await searchParams).done === "1";

  const membership = await prisma.membership.findUnique({
    where: { id: code },
    include: {
      company: true,
      user: { select: { fullName: true, businessName: true } },
    },
  });

  // The link is only valid for a real referring membership whose company
  // matches the slug in the URL.
  if (
    !membership ||
    membership.company.slug !== slug ||
    (membership.role !== "BUSINESS_PARTNER" && membership.role !== "AMBASSADOR")
  ) {
    notFound();
  }

  const company = membership.company;
  const partnerName =
    membership.user.businessName || membership.user.fullName || "a partner";

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
            Thanks — that&apos;s all we need
          </h1>
          <p className="text-slate-600">
            {company.name} will be in touch shortly to arrange your free,
            no-obligation survey. Keep an eye on your phone.
          </p>
        </section>
      ) : (
        <section className="max-w-xl mx-auto px-6 py-8 sm:py-12">
          <div className="mb-8">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Recommended by {partnerName}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand mt-2 leading-tight">
              Get your free survey from {company.name}
            </h1>
            <p className="text-slate-600 mt-3">
              {partnerName} thought {company.name}
              {" "}could help. Leave your details and they&apos;ll call to
              arrange a free, no-obligation survey — no pressure, no cost.
            </p>
          </div>

          <CustomerReferralForm
            membershipId={membership.id}
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
