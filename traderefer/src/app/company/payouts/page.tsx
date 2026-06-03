import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth";
import { getCurrentCompany, formatCompanyMoney } from "@/lib/company";
import { markPayoutPaidAction } from "./actions";
import { MaskedBankCell } from "./MaskedBankCell";

export default async function CompanyPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireCompanyAdmin();
  const company = await getCurrentCompany();
  if (!company) return null;

  const sp = await searchParams;
  const filter =
    sp.status === "PAID" || sp.status === "CANCELLED" ? sp.status : "PENDING";

  const scope = { referral: { companyId: user.companyId } };

  const [payouts, pendingAgg, paidAgg] = await Promise.all([
    prisma.payout.findMany({
      where: { status: filter, ...scope },
      include: {
        referral: {
          include: {
            partner: {
              select: {
                id: true,
                businessName: true,
                fullName: true,
                email: true,
                phone: true,
                bankAccountName: true,
                // Encrypted fields stay on the server. We send only the
                // last-N digits to the client for masked display; the
                // ciphertext is decrypted server-side via a reveal action.
                bankSortCodeLast2: true,
                bankAccountNumberLast4: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.payout.aggregate({
      _sum: { amount: true },
      _count: true,
      where: { status: "PENDING", ...scope },
    }),
    prisma.payout.aggregate({
      _sum: { amount: true },
      _count: true,
      where: { status: "PAID", ...scope },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1
        className="text-2xl font-bold text-brand"
      >
        Payouts
      </h1>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs uppercase tracking-wider text-slate-500">
            Pending
          </div>
          <div className="text-2xl font-bold text-brand mt-1">
            {formatCompanyMoney(company, Number(pendingAgg._sum.amount ?? 0))}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {pendingAgg._count} payment{pendingAgg._count === 1 ? "" : "s"} to
            send
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs uppercase tracking-wider text-slate-500">
            Paid (all time)
          </div>
          <div className="text-2xl font-bold text-brand mt-1">
            {formatCompanyMoney(company, Number(paidAgg._sum.amount ?? 0))}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {paidAgg._count} payment{paidAgg._count === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      <div className="flex gap-2 text-sm">
        <FilterTab
          href="/company/payouts?status=PENDING"
          active={filter === "PENDING"}
        >
          Pending
        </FilterTab>
        <FilterTab
          href="/company/payouts?status=PAID"
          active={filter === "PAID"}
        >
          Paid
        </FilterTab>
        <FilterTab
          href="/company/payouts?status=CANCELLED"
          active={filter === "CANCELLED"}
        >
          Cancelled
        </FilterTab>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-2">Partner</th>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Reason</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Bank details</th>
              <th className="px-4 py-2 hidden md:table-cell">Created</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payouts.map((p) => {
              const partner = p.referral.partner;
              const hasBank = Boolean(
                partner.bankSortCodeLast2 && partner.bankAccountNumberLast4,
              );
              return (
              <tr key={p.id}>
                <td className="px-4 py-3 font-medium">
                  {partner.businessName}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {p.referral.customerName}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {p.type === "APPOINTMENT" ? "Appointment booked" : "Job sold"}
                </td>
                <td className="px-4 py-3 font-medium">
                  {formatCompanyMoney(company, Number(p.amount))}
                </td>
                <td className="px-4 py-3 text-xs">
                  {hasBank ? (
                    <MaskedBankCell
                      partnerId={partner.id}
                      accountName={partner.bankAccountName}
                      sortCodeLast2={partner.bankSortCodeLast2}
                      accountNumberLast4={partner.bankAccountNumberLast4}
                    />
                  ) : (
                    <span className="text-rose-600">Not provided</span>
                  )}
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-slate-500">
                  {p.createdAt.toLocaleDateString("en-GB")}
                </td>
                <td className="px-4 py-3 text-right">
                  {p.status === "PENDING" ? (
                    <form
                      action={markPayoutPaidAction}
                      className="flex gap-2 justify-end"
                    >
                      <input type="hidden" name="payoutId" value={p.id} />
                      <input
                        type="text"
                        name="paymentRef"
                        placeholder="Ref"
                        className="rounded border border-slate-300 px-2 py-1 text-xs w-20"
                      />
                      <button
                        type="submit"
                        className="btn-primary text-xs px-3 py-1 rounded"
                      >
                        Mark paid
                      </button>
                    </form>
                  ) : p.status === "PAID" ? (
                    <span className="text-xs text-emerald-700">
                      Paid{p.paymentRef ? ` (${p.paymentRef})` : ""}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">Cancelled</span>
                  )}
                </td>
              </tr>
              );
            })}
            {payouts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Nothing here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterTab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-lg border ${active ? "bg-brand text-white border-transparent" : "bg-white border-slate-300 text-slate-700"}`}
    >
      {children}
    </Link>
  );
}
