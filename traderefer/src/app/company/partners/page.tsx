import { prisma } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth";
import { getCurrentCompany, formatCompanyMoney } from "@/lib/company";
import { summarisePayouts } from "@/lib/payouts";

export default async function CompanyPartnersPage() {
  const user = await requireCompanyAdmin();
  const company = await getCurrentCompany();
  if (!company) return null;

  const partners = await prisma.user.findMany({
    where: { role: "PARTNER", companyId: user.companyId },
    include: {
      referrals: {
        where: { companyId: user.companyId },
        include: { payouts: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1
        className="text-2xl font-bold text-brand"
        style={{ fontFamily: "Fraunces, serif" }}
      >
        Partners
      </h1>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-2">Business</th>
              <th className="px-4 py-2 hidden sm:table-cell">Contact</th>
              <th className="px-4 py-2">Referrals</th>
              <th className="px-4 py-2">Pending</th>
              <th className="px-4 py-2">Paid</th>
              <th className="px-4 py-2 hidden md:table-cell">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {partners.map((p) => {
              const payouts = p.referrals.flatMap((r) => r.payouts);
              const s = summarisePayouts(payouts);
              return (
                <tr key={p.id} className="align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium">{p.businessName}</div>
                    <div className="text-xs text-slate-500">{p.fullName}</div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div>
                      <a
                        href={`mailto:${p.email}`}
                        className="text-brand underline text-xs"
                      >
                        {p.email}
                      </a>
                    </div>
                    <div className="text-xs text-slate-500">{p.phone}</div>
                  </td>
                  <td className="px-4 py-3">{p.referrals.length}</td>
                  <td className="px-4 py-3 text-amber-700">
                    {formatCompanyMoney(company, s.pendingTotal)}
                  </td>
                  <td className="px-4 py-3 text-emerald-700">
                    {formatCompanyMoney(company, s.paidTotal)}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-slate-500">
                    {p.createdAt.toLocaleDateString("en-GB")}
                  </td>
                </tr>
              );
            })}
            {partners.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No partners signed up yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
