import { requirePartner } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ProfileForm, BankForm } from "./Forms";

export default async function PartnerSettingsPage() {
  const session = await requirePartner();
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      fullName: true,
      businessName: true,
      phone: true,
      bankAccountName: true,
      bankSortCode: true,
      bankAccountNumber: true,
    },
  });
  if (!user) return null;

  return (
    <div className="space-y-8 max-w-2xl">
      <h1
        className="text-2xl font-bold text-brand"
        style={{ fontFamily: "Fraunces, serif" }}
      >
        Your account
      </h1>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
          Profile
        </h2>
        <ProfileForm
          fullName={user.fullName ?? ""}
          businessName={user.businessName ?? ""}
          phone={user.phone ?? ""}
        />
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
          Payout bank details
        </h2>
        <p className="text-sm text-slate-600 mb-4">
          Where you want your referral payouts sent. UK bank accounts only.
          These details are shared with the company you refer to so they can
          pay you directly.
        </p>
        <BankForm
          bankAccountName={user.bankAccountName ?? ""}
          bankSortCode={user.bankSortCode ?? ""}
          bankAccountNumber={user.bankAccountNumber ?? ""}
        />
      </section>
    </div>
  );
}
