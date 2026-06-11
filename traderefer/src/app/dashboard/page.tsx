import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePartner } from "@/lib/auth";
import { getCurrentCompany, formatCompanyMoney } from "@/lib/company";
import { platform, formatPrice } from "@/lib/platform";
import { ratesForRole, summarisePayouts } from "@/lib/payouts";
import { StatusBadge } from "@/components/StatusBadge";

export default async function DashboardOverviewPage() {
  const user = await requirePartner();
  const company = await getCurrentCompany();
  if (!company) return null;

  const [referrals, payouts, fullUser] = await Promise.all([
    prisma.referral.findMany({
      where: { partnerId: user.id, companyId: user.companyId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.payout.findMany({
      where: { referral: { partnerId: user.id, companyId: user.companyId } },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { bankSortCode: true, bankAccountNumber: true },
    }),
  ]);
  const hasBankDetails = Boolean(
    fullUser?.bankSortCode && fullUser?.bankAccountNumber,
  );
  const hasPendingPayouts = payouts.some((p) => p.status === "PENDING");

  const summary = summarisePayouts(payouts);
  const totalReferrals = await prisma.referral.count({
    where: { partnerId: user.id, companyId: user.companyId },
  });
  const jobsSold = await prisma.referral.count({
    where: {
      partnerId: user.id,
      companyId: user.companyId,
      status: { in: ["JOB_SOLD", "JOB_INSTALLED"] },
    },
  });

  const payoutRules = ratesForRole(
    company,
    user.role === "AMBASSADOR" ? "AMBASSADOR" : "BUSINESS_PARTNER",
  );

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-brand"
          >
            Hi {user.fullName?.split(" ")[0] || "there"}
          </h1>
          <p className="text-slate-600">
            Earn up to {formatCompanyMoney(company, payoutRules.total)} per
            customer you refer to {company.name}.
          </p>
        </div>
        <Link
          href="/dashboard/refer"
          className="btn-primary px-4 py-2.5 rounded-lg font-medium"
        >
          Refer a customer →
        </Link>
      </div>

      {!hasBankDetails && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-start gap-3 flex-wrap">
          <div className="flex-1 min-w-[260px]">
            <p className="font-semibold text-amber-900">
              Add your bank details so you can get paid
            </p>
            <p className="text-sm text-amber-800 mt-1">
              {company.name} pays partners by bank transfer.{" "}
              {hasPendingPayouts
                ? "You've got payouts pending — "
                : "When your first appointment is booked, you'll need these — "}
              add your details to receive them.
            </p>
          </div>
          <Link
            href="/dashboard/settings"
            className="btn-primary px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap"
          >
            Add bank details →
          </Link>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total referrals" value={String(totalReferrals)} />
        <Stat label="Jobs sold" value={String(jobsSold)} />
        <Stat
          label="Pending payouts"
          value={formatCompanyMoney(company, summary.pendingTotal)}
          hint={`${summary.pendingCount} item${summary.pendingCount === 1 ? "" : "s"}`}
        />
        <Stat
          label="Paid to you"
          value={formatCompanyMoney(company, summary.paidTotal)}
          hint={`${summary.paidCount} item${summary.paidCount === 1 ? "" : "s"}`}
        />
      </div>

      <section className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 sm:p-8 flex items-start gap-6 flex-wrap">
        <div className="flex-1 min-w-[260px]">
          <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
            Run your own programme
          </p>
          <h2
            className="text-xl sm:text-2xl font-bold mb-2"
          >
            You&apos;ve got customers too. Get paid to refer them.
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            {user.businessName ? `Set ${user.businessName} up on` : "Set up"}{" "}
            {platform.name}{" "}
            and let other tradesmen send customers your way. Same setup
            you&apos;re using here — branded landing page, partner
            dashboards, automatic payouts. {formatPrice(platform.pricing.monthly)}
            /month after a {platform.pricing.trialDays}-day free trial.
          </p>
        </div>
        <a
          href={`${platform.url || ""}/signup`}
          target="_blank"
          className="bg-white text-slate-900 font-semibold px-5 py-2.5 rounded-lg whitespace-nowrap hover:bg-slate-100"
        >
          Start free trial →
        </a>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-brand">Recent referrals</h2>
          <Link
            href="/dashboard/referrals"
            className="text-sm text-brand underline"
          >
            View all →
          </Link>
        </div>
        {referrals.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
            <p className="text-slate-600 mb-4">
              You haven&apos;t referred anyone yet. It takes about a minute.
            </p>
            <Link
              href="/dashboard/refer"
              className="btn-primary inline-block px-4 py-2 rounded-lg text-sm font-medium"
            >
              Send your first referral
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-2">Customer</th>
                  <th className="px-4 py-2">Services</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {referrals.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-medium">{r.customerName}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {r.services.join(", ")}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {r.createdAt.toLocaleDateString("en-GB")}
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

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="text-xs uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="text-2xl font-bold text-brand mt-1">{value}</div>
      {hint && <div className="text-xs text-slate-500 mt-1">{hint}</div>}
    </div>
  );
}
