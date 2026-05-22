import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth";
import { getCurrentCompany, formatCompanyMoney } from "@/lib/company";
import { StatusBadge } from "@/components/StatusBadge";
import { ALL_STATUSES, STATUS_LABELS } from "@/lib/status";
import { updateReferralStatusAction } from "./actions";

export default async function CompanyReferralDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireCompanyAdmin();
  const company = await getCurrentCompany();
  if (!company) notFound();
  const { id } = await params;

  const referral = await prisma.referral.findUnique({
    where: { id },
    include: {
      partner: true,
      payouts: { orderBy: { createdAt: "asc" } },
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!referral || referral.companyId !== admin.companyId) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/company/referrals"
          className="text-sm text-slate-500 hover:underline"
        >
          ← All referrals
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-3 mt-2">
          <div>
            <h1
              className="text-2xl font-bold text-brand"
            >
              {referral.customerName}
            </h1>
            <p className="text-slate-600 text-sm">
              Referred by{" "}
              <span className="font-medium">
                {referral.partner.businessName}
              </span>{" "}
              ({referral.partner.fullName}) on{" "}
              {referral.createdAt.toLocaleDateString("en-GB")}
            </p>
          </div>
          <StatusBadge status={referral.status} />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Customer details">
            <Row label="Name" value={referral.customerName} />
            <Row
              label="Phone"
              value={
                <a
                  href={`tel:${referral.customerPhone}`}
                  className="text-brand underline"
                >
                  {referral.customerPhone}
                </a>
              }
            />
            <Row
              label="Email"
              value={
                <a
                  href={`mailto:${referral.customerEmail}`}
                  className="text-brand underline"
                >
                  {referral.customerEmail}
                </a>
              }
            />
            <Row
              label="Address"
              value={
                <>
                  {referral.addressLine1}
                  {referral.addressLine2 && (
                    <>
                      <br />
                      {referral.addressLine2}
                    </>
                  )}
                  <br />
                  {referral.city}, {referral.postcode}
                </>
              }
            />
            <Row label="Services" value={referral.services.join(", ")} />
            {referral.notes && (
              <Row
                label="Notes"
                value={<span className="whitespace-pre-wrap">{referral.notes}</span>}
              />
            )}
          </Card>

          <Card title="Status history">
            {referral.statusHistory.length === 0 ? (
              <p className="text-sm text-slate-500">
                No status changes recorded.
              </p>
            ) : (
              <ol className="space-y-2 text-sm">
                {referral.statusHistory.map((h) => (
                  <li key={h.id} className="flex gap-3">
                    <span className="text-slate-500 w-32 shrink-0">
                      {h.createdAt.toLocaleString("en-GB", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                    <span>
                      <StatusBadge status={h.toStatus} />
                      {h.note && (
                        <span className="text-slate-600 ml-2">— {h.note}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <Card title="Payouts">
            {referral.payouts.length === 0 ? (
              <p className="text-sm text-slate-500">
                No payouts yet. They&apos;ll be generated automatically when the
                status advances to Appointment booked or Job sold.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="pb-2">Reason</th>
                    <th className="pb-2">Amount</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {referral.payouts.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2">
                        {p.type === "APPOINTMENT"
                          ? "Appointment booked"
                          : "Job sold"}
                      </td>
                      <td className="py-2 font-medium">
                        {formatCompanyMoney(company, Number(p.amount))}
                      </td>
                      <td className="py-2">{p.status}</td>
                      <td className="py-2 text-slate-500">
                        {(p.paidAt || p.createdAt).toLocaleDateString("en-GB")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Update status">
            <form action={updateReferralStatusAction} className="space-y-3">
              <input type="hidden" name="referralId" value={referral.id} />

              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  New status
                </span>
                <select
                  name="toStatus"
                  defaultValue={referral.status}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                >
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Appointment date (if booked)
                </span>
                <input
                  type="datetime-local"
                  name="appointmentDate"
                  defaultValue={
                    referral.appointmentDate
                      ? referral.appointmentDate
                          .toISOString()
                          .slice(0, 16)
                      : ""
                  }
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Job value £ (if sold)
                </span>
                <input
                  type="number"
                  step="0.01"
                  name="jobValue"
                  defaultValue={
                    referral.jobValue ? String(referral.jobValue) : ""
                  }
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Rejection reason (if rejected)
                </span>
                <input
                  type="text"
                  name="rejectedReason"
                  defaultValue={referral.rejectedReason || ""}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Note (internal)
                </span>
                <textarea
                  name="note"
                  rows={2}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <button
                type="submit"
                className="w-full btn-primary rounded-lg py-2.5 font-medium"
              >
                Save status
              </button>
            </form>
          </Card>

          <Card title="Partner">
            <div className="text-sm space-y-1">
              <div className="font-medium">{referral.partner.businessName}</div>
              <div>{referral.partner.fullName}</div>
              <div>
                <a
                  href={`mailto:${referral.partner.email}`}
                  className="text-brand underline"
                >
                  {referral.partner.email}
                </a>
              </div>
              <div>
                <a
                  href={`tel:${referral.partner.phone ?? ""}`}
                  className="text-brand underline"
                >
                  {referral.partner.phone}
                </a>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
        {title}
      </h2>
      <div className="space-y-2 text-sm">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="col-span-2">{value}</dd>
    </div>
  );
}
