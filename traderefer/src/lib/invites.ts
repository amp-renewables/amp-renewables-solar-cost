// Partner-invitation helpers: default message templates, placeholder
// interpolation, token generation, and the daily send cap.
//
// The invite link format is /<slug>/signup?invite=<token>. The partner
// signup action looks the token up and stamps the invite SIGNED_UP, so
// the /company/invites table shows real conversion per contact.

import "server-only";
import { randomBytes } from "node:crypto";
import type { Company } from "@prisma/client";
import { prisma } from "./db";
import { platform } from "./platform";
import { payoutsForCompany, formatCompanyMoney } from "./company";

/** Hard ceiling on invites a single company can SEND per rolling 24h.
 *  Protects TradeRefer's sending reputation (shared Resend domain,
 *  shared Twilio account) from one customer pasting in a bought list. */
export const DAILY_SEND_CAP = 200;

export const DEFAULT_SMS_TEMPLATE =
  "Hi {{firstName}}, it's {{senderName}} from {{companyName}}. We pay " +
  "{{payoutTotal}} for every customer you send our way that buys — all " +
  "tracked properly, paid by bank transfer. Takes a minute to join: " +
  "{{inviteUrl}} Reply STOP to opt out.";

export const DEFAULT_EMAIL_SUBJECT =
  "Earn {{payoutTotal}} per customer you refer to {{companyName}}";

// The default deal bullets adapt to the company's rates — a company
// that only pays for sold jobs shouldn't open with a "£0 when an
// appointment books" line. Admins can still edit freely before sending.
export function defaultEmailTemplate(
  company: Pick<Company, "payoutAppointment">,
): string {
  const dealBullets =
    Number(company.payoutAppointment) > 0
      ? "- {{payoutAppointment}} when a customer you refer books an appointment\n" +
        "- {{payoutJob}} more when the job sells\n"
      : "- {{payoutJob}} for every customer you refer whose job sells\n";
  return (
    "Hi {{firstName}},\n\n" +
    "{{senderName}} here from {{companyName}}. We've set up a referral " +
    "programme for the trades and contacts we work with — and we'd like " +
    "you in it.\n\n" +
    "The deal:\n" +
    dealBullets +
    "- Paid by bank transfer, tracked properly, no chasing\n\n" +
    "Sign up takes a minute:\n{{inviteUrl}}\n\n" +
    "Any questions, just reply.\n\n" +
    "{{senderName}}\n{{companyName}}"
  );
}

export const INVITE_PLACEHOLDERS: Array<{ token: string; description: string }> = [
  { token: "{{firstName}}", description: "Recipient's first name ('there' if unknown)" },
  { token: "{{senderName}}", description: "Your name" },
  { token: "{{companyName}}", description: "Your company name" },
  { token: "{{inviteUrl}}", description: "Their personal signup link (tracked)" },
  { token: "{{payoutTotal}}", description: "Total payout per customer" },
  { token: "{{payoutAppointment}}", description: "Appointment payout" },
  { token: "{{payoutJob}}", description: "Job-sold payout" },
];

export function newInviteToken(): string {
  return randomBytes(16).toString("base64url");
}

type InviteCompany = Pick<
  Company,
  "name" | "slug" | "payoutAppointment" | "payoutJob" | "currencySymbol"
>;

/**
 * Interpolate a message template for one recipient. Unknown placeholders
 * are left intact so typos are visible in the preview rather than
 * silently vanishing.
 */
export function renderInviteMessage(
  template: string,
  company: InviteCompany,
  recipient: { name: string | null; token: string },
  senderName: string,
): string {
  const payouts = payoutsForCompany(company);
  const firstName = recipient.name?.trim().split(/\s+/)[0] || "there";
  const vars: Record<string, string> = {
    firstName,
    senderName,
    companyName: company.name,
    inviteUrl: `${platform.url}/${company.slug}/signup?invite=${recipient.token}`,
    payoutTotal: formatCompanyMoney(company, payouts.total),
    payoutAppointment: formatCompanyMoney(company, payouts.appointment),
    payoutJob: formatCompanyMoney(company, payouts.job),
  };
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match,
  );
}

/** How many invites this company has sent in the last 24 hours. */
export async function sentInLast24h(companyId: string): Promise<number> {
  return prisma.partnerInvite.count({
    where: {
      companyId,
      sentAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });
}

/**
 * Tolerant contact-list parser. One contact per line, comma- or
 * tab-separated: "Name, phone, email" — any field optional, order
 * flexible (we sniff phones and emails by shape). Returns parsed rows
 * plus per-line problems so the UI can show what was skipped.
 */
export function parseContactLines(input: string): {
  contacts: Array<{ name: string | null; phone: string | null; email: string | null }>;
  problems: string[];
} {
  const contacts: Array<{ name: string | null; phone: string | null; email: string | null }> = [];
  const problems: string[] = [];

  const lines = input
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    // Skip obvious CSV header rows
    if (/^(name|first\s*name|contact)\s*[,\t]/i.test(line)) continue;

    const parts = line.split(/[,\t;]/).map((p) => p.trim()).filter(Boolean);
    let name: string | null = null;
    let phone: string | null = null;
    let email: string | null = null;

    for (const part of parts) {
      if (!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(part)) {
        email = part.toLowerCase();
      } else if (!phone && /^[+\d][\d\s\-()]{8,}$/.test(part)) {
        phone = part.replace(/[\s\-()]/g, "");
      } else if (!name) {
        name = part;
      }
    }

    if (!phone && !email) {
      problems.push(`"${line}" — no phone number or email found, skipped`);
      continue;
    }
    contacts.push({ name, phone, email });
  }

  return { contacts, problems };
}
