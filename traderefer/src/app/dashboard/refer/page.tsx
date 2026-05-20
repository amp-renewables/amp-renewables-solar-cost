import { brand, formatMoney, totalPotentialPerJob } from "@/lib/brand";
import { ReferForm } from "./ReferForm";

export default function ReferPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1
        className="text-2xl font-bold text-brand mb-2"
        style={{ fontFamily: "Fraunces, serif" }}
      >
        Refer a customer
      </h1>
      <p className="text-slate-600 mb-6 text-sm">
        Fill in your customer&apos;s details. We&apos;ll contact them within 1
        working day to book a free survey. You&apos;ll earn{" "}
        {formatMoney(brand.payouts.perAppointment)} the moment the appointment
        is confirmed, and an additional {formatMoney(brand.payouts.perJob)} if
        the job sells — up to {formatMoney(totalPotentialPerJob())} per
        customer.
      </p>

      <ReferForm services={brand.services} />
    </div>
  );
}
