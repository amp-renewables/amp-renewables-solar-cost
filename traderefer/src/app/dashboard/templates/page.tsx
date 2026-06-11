import { prisma } from "@/lib/db";
import { requirePartner } from "@/lib/auth";
import { getCurrentCompany } from "@/lib/company";
import { CopyButton } from "@/components/CopyButton";

// Replace template placeholders with concrete values from the partner's
// account and the company they're referring to.
function fillTemplate(
  body: string,
  partner: { fullName: string | null; businessName: string | null },
  company: {
    name: string;
    contactPhone: string | null;
    contactEmail: string;
    websiteUrl: string | null;
  },
): string {
  return body
    .replaceAll("{{partnerName}}", partner.fullName || "")
    // Individual referrers have no business — fall back to their own
    // name so "It's {{partnerName}} from {{businessName}}" never renders
    // a dangling "from ". Partners copy-edit these before sending anyway.
    .replaceAll(
      "{{businessName}}",
      partner.businessName || partner.fullName || "",
    )
    .replaceAll("{{companyName}}", company.name)
    .replaceAll("{{supportPhone}}", company.contactPhone || "")
    .replaceAll("{{supportEmail}}", company.contactEmail)
    .replaceAll("{{domain}}", company.websiteUrl || "");
}

export default async function PartnerTemplatesPage() {
  const user = await requirePartner();
  const company = await getCurrentCompany();
  if (!company) return null;

  const templates = await prisma.messageTemplate.findMany({
    where: { active: true, companyId: user.companyId },
    orderBy: [{ channel: "asc" }, { sortOrder: "asc" }],
  });

  const sms = templates.filter((t) => t.channel === "SMS");
  const emails = templates.filter((t) => t.channel === "EMAIL");

  return (
    <div className="space-y-8">
      <div>
        <h1
          className="text-2xl font-bold text-brand"
        >
          Customer message templates
        </h1>
        <p className="text-slate-600 mt-1 text-sm">
          Ready-to-send SMS and email templates. Tap copy, then paste into your
          messaging app. Your name and business are filled in automatically.
        </p>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-brand mb-3">
          SMS templates ({sms.length})
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {sms.map((t) => {
            const filled = fillTemplate(t.body, user, company);
            return (
              <div
                key={t.id}
                className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col"
              >
                <h3 className="font-semibold text-brand mb-2">{t.title}</h3>
                <pre className="whitespace-pre-wrap text-sm text-slate-700 flex-1 mb-3 font-sans">
                  {filled}
                </pre>
                <CopyButton value={filled} label="Copy SMS" />
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-brand mb-3">
          Email templates ({emails.length})
        </h2>
        <div className="space-y-4">
          {emails.map((t) => {
            const filled = fillTemplate(t.body, user, company);
            return (
              <div
                key={t.id}
                className="bg-white border border-slate-200 rounded-xl p-5"
              >
                <h3 className="font-semibold text-brand">{t.title}</h3>
                {t.subject && (
                  <div className="text-sm text-slate-600 mt-1">
                    <span className="font-medium">Subject:</span> {t.subject}
                  </div>
                )}
                <pre className="whitespace-pre-wrap text-sm text-slate-700 mt-3 font-sans border-l-2 border-slate-200 pl-4">
                  {filled}
                </pre>
                <div className="flex flex-wrap gap-2 mt-4">
                  {t.subject && (
                    <CopyButton value={t.subject} label="Copy subject" />
                  )}
                  <CopyButton value={filled} label="Copy email body" />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
