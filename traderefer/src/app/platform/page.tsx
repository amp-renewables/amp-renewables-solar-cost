import Link from "next/link";
import { prisma } from "@/lib/db";
import { platform, formatPrice } from "@/lib/platform";

export default async function PlatformOverviewPage() {
  const [companies, totalUsers, totalReferrals] = await Promise.all([
    prisma.company.findMany({
      include: {
        _count: { select: { users: true, referrals: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count(),
    prisma.referral.count(),
  ]);

  const trialCount = companies.filter((c) => c.status === "TRIAL").length;
  const activeCount = companies.filter((c) => c.status === "ACTIVE").length;
  const compedCount = companies.filter((c) => c.isComped).length;
  const billedMrr = activeCount - compedCount;

  return (
    <div className="space-y-8">
      <h1
        className="text-2xl font-bold text-brand"
      >
        {platform.name} platform overview
      </h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Companies (total)" value={String(companies.length)} />
        <Stat label="On trial" value={String(trialCount)} />
        <Stat label="Active" value={String(activeCount)} />
        <Stat
          label="MRR (estimated)"
          value={formatPrice(billedMrr * platform.pricing.monthly)}
          hint={`${billedMrr} billable @ ${formatPrice(platform.pricing.monthly)}`}
        />
        <Stat label="Total users" value={String(totalUsers)} />
        <Stat label="Total referrals" value={String(totalReferrals)} />
      </div>

      <section>
        <h2 className="text-lg font-semibold text-brand mb-3">Companies</h2>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-2">Company</th>
                <th className="px-4 py-2">Slug</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Users</th>
                <th className="px-4 py-2">Referrals</th>
                <th className="px-4 py-2 hidden md:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {companies.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-slate-500">
                      {c.contactEmail}
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
                    <span className="text-xs font-medium">
                      {c.status}
                      {c.isComped && " (comped)"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{c._count.users}</td>
                  <td className="px-4 py-3">{c._count.referrals}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-slate-500">
                    {c.createdAt.toLocaleDateString("en-GB")}
                  </td>
                </tr>
              ))}
              {companies.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No companies have signed up yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
