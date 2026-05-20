import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePartner } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { formatMoney } from "@/lib/brand";
import { summarisePayouts } from "@/lib/payouts";

export default async function PartnerReferralsPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const user = await requirePartner();
  const sp = await searchParams;
  const justSubmitted = sp.submitted === "1";

  const referrals = await prisma.referral.findMany({
    where: { partnerId: user.id },
    orderBy: { createdAt: "desc" },
    include: { payouts: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1
          className="text-2xl font-bold text-brand"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          My referrals
        </h1>
        <Link
          href="/dashboard/refer"
          className="btn-primary px-4 py-2 rounded-lg text-sm font-medium"
        >
          + Refer a customer
        </Link>
      </div>

      {justSubmitted && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-4 py-3 text-sm">
          ✓ Referral submitted. We&apos;ll contact your customer within 1 working
          day.
        </div>
      )}

      {referrals.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-slate-600 mb-4">No referrals yet.</p>
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
                <th className="px-4 py-2 hidden sm:table-cell">Services</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Earnings</th>
                <th className="px-4 py-2 hidden md:table-cell">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {referrals.map((r) => {
                const s = summarisePayouts(r.payouts);
                return (
                  <tr key={r.id} className="align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.customerName}</div>
                      <div className="text-xs text-slate-500">{r.postcode}</div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-slate-600 text-xs">
                      {r.services.join(", ")}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {formatMoney(s.earnedTotal)}
                      </div>
                      {s.pendingTotal > 0 && (
                        <div className="text-xs text-amber-700">
                          {formatMoney(s.pendingTotal)} pending
                        </div>
                      )}
                      {s.paidTotal > 0 && (
                        <div className="text-xs text-emerald-700">
                          {formatMoney(s.paidTotal)} paid
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-slate-500">
                      {r.createdAt.toLocaleDateString("en-GB")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
