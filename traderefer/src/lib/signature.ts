// Per-company email-signature snippet. A short one-liner the company
// pastes into their email client (Gmail / Outlook / iOS Mail etc.) so
// every outgoing email quietly promotes their referral programme.
//
// Stored as a single template string on Company.emailSignature with
// {{placeholders}} that we interpolate at render time. Placeholders are
// resolved from the company row, so payout amounts stay live — change
// them in settings, the signature updates automatically.
//
// We expose plain-text and HTML renderings; the install page uses both.

import "server-only";
import type { Company } from "@prisma/client";
import { platform } from "./platform";
import { payoutsForCompany, formatCompanyMoney } from "./company";

/** Default template if the company hasn't customised it. */
export const DEFAULT_SIGNATURE_TEMPLATE =
  "Know someone thinking about a {{services}}? Refer them to " +
  "{{companyName}} and earn up to {{payoutTotal}} — sign up at " +
  "{{signupUrl}}";

type SignatureCompany = Pick<
  Company,
  | "name"
  | "slug"
  | "emailSignature"
  | "payoutAppointment"
  | "payoutJob"
  | "currencySymbol"
  | "services"
>;

/**
 * Substitute {{placeholders}} in a template string against company data.
 * Unknown placeholders are left as-is so a half-typed template doesn't
 * silently lose user content.
 */
function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match,
  );
}

/** Build the variable bag used by both plain-text and HTML renderers. */
function buildVars(company: SignatureCompany): Record<string, string> {
  const payouts = payoutsForCompany(company);
  // "Solar PV or a heat pump", "solar PV", "solar PV or a heat pump or
  // an EV charger" — pick the first two services and join nicely.
  const services = (company.services || []).slice(0, 2);
  const servicesPhrase =
    services.length === 0
      ? "service like ours"
      : services.length === 1
        ? services[0].toLowerCase()
        : `${services[0].toLowerCase()} or ${services[1].toLowerCase()}`;

  return {
    companyName: company.name,
    signupUrl: `${platform.url}/${company.slug}/signup`,
    payoutTotal: formatCompanyMoney(company, payouts.total),
    payoutAppointment: formatCompanyMoney(company, payouts.appointment),
    payoutJob: formatCompanyMoney(company, payouts.job),
    services: servicesPhrase,
  };
}

/** The plain-text signature — works in every email client including iOS. */
export function renderSignaturePlain(company: SignatureCompany): string {
  const template = company.emailSignature || DEFAULT_SIGNATURE_TEMPLATE;
  return renderTemplate(template, buildVars(company));
}

/**
 * HTML signature — same content, but the link is a proper <a> and the
 * whole block is wrapped in a styled paragraph with a top divider. Works
 * in Gmail and Outlook (web + desktop). iOS Mail strips most of it so
 * use the plain-text version there.
 */
export function renderSignatureHtml(company: SignatureCompany): string {
  const template = company.emailSignature || DEFAULT_SIGNATURE_TEMPLATE;
  const vars = buildVars(company);

  // Bold the payout total and turn the URL into an <a>. We escape the
  // string first then substitute so injected HTML can't reach the output.
  const escaped = escapeHtml(template);
  const enriched = renderTemplate(escaped, {
    ...vars,
    payoutTotal: `<strong>${escapeHtml(vars.payoutTotal)}</strong>`,
    companyName: `<strong>${escapeHtml(vars.companyName)}</strong>`,
    signupUrl: `<a href="${escapeAttribute(vars.signupUrl)}" style="color:#1e293b;">${escapeHtml(vars.signupUrl)}</a>`,
  });

  return (
    `<p style="border-top:1px solid #d4d4d4;padding-top:8px;margin-top:16px;` +
    `font-family:Inter,Arial,sans-serif;font-size:13px;color:#475569;line-height:1.55;">` +
    `${enriched}</p>`
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(s: string): string {
  return s.replace(/"/g, "%22");
}

/** Available placeholders, for the in-page help text on the signature page. */
export const SIGNATURE_PLACEHOLDERS: Array<{
  token: string;
  description: string;
}> = [
  { token: "{{companyName}}", description: "Your company name" },
  { token: "{{signupUrl}}", description: "Public partner sign-up URL" },
  {
    token: "{{payoutTotal}}",
    description: "Total payout per referred customer (appointment + job)",
  },
  {
    token: "{{payoutAppointment}}",
    description: "Payout when an appointment is booked",
  },
  { token: "{{payoutJob}}", description: "Payout when the job sells" },
  {
    token: "{{services}}",
    description: "First two services from your list, e.g. 'solar pv or battery storage'",
  },
];
