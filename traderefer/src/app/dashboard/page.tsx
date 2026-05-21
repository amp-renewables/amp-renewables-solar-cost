import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePartner } from "@/lib/auth";
import { brand, formatMoney, totalPotentialPerJob } from "@/lib/brand";
import { summarisePayouts } from "@/lib/payouts";
import { StatusBadge } from "@/components/StatusBadge";

export default async function DashboardOverviewPage() {
  const user = await requirePartner();

  const [referrals, payouts] = await Promise.all([
    prisma.referral.findMany({
      where: { partnerId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.payout.findMany({
      where: { referral: { partnerId: user.id } },
    }),
  ]);

  const summary = summarisePayouts(payouts);
  const totalReferrals = await prisma.referral.count({
    where: { partnerId: user.id },
  });
  const jobsSold = await prisma.referral.count({
    where: {
      partnerId: user.id,
      status: { in: ["JOB_SOLD", "JOB_INSTALLED"] },
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-brand"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Hi {user.fullName?.split(" ")[0] || "there"}
          </h1>
          <p className="text-slate-600">
            Earn up to {formatMoney(totalPotentialPerJob())} per customer you
            refer to {brand.companyName}.
          </p>
        </div>
        <Link
          href="/dashboard/refer"
          className="btn-primary px-4 py-2.5 rounded-lg font-medium"
        >
          Refer a customer →
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total referrals" value={String(totalReferrals)} />
        <Stat label="Jobs sold" value={String(jobsSold)} />
        <Stat
          label="Pending payouts"
          value={formatMoney(summary.pendingTotal)}
          hint={`${summary.pendingCount} item${summary.pendingCount === 1 ? "" : "s"}`}
        />
        <Stat
          label="Paid to you"
          value={formatMoney(summary.paidTotal)}
          hint={`${summary.paidCount} item${summary.paidCount === 1 ? "" : "s"}`}
        />
      </div>

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
