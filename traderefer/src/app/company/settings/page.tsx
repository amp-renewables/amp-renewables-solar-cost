import { requireCompanyAdmin } from "@/lib/auth";
import { getCurrentCompany } from "@/lib/company";
import { platform, formatPrice } from "@/lib/platform";
import { prisma } from "@/lib/db";
import { ChangePasswordCard } from "@/components/ChangePasswordCard";
import { SettingsForm } from "./SettingsForm";
import { LogoUpload } from "./LogoUpload";
import { TeamMembers } from "./TeamMembers";
import { MAX_TEAM_SIZE } from "./team-config";

export default async function CompanySettingsPage() {
  const admin = await requireCompanyAdmin();
  const company = await getCurrentCompany();
  if (!company) return null;

  const teamMembers = await prisma.user.findMany({
    where: { companyId: admin.companyId, role: "COMPANY_ADMIN" },
    orderBy: { createdAt: "asc" },
    select: { id: true, fullName: true, email: true },
  });

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1
          className="text-2xl font-bold text-brand"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          Settings
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Configure your branding, payouts and services. Changes show
          immediately on your public landing page at{" "}
          <a
            href={`/${company.slug}`}
            target="_blank"
            className="text-brand underline"
          >
            /{company.slug}
          </a>
          .
        </p>
      </div>

      <LogoUpload
        currentLogoUrl={company.logoUrl}
        companyName={company.name}
      />

      <SettingsForm
        company={{
          name: company.name,
          contactEmail: company.contactEmail,
          contactPhone: company.contactPhone,
          websiteUrl: company.websiteUrl,
          addressLine: company.addressLine,
          heroSubheading: company.heroSubheading,
          primaryColor: company.primaryColor,
          accentColor: company.accentColor,
          payoutAppointment: Number(company.payoutAppointment),
          payoutJob: Number(company.payoutJob),
          services: company.services,
        }}
      />

      <TeamMembers
        maxTeamSize={MAX_TEAM_SIZE}
        members={teamMembers.map((m) => ({
          id: m.id,
          fullName: m.fullName,
          email: m.email,
          isYou: m.id === admin.id,
        }))}
      />

      <ChangePasswordCard />

      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="font-semibold text-brand">Subscription</h2>
        <div className="mt-3 text-sm text-slate-700 space-y-1">
          <p>
            Status: <strong className="capitalize">{company.status.toLowerCase().replace(/_/g, " ")}</strong>
          </p>
          {company.trialEndsAt && company.status === "TRIAL" && (
            <p>
              Trial ends: {company.trialEndsAt.toLocaleDateString("en-GB")}
            </p>
          )}
          {company.isComped && (
            <p className="text-emerald-700">
              ✓ Comped account — never billed
            </p>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-4">
          After trial: {formatPrice(platform.pricing.monthly)}/month. Billing
          through Stripe (coming soon).
        </p>
      </section>
    </div>
  );
}
