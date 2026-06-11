import Link from "next/link";
import { requirePartner } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ChangePasswordCard } from "@/components/ChangePasswordCard";
import { tryDecryptField } from "@/lib/crypto";
import { getCurrentCompany } from "@/lib/company";
import { ProfileForm, BankForm } from "./Forms";

export default async function PartnerSettingsPage() {
  const session = await requirePartner();
  const [user, company] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.id },
      select: {
        fullName: true,
        businessName: true,
        phone: true,
        postcode: true,
        bankAccountName: true,
        bankSortCode: true,
        bankAccountNumber: true,
      },
    }),
    getCurrentCompany(),
  ]);
  if (!user) return null;

  // Partners can always see their own bank details in the clear (it's
  // their own data). Decrypt before passing to the form.
  const sortCodeClear = tryDecryptField(user.bankSortCode) ?? "";
  const accountNumberClear = tryDecryptField(user.bankAccountNumber) ?? "";

  return (
    <div className="space-y-8 max-w-2xl">
      <h1
        className="text-2xl font-bold text-brand"
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
          postcode={user.postcode ?? ""}
        />
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
          Payout bank details
        </h2>
        <p className="text-sm text-slate-600 mb-4">
          Where you want your referral payouts sent. UK bank accounts only.
          These details are shared with{" "}
          {company?.name ? (
            <strong>{company.name}</strong>
          ) : (
            "the company you refer to"
          )}{" "}
          so they can pay you directly.
        </p>

        {/* Inline reassurance — sits above the form so anyone who's nervous
            about entering bank details sees the safeguards before clicking
            into the first input. We chose always-visible over hover-only
            tooltip because trust signals should be discoverable at a
            glance, not buried behind interaction. */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-5">
          <div className="flex items-start gap-3">
            <div className="text-2xl leading-none mt-0.5">🔒</div>
            <div className="flex-1 text-sm text-emerald-900 space-y-2">
              <p className="font-semibold">
                How we keep these safe
              </p>
              <ul className="space-y-1.5 text-emerald-800">
                <li>
                  <strong>Encrypted on save.</strong> Your sort code and
                  account number are encrypted with bank-grade AES-256 the
                  moment you click save. What we store in the database is
                  unreadable ciphertext, not the digits themselves.
                </li>
                <li>
                  <strong>
                    Only{" "}
                    {company?.name ?? "the company you partnered with"} can
                    see them
                  </strong>{" "}
                  — and only when they&apos;re actually processing a
                  payout. They&apos;re hidden by default in their admin
                  view.
                </li>
                <li>
                  <strong>Every view is logged.</strong> If an admin
                  reveals your details we record who, when and why. Ask us
                  any time for the full history.
                </li>
                <li>
                  <strong>You stay in control.</strong> Update or remove
                  them whenever you like. We never share them with anyone
                  else.
                </li>
              </ul>
              <p className="text-xs text-emerald-700 pt-1">
                <Link href="/help#data-safety" className="underline">
                  More about how we protect your data →
                </Link>
              </p>
            </div>
          </div>
        </div>

        <BankForm
          bankAccountName={user.bankAccountName ?? ""}
          bankSortCode={sortCodeClear}
          bankAccountNumber={accountNumberClear}
        />
      </section>

      <section>
        <ChangePasswordCard />
      </section>
    </div>
  );
}
