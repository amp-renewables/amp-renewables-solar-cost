import { notFound } from "next/navigation";
import { requirePartner } from "@/lib/auth";
import { getCurrentCompany, formatCompanyMoney } from "@/lib/company";
import { ratesForRole } from "@/lib/payouts";
import { ReferForm } from "./ReferForm";

export default async function ReferPage() {
  const user = await requirePartner();
  const company = await getCurrentCompany();
  if (!company) notFound();
  // Ambassadors see ambassador money, business partners see theirs.
  const payouts = ratesForRole(
    company,
    user.role === "AMBASSADOR" ? "AMBASSADOR" : "BUSINESS_PARTNER",
  );

  return (
    <div className="max-w-2xl mx-auto">
      <h1
        className="text-2xl font-bold text-brand mb-2"
      >
        Refer a customer
      </h1>
      <p className="text-slate-600 mb-6 text-sm">
        Fill in your customer&apos;s details. {company.name}{" "}
        will contact them within 1 working day to book a free survey.
        You&apos;ll earn{" "}
        {formatCompanyMoney(company, payouts.appointment)} the moment the
        appointment is confirmed, and an additional{" "}
        {formatCompanyMoney(company, payouts.job)} if the job sells — up to{" "}
        {formatCompanyMoney(company, payouts.total)} per customer.
      </p>

      <ReferForm services={company.services} companyName={company.name} />
    </div>
  );
}
