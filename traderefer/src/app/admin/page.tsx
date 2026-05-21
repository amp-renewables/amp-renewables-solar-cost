import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/brand";
import { StatusBadge } from "@/components/StatusBadge";

export default async function AdminOverviewPage() {
  const [
    totalReferrals,
    activeReferrals,
    jobsSold,
    partnersCount,
    pendingPayouts,
    paidPayouts,
    recent,
  ] = await Promise.all([
    prisma.referral.count(),
    prisma.referral.count({
      where: {
        status: {
          notIn: ["JOB_INSTALLED", "REJECTED"],
        },
      },
    }),
    prisma.referral.count({
      where: { status: { in: ["JOB_SOLD", "JOB_INSTALLED"] } },
    }),
    prisma.user.count({ where: { role: "PARTNER" } }),
    prisma.payout.aggregate({
      _sum: { amount: true },
      where: { status: "PENDING" },
    }),
    prisma.payout.aggregate({
      _sum: { amount: true },
      where: { status: "PAID" },
    }),
    prisma.referral.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { partner: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <h1
        className="text-2xl font-bold text-brand"
        style={{ fontFamily: "Fraunces, serif" }}
      >
        Admin overview
      </h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total referrals" value={String(totalReferrals)} />
        <Stat label="Active" value={String(activeReferrals)} />
        <Stat label="Jobs sold" value={String(jobsSold)} />
        <Stat label="Partners" value={String(partnersCount)} />
        <Stat
          label="Pending payouts"
          value={formatMoney(Number(pendingPayouts._sum.amount ?? 0))}
        />
        <Stat
          label="Paid out total"
          value={formatMoney(Number(paidPayouts._sum.amount ?? 0))}
        />
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-brand">Recent referrals</h2>
          <Link href="/admin/referrals" className="text-sm text-brand underline">
            View all →
          </Link>
        </div>
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
                      href={`/admin/referrals/${r.id}`}
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
