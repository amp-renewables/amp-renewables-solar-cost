import { notFound } from "next/navigation";
import {
  getCurrentCompany,
  formatCompanyMoney,
  payoutsForCompany,
} from "@/lib/company";
import { ReferForm } from "./ReferForm";

export default async function ReferPage() {
  const company = await getCurrentCompany();
  if (!company) notFound();
  const payouts = payoutsForCompany(company);

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
        {payouts.appointment > 0 ? (
          <>
            {" "}
            You&apos;ll earn{" "}
            {formatCompanyMoney(company, payouts.appointment)} the moment
            the appointment is confirmed, and an additional{" "}
            {formatCompanyMoney(company, payouts.job)} if the job sells —
            up to {formatCompanyMoney(company, payouts.total)} per
            customer.
          </>
        ) : (
          <>
            {" "}
            You&apos;ll earn {formatCompanyMoney(company, payouts.job)}{" "}
            when their job sells.
          </>
        )}
      </p>

      <ReferForm services={company.services} companyName={company.name} />
    </div>
  );
}
