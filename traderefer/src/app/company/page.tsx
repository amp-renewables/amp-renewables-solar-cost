import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth";
import { getCurrentCompany, formatCompanyMoney } from "@/lib/company";
import { platform, formatPrice } from "@/lib/platform";
import { StatusBadge } from "@/components/StatusBadge";

export default async function CompanyOverviewPage() {
  const user = await requireCompanyAdmin();
  const company = await getCurrentCompany();
  if (!company) return null;

  const [
    totalReferrals,
    activeReferrals,
    jobsSold,
    partnersCount,
    pendingPayouts,
    paidPayouts,
    recent,
  ] = await Promise.all([
    prisma.referral.count({ where: { companyId: user.companyId } }),
    prisma.referral.count({
      where: {
        companyId: user.companyId,
        status: { notIn: ["JOB_INSTALLED", "REJECTED"] },
      },
    }),
    prisma.referral.count({
      where: {
        companyId: user.companyId,
        status: { in: ["JOB_SOLD", "JOB_INSTALLED"] },
      },
    }),
    prisma.user.count({
      where: { companyId: user.companyId, role: "PARTNER" },
    }),
    prisma.payout.aggregate({
      _sum: { amount: true },
      where: {
        status: "PENDING",
        referral: { companyId: user.companyId },
      },
    }),
    prisma.payout.aggregate({
      _sum: { amount: true },
      where: {
        status: "PAID",
        referral: { companyId: user.companyId },
      },
    }),
    prisma.referral.findMany({
      where: { companyId: user.companyId },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { partner: true },
    }),
  ]);

  const partnerSignupUrl = `${platform.url}/${company.slug}/signup`;
  const trialDaysLeft =
    company.status === "TRIAL" && company.trialEndsAt
      ? Math.max(
          0,
          Math.ceil(
            (company.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
          ),
        )
      : null;

  return (
    <div className="space-y-8">
      {trialDaysLeft !== null && !company.isComped && (
        <div
          className={`border rounded-xl px-5 py-3 text-sm flex items-center justify-between gap-3 flex-wrap ${
            trialDaysLeft <= 3
              ? "bg-rose-50 border-rose-200 text-rose-900"
              : "bg-amber-50 border-amber-200 text-amber-900"
          }`}
        >
          <span>
            {trialDaysLeft === 0 ? (
              <>
                <strong>Your free trial ends today.</strong> Upgrade to keep
                full access — {formatPrice(platform.pricing.monthly)}/month.
              </>
            ) : (
              <>
                You&apos;re on a free trial — <strong>{trialDaysLeft}</strong>{" "}
                day{trialDaysLeft === 1 ? "" : "s"} left. After that it&apos;s{" "}
                {formatPrice(platform.pricing.monthly)}/month.
              </>
            )}
          </span>
          <Link
            href="/company/billing"
            className="bg-brand text-white font-semibold px-4 py-2 rounded-lg whitespace-nowrap hover:opacity-90"
          >
            Upgrade now →
          </Link>
        </div>
      )}
      {company.status !== "TRIAL" &&
        company.status !== "ACTIVE" &&
        !company.isComped && (
          <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-xl px-5 py-3 text-sm flex items-center justify-between gap-3 flex-wrap">
            <span>
              {company.status === "PAST_DUE" ? (
                <>
                  <strong>Your last payment failed.</strong> Update your card
                  to restore access.
                </>
              ) : (
                <>
                  <strong>Your subscription has ended.</strong> Resubscribe to
                  start using {platform.name} again.
                </>
              )}
            </span>
            <Link
              href="/company/billing"
              className="bg-brand text-white font-semibold px-4 py-2 rounded-lg whitespace-nowrap hover:opacity-90"
            >
              {company.status === "PAST_DUE"
                ? "Update card →"
                : "Resubscribe →"}
            </Link>
          </div>
        )}

      <div>
        <h1
          className="text-2xl font-bold text-brand"
        >
          Overview
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          Your partner signup page:{" "}
          <a
            href={`/${company.slug}/signup`}
            target="_blank"
            rel="noopener"
            className="text-brand underline"
          >
            {partnerSignupUrl}
          </a>
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Stat label="Total referrals" value={String(totalReferrals)} />
        <Stat label="Active" value={String(activeReferrals)} />
        <Stat label="Jobs sold" value={String(jobsSold)} />
        <Stat label="Partners" value={String(partnersCount)} />
        <Stat
          label="Pending payouts"
          value={formatCompanyMoney(
            company,
            Number(pendingPayouts._sum.amount ?? 0),
          )}
        />
        <Stat
          label="Paid out total"
          value={formatCompanyMoney(
            company,
            Number(paidPayouts._sum.amount ?? 0),
          )}
        />
      </div>

      {/* Internal-referral CTA. Hidden for comped accounts (they're
          already free; nothing to discount). Doesn't repeat the maths
          breakdown — /company/network is one click away for that. */}
      {!company.isComped && (
        <section className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 sm:p-7 flex items-start gap-6 flex-wrap">
          <div className="flex-1 min-w-[260px]">
            <p className="text-xs uppercase tracking-wider text-amber-400 font-bold mb-2">
              Refer & save
            </p>
            <h2 className="text-xl sm:text-2xl font-bold mb-2 leading-snug">
              Know another service business that should be on{" "}
              {platform.name}?
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Refer them with your link below. The moment they make their
              first payment, your {platform.name} subscription drops by
              25%. Refer 4 paying companies and it&apos;s{" "}
              <strong className="text-amber-400">free forever</strong> —
              for as long as they stay subscribed.
            </p>
          </div>
          <Link
            href="/company/network"
            className="bg-amber-500 text-slate-900 font-semibold px-5 py-2.5 rounded-lg whitespace-nowrap hover:bg-amber-400"
          >
            Get your link →
          </Link>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-brand">Recent referrals</h2>
          <Link
            href="/company/referrals"
            className="text-sm text-brand underline"
          >
            View all →
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
            <p className="text-slate-600 mb-4">No referrals yet.</p>
            <p className="text-sm text-slate-500">
              Share your signup link with tradesmen to start receiving
              referrals.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-2">Customer</th>
                  <th className="px-4 py-2">Partner</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2 hidden md:table-cell">Submitted</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recent.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-medium">{r.customerName}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {r.partner.businessName}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-slate-500">
                      {r.createdAt.toLocaleDateString("en-GB")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/company/referrals/${r.id}`}
                        className="text-brand underline text-sm"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="text-xs uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="text-2xl font-bold text-brand mt-1">{value}</div>
    </div>
  );
}
