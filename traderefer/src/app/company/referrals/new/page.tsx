import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth";
import { getCurrentCompany } from "@/lib/company";
import { companyWriteGate } from "@/lib/stripe";
import { AddLeadForm, type PartnerOption } from "./AddLeadForm";

export default async function AddLeadPage() {
  const user = await requireCompanyAdmin();
  const company = await getCurrentCompany();
  if (!company) return null;

  // Logging a lead is a write — a paused account can't. Send them to
  // billing rather than showing a form that would be rejected on submit.
  if (!companyWriteGate(company).canWrite) {
    return (
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold text-brand">Add a lead</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-900">
          <strong>Your account is paused.</strong> Reactivate to log new
          leads.
          <div className="mt-3">
            <Link
              href="/company/billing"
              className="btn-primary rounded-lg px-4 py-2 text-sm font-medium"
            >
              Reactivate →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const memberships = await prisma.membership.findMany({
    where: {
      companyId: user.companyId,
      role: { in: ["BUSINESS_PARTNER", "AMBASSADOR"] },
    },
    include: { user: { select: { fullName: true, businessName: true } } },
    orderBy: [{ user: { businessName: "asc" } }, { createdAt: "desc" }],
  });

  const partners: PartnerOption[] = memberships.map((m) => ({
    id: m.userId,
    label: m.user.businessName || m.user.fullName || "Unnamed partner",
    isAmbassador: m.role === "AMBASSADOR",
  }));

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href="/company/referrals"
          className="text-sm text-slate-600 underline"
        >
          ← Back to referrals
        </Link>
        <h1 className="text-2xl font-bold text-brand mt-2">Add a lead</h1>
        <p className="text-sm text-slate-600 mt-1">
          Log a lead that came in off-platform — a WhatsApp, a call, a text —
          and attribute it to the partner who sent it. It&apos;s tracked and
          paid out exactly like an app-submitted referral.
        </p>
      </div>

      <AddLeadForm
        services={company.services}
        partners={partners}
        companyName={company.name}
      />
    </div>
  );
}
