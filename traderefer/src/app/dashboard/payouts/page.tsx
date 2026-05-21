import { prisma } from "@/lib/db";
import { requirePartner } from "@/lib/auth";
import { formatMoney, brand } from "@/lib/brand";
import { summarisePayouts } from "@/lib/payouts";

export default async function PartnerPayoutsPage() {
  const user = await requirePartner();

  const payouts = await prisma.payout.findMany({
    where: { referral: { partnerId: user.id } },
    include: { referral: true },
    orderBy: { createdAt: "desc" },
  });

  const summary = summarisePayouts(payouts);

  return (
    <div className="space-y-6">
      <h1
        className="text-2xl font-bold text-brand"
        style={{ fontFamily: "Fraunces, serif" }}
      >
        Payouts
      </h1>

      <div className="grid sm:grid-cols-3 gap-4">
        <Stat label="Pending" value={formatMoney(summary.pendingTotal)} />
        <Stat label="Paid" value={formatMoney(summary.paidTotal)} />
        <Stat label="Total earned" value={formatMoney(summary.earnedTotal)} />
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
        Payouts are paid by bank transfer monthly. {formatMoney(brand.payouts.perAppointment)} per
        appointment booked, {formatMoney(brand.payouts.perJob)} per job sold.
      </div>

      {payouts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-600">
          No payouts yet — they&apos;ll appear here as soon as your referrals
          progress.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Reason</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 hidden sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payouts.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium">
                    {p.referral.customerName}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.type === "APPOINTMENT"
                      ? "Appointment booked"
                      : "Job sold"}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {formatMoney(Number(p.amount))}
                  </td>
                  <td className="px-4 py-3">
                    <PayoutBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-slate-500">
                    {(p.paidAt || p.createdAt).toLocaleDateString("en-GB")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="text-xs uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="text-2xl font-bold text-brand mt-1">{value}</div>
    </div>
  );
}

function PayoutBadge({ status }: { status: "PENDING" | "PAID" | "CANCELLED" }) {
  const styles = {
    PENDING: "bg-amber-100 text-amber-800",
    PAID: "bg-emerald-100 text-emerald-800",
    CANCELLED: "bg-slate-100 text-slate-500",
  } as const;
  const labels = {
    PENDING: "Pending",
    PAID: "Paid",
    CANCELLED: "Cancelled",
  } as const;
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
