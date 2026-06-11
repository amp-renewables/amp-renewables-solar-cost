import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { ALL_STATUSES, STATUS_LABELS } from "@/lib/status";
import type { ReferralStatus } from "@prisma/client";

export default async function CompanyReferralsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    q?: string;
    view?: string;
    deleted?: string;
  }>;
}) {
  const user = await requireCompanyAdmin();
  const sp = await searchParams;
  const statusFilter = ALL_STATUSES.includes(sp.status as ReferralStatus)
    ? (sp.status as ReferralStatus)
    : null;
  const q = (sp.q ?? "").trim();
  const showArchived = sp.view === "archived";
  const justDeleted = sp.deleted === "1";

  // Quick count of archived rows so the tab can show a number next to the
  // label. Avoids the 'is anything actually archived?' guessing game.
  const [referrals, archivedCount] = await Promise.all([
    prisma.referral.findMany({
      where: {
        companyId: user.companyId,
        // Default view hides archived; the 'Archived' tab inverts.
        archivedAt: showArchived ? { not: null } : null,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(q
          ? {
              OR: [
                { customerName: { contains: q, mode: "insensitive" } },
                { customerEmail: { contains: q, mode: "insensitive" } },
                { customerPhone: { contains: q } },
                { postcode: { contains: q, mode: "insensitive" } },
                {
                  partner: {
                    businessName: { contains: q, mode: "insensitive" },
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      include: { partner: true, payouts: true },
      take: 200,
    }),
    prisma.referral.count({
      where: { companyId: user.companyId, archivedAt: { not: null } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-brand">
          {showArchived ? "Archived referrals" : "All referrals"}
        </h1>
        <div className="flex gap-1 text-sm">
          <Link
            href="/company/referrals"
            className={`px-3 py-1.5 rounded-lg border ${
              !showArchived
                ? "bg-brand text-white border-transparent"
                : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            Active
          </Link>
          <Link
            href="/company/referrals?view=archived"
            className={`px-3 py-1.5 rounded-lg border ${
              showArchived
                ? "bg-brand text-white border-transparent"
                : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            Archived
            {archivedCount > 0 && (
              <span
                className={`ml-1.5 text-xs ${
                  showArchived ? "opacity-80" : "text-slate-500"
                }`}
              >
                ({archivedCount})
              </span>
            )}
          </Link>
        </div>
      </div>

      {justDeleted && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl px-5 py-3 text-sm">
          Referral deleted.
        </div>
      )}

      <form className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <label className="flex-1 min-w-[200px]">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Search
          </span>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Name, email, phone, postcode, business…"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Status
          </span>
          <select
            name="status"
            defaultValue={statusFilter ?? ""}
            className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="btn-primary px-4 py-2 rounded-lg text-sm font-medium"
        >
          Filter
        </button>
        <Link
          href="/company/referrals"
          className="text-sm text-slate-600 underline"
        >
          Clear
        </Link>
      </form>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2 hidden sm:table-cell">Partner</th>
              <th className="px-4 py-2 hidden md:table-cell">Services</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 hidden md:table-cell">Submitted</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {referrals.map((r) => (
              <tr key={r.id} className="align-top">
                <td className="px-4 py-3">
                  <div className="font-medium">{r.customerName}</div>
                  <div className="text-xs text-slate-500">
                    {r.customerPhone}
                  </div>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell text-slate-600">
                  {r.partner.businessName || r.partner.fullName}
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-slate-600 text-xs">
                  {r.services.join(", ")}
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
                    className="text-brand underline"
                  >
                    Open →
                  </Link>
                </td>
              </tr>
            ))}
            {referrals.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No referrals match those filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
