import { requireCompanyAdmin } from "@/lib/auth";
import { getCurrentCompany } from "@/lib/company";
import { prisma } from "@/lib/db";
import { smsConfigured } from "@/lib/sms";
import {
  DAILY_SEND_CAP,
  DEFAULT_SMS_TEMPLATE,
  DEFAULT_EMAIL_SUBJECT,
  DEFAULT_EMAIL_TEMPLATE,
  INVITE_PLACEHOLDERS,
  sentInLast24h,
} from "@/lib/invites";
import { InviteComposer } from "./InviteComposer";
import { InviteTable } from "./InviteTable";

export default async function CompanyInvitesPage() {
  const admin = await requireCompanyAdmin();
  const company = await getCurrentCompany();
  if (!company) return null;

  const [invites, sentToday, teamMembers] = await Promise.all([
    prisma.partnerInvite.findMany({
      where: { companyId: admin.companyId },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    sentInLast24h(admin.companyId),
    // Everyone the batch can be "sent as" — the company's admin team.
    // Drives the From display name, Reply-To, and {{senderName}}.
    prisma.membership
      .findMany({
        where: { companyId: admin.companyId, role: "COMPANY_ADMIN" },
        orderBy: { createdAt: "asc" },
        select: {
          user: { select: { id: true, fullName: true, email: true } },
        },
      })
      .then((rows) => rows.map((m) => m.user)),
  ]);

  const counts = {
    pending: invites.filter((i) => i.status === "PENDING").length,
    sent: invites.filter((i) => i.status === "SENT").length,
    failed: invites.filter((i) => i.status === "FAILED").length,
    signedUp: invites.filter((i) => i.status === "SIGNED_UP").length,
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-brand">Invite partners</h1>
        <p className="text-sm text-slate-600 mt-1">
          Paste in your contacts — other trades, past customers, suppliers —
          and invite them all at once. Each person gets their own tracked
          signup link, so you can see exactly who joined.
        </p>
      </div>

      {/* At-a-glance counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <CountTile label="Waiting to send" value={counts.pending} />
        <CountTile label="Invited" value={counts.sent} />
        <CountTile
          label="Signed up"
          value={counts.signedUp}
          highlight={counts.signedUp > 0}
        />
        <CountTile
          label="Failed"
          value={counts.failed}
          warn={counts.failed > 0}
        />
      </div>

      <InviteComposer
        smsAvailable={smsConfigured()}
        pendingSms={
          invites.filter((i) => i.status === "PENDING" && i.channel === "SMS")
            .length
        }
        pendingEmail={
          invites.filter(
            (i) => i.status === "PENDING" && i.channel === "EMAIL",
          ).length
        }
        remainingToday={Math.max(0, DAILY_SEND_CAP - sentToday)}
        dailyCap={DAILY_SEND_CAP}
        defaults={{
          sms: DEFAULT_SMS_TEMPLATE,
          emailSubject: DEFAULT_EMAIL_SUBJECT,
          emailBody: DEFAULT_EMAIL_TEMPLATE,
        }}
        placeholders={INVITE_PLACEHOLDERS}
        senders={teamMembers.map((m) => ({
          id: m.id,
          label: m.fullName
            ? `${m.fullName} (${m.email})`
            : m.email,
        }))}
        currentUserId={admin.id}
      />

      <InviteTable
        invites={invites.map((i) => ({
          id: i.id,
          name: i.name,
          phone: i.phone,
          email: i.email,
          channel: i.channel,
          status: i.status,
          sentAt: i.sentAt?.toISOString() ?? null,
          signedUpAt: i.signedUpAt?.toISOString() ?? null,
          failReason: i.failReason,
        }))}
      />
    </div>
  );
}

function CountTile({
  label,
  value,
  highlight,
  warn,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="text-xs uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div
        className={`text-2xl font-bold mt-1 ${
          highlight
            ? "text-emerald-600"
            : warn
              ? "text-rose-600"
              : "text-brand"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
