import Link from "next/link";
import { requireCompanyAdmin } from "@/lib/auth";
import { getCurrentCompany } from "@/lib/company";
import { platform, formatPrice } from "@/lib/platform";
import { prisma } from "@/lib/db";
import { getReferralStanding } from "@/lib/referral";
import { CopyButton } from "./CopyButton";

export default async function CompanyNetworkPage() {
  const admin = await requireCompanyAdmin();
  const company = await getCurrentCompany();
  if (!company) return null;

  // Pull every company this admin's company has referred, plus their
  // current status so we can show "trialing / qualifying / discount
  // active / churned" without further round-trips.
  const referredCompanies = await prisma.company.findMany({
    where: { referredByCompanyId: admin.companyId },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      referralQualifiedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const standing = await getReferralStanding(company.id);
  const monthlyPrice = platform.pricing.monthly;
  const discountedPrice = Math.max(
    0,
    monthlyPrice - (monthlyPrice * standing.percentOff) / 100,
  );
  const monthlySavings = monthlyPrice - discountedPrice;
  const referralUrl = `${platform.url}/signup?ref=${company.slug}`;

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-brand">Your referral network</h1>
        <p className="text-sm text-slate-600 mt-1">
          Refer other businesses to {platform.name} and we&apos;ll knock 25%
          off your subscription for each one that becomes a paying customer.
          Refer 4 and it&apos;s free.
        </p>
      </div>

      {/* ─── Discount summary card ─────────────────────────────────── */}
      <section
        className={`rounded-xl p-6 ${
          standing.percentOff > 0
            ? "bg-gradient-to-br from-slate-900 to-slate-800 text-white"
            : "bg-white border border-slate-200"
        }`}
      >
        <div className="grid sm:grid-cols-3 gap-6">
          <div>
            <div
              className={
                standing.percentOff > 0
                  ? "text-xs uppercase tracking-wider text-slate-400 font-semibold"
                  : "text-xs uppercase tracking-wider text-slate-500 font-semibold"
              }
            >
              Active referrals
            </div>
            <div
              className={`text-3xl font-extrabold mt-1 ${
                standing.percentOff > 0 ? "text-white" : "text-brand"
              }`}
            >
              {standing.qualifyingCount}
            </div>
            <div
              className={
                standing.percentOff > 0
                  ? "text-xs text-slate-400 mt-1"
                  : "text-xs text-slate-500 mt-1"
              }
            >
              {standing.tier < 4
                ? `${4 - standing.tier} more for free`
                : "Subscription is free"}
            </div>
          </div>

          <div>
            <div
              className={
                standing.percentOff > 0
                  ? "text-xs uppercase tracking-wider text-slate-400 font-semibold"
                  : "text-xs uppercase tracking-wider text-slate-500 font-semibold"
              }
            >
              Current discount
            </div>
            <div
              className={`text-3xl font-extrabold mt-1 ${
                standing.percentOff > 0 ? "text-amber-400" : "text-brand"
              }`}
            >
              {standing.percentOff}%
            </div>
            <div
              className={
                standing.percentOff > 0
                  ? "text-xs text-slate-400 mt-1"
                  : "text-xs text-slate-500 mt-1"
              }
            >
              25% per active paying referral
            </div>
          </div>

          <div>
            <div
              className={
                standing.percentOff > 0
                  ? "text-xs uppercase tracking-wider text-slate-400 font-semibold"
                  : "text-xs uppercase tracking-wider text-slate-500 font-semibold"
              }
            >
              Saving you
            </div>
            <div
              className={`text-3xl font-extrabold mt-1 ${
                standing.percentOff > 0 ? "text-amber-400" : "text-brand"
              }`}
            >
              {formatPrice(monthlySavings)}
            </div>
            <div
              className={
                standing.percentOff > 0
                  ? "text-xs text-slate-400 mt-1"
                  : "text-xs text-slate-500 mt-1"
              }
            >
              per month off {formatPrice(monthlyPrice)}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Shareable link ────────────────────────────────────────── */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="font-semibold text-brand mb-3">Your referral link</h2>
        <p className="text-sm text-slate-600 mb-4">
          Share this with anyone running a service business who could use
          their own referral programme. They get 14 days to try it free; you
          get 25% off the moment they make their first payment.
        </p>
        <div className="flex gap-2 items-stretch flex-wrap">
          <div className="flex-1 min-w-[260px] bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 font-mono text-sm break-all">
            {referralUrl}
          </div>
          <CopyButton content={referralUrl} label="Copy link" />
        </div>
      </section>

      {/* ─── List of referred companies ─────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
          Who you&apos;ve referred ({referredCompanies.length})
        </h2>
        {referredCompanies.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
            Nobody yet. Share your link with someone running a service
            business and they&apos;ll show up here once they sign up.
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-2">Company</th>
                  <th className="px-4 py-2">Joined</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2 hidden sm:table-cell">
                    Your saving
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {referredCompanies.map((c) => {
                  const label = labelForState(c);
                  return (
                    <tr key={c.id}>
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {c.createdAt.toLocaleDateString("en-GB")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${label.classes}`}
                        >
                          {label.text}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 hidden sm:table-cell">
                        {label.contributes
                          ? `+£${(monthlyPrice * 0.25).toFixed(2)}/mo off`
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-slate-500">
        Discount only counts paying referrals — trial-only signups don&apos;t
        unlock it. If a referred company cancels, you lose that 25% slice.
        Refer 5+ to insure yourself against churn.
      </p>
    </div>
  );
}

function labelForState(c: {
  status: string;
  referralQualifiedAt: Date | null;
}): { text: string; classes: string; contributes: boolean } {
  if (c.status === "CANCELLED") {
    return {
      text: "Churned",
      classes: "bg-slate-200 text-slate-700",
      contributes: false,
    };
  }
  if (!c.referralQualifiedAt) {
    if (c.status === "TRIAL") {
      return {
        text: "Trialing",
        classes: "bg-amber-100 text-amber-800",
        contributes: false,
      };
    }
    return {
      text: "Qualifying",
      classes: "bg-sky-100 text-sky-800",
      contributes: false,
    };
  }
  return {
    text: "Discount active",
    classes: "bg-emerald-100 text-emerald-800",
    contributes: true,
  };
}
