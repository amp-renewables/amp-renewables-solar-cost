import Link from "next/link";
import { prisma } from "@/lib/db";
import { platform, formatPrice } from "@/lib/platform";

const STATUS_COLORS: Record<string, string> = {
  TRIAL: "bg-amber-100 text-amber-800",
  ACTIVE: "bg-emerald-100 text-emerald-800",
  PAST_DUE: "bg-orange-100 text-orange-800",
  CANCELLED: "bg-slate-200 text-slate-700",
};

export default async function PlatformCompaniesPage() {
  const companies = await prisma.company.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          users: true,
          referrals: true,
        },
      },
      users: {
        where: { role: "PARTNER" },
        select: { id: true },
      },
      referrals: {
        select: {
          payouts: {
            where: { status: "PENDING" },
            select: { amount: true },
          },
        },
      },
    },
  });

  // Aggregate pending payouts per company in JS (small dataset; avoids
  // a second round-trip to Postgres).
  const rows = companies.map((c) => {
    const partnerCount = c.users.length;
    const pendingPayouts = c.referrals
      .flatMap((r) => r.payouts)
      .reduce((sum, p) => sum + Number(p.amount), 0);
    return { c, partnerCount, pendingPayouts };
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1
          className="text-2xl font-bold text-brand"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          Companies on {platform.name}
        </h1>
        <span className="text-sm text-slate-500">
          {companies.length} {companies.length === 1 ? "company" : "companies"}
        </span>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Partners</th>
              <th className="px-4 py-3 text-right">Referrals</th>
              <th className="px-4 py-3 text-right">Pending payouts</th>
              <th className="px-4 py-3 hidden md:table-cell">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ c, partnerCount, pendingPayouts }) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-slate-500">
                    <a
                      href={`mailto:${c.contactEmail}`}
                      className="hover:text-brand"
                    >
                      {c.contactEmail}
                    </a>
                    {c.contactPhone && (
                      <>
                        <span className="mx-1.5 text-slate-300">·</span>
                        <span>{c.contactPhone}</span>
                      </>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/${c.slug}`}
                    target="_blank"
                    className="text-brand underline text-xs font-mono"
                  >
                    /{c.slug}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      STATUS_COLORS[c.status] ?? "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {c.status}
                  </span>
                  {c.isComped && (
                    <span className="ml-1.5 inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-800">
                      comped
                    </span>
                  )}
                  {c.status === "TRIAL" && c.trialEndsAt && (
                    <div className="text-xs text-slate-500 mt-1">
                      ends {c.trialEndsAt.toLocaleDateString("en-GB")}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {partnerCount}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {c._count.referrals}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {pendingPayouts > 0 ? (
                    <span className="font-medium">
                      {c.currencySymbol}
                      {pendingPayouts.toLocaleString("en-GB", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-slate-500 text-xs">
                  {c.createdAt.toLocaleDateString("en-GB")}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-slate-500"
                >
                  No companies have signed up yet.
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-slate-50 text-xs text-slate-600">
              <tr>
                <td className="px-4 py-2 font-medium" colSpan={3}>
                  Totals
                </td>
                <td className="px-4 py-2 text-right tabular-nums font-medium">
                  {rows.reduce((s, r) => s + r.partnerCount, 0)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums font-medium">
                  {rows.reduce((s, r) => s + r.c._count.referrals, 0)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums font-medium">
                  {formatPrice(
                    rows.reduce((s, r) => s + r.pendingPayouts, 0),
                  )}
                </td>
                <td className="px-4 py-2 hidden md:table-cell" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
