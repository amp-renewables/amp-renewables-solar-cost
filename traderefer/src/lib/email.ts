// Email notifications. Sends to NOTIFY_EMAIL (configured in env) whenever:
//   - a new partner signs up
//   - a partner submits a new referral
//   - a new Company signs up to the TradeRefer platform (£99/mo customer)
//
// Uses Resend (resend.com). If RESEND_API_KEY or NOTIFY_EMAIL aren't set the
// helpers no-op, so the app works fine in dev without email configured.
//
// All send calls swallow errors — a failing email must never block signup
// or referral submission.

import "server-only";
import { Resend } from "resend";
import type { Company } from "@prisma/client";
import { platform } from "./platform";
import { formatCompanyMoney } from "./company";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL;
const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";
const APP_URL = process.env.APP_URL || platform.url;

function configured(): boolean {
  return Boolean(resend && NOTIFY_EMAIL);
}

type ReferralPayload = {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  postcode: string;
  services: string[];
  notes?: string | null;
};

type PartnerPayload = {
  id: string;
  email: string;
  fullName: string | null;
  businessName: string | null;
  phone: string | null;
};

type CompanyPayload = Pick<
  Company,
  | "id"
  | "name"
  | "slug"
  | "primaryColor"
  | "payoutAppointment"
  | "payoutJob"
  | "currencySymbol"
  | "contactEmail"
>;

export async function sendNewReferralNotification(
  referral: ReferralPayload,
  partner: PartnerPayload,
  company: CompanyPayload,
): Promise<void> {
  if (!configured() || !resend || !NOTIFY_EMAIL) return;

  const adminLink = `${APP_URL}/company/referrals/${referral.id}`;
  const subject = `[${company.name}] New referral from ${
    partner.businessName ?? partner.fullName ?? "a partner"
  }: ${referral.customerName}`;

  const addressLines = [
    referral.addressLine1,
    referral.addressLine2,
    `${referral.city}, ${referral.postcode}`,
  ].filter(Boolean) as string[];

  const html = `
    <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
      <h2 style="color:${company.primaryColor};margin-bottom:4px;">New referral from ${esc(partner.businessName ?? "")}</h2>
      <p style="color:#666;margin-top:0;">${esc(partner.fullName ?? "A partner")} has just submitted a new customer referral to <strong>${esc(company.name)}</strong>.</p>

      <h3 style="margin-top:28px;color:${company.primaryColor};">Customer</h3>
      <table style="border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:4px 12px 4px 0;color:#888;">Name</td><td style="padding:4px 0;font-weight:500;">${esc(referral.customerName)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#888;">Phone</td><td style="padding:4px 0;"><a href="tel:${esc(referral.customerPhone)}" style="color:${company.primaryColor};">${esc(referral.customerPhone)}</a></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#888;">Email</td><td style="padding:4px 0;"><a href="mailto:${esc(referral.customerEmail)}" style="color:${company.primaryColor};">${esc(referral.customerEmail)}</a></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#888;vertical-align:top;">Address</td><td style="padding:4px 0;">${addressLines.map(esc).join("<br/>")}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#888;">Services</td><td style="padding:4px 0;">${esc(referral.services.join(", "))}</td></tr>
        ${
          referral.notes
            ? `<tr><td style="padding:4px 12px 4px 0;color:#888;vertical-align:top;">Notes</td><td style="padding:4px 0;white-space:pre-wrap;">${esc(referral.notes)}</td></tr>`
            : ""
        }
      </table>

      <h3 style="margin-top:28px;color:${company.primaryColor};">Partner (referrer)</h3>
      <table style="border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:4px 12px 4px 0;color:#888;">Business</td><td style="padding:4px 0;font-weight:500;">${esc(partner.businessName ?? "")}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#888;">Contact</td><td style="padding:4px 0;">${esc(partner.fullName ?? "")}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#888;">Email</td><td style="padding:4px 0;"><a href="mailto:${esc(partner.email)}" style="color:${company.primaryColor};">${esc(partner.email)}</a></td></tr>
        ${
          partner.phone
            ? `<tr><td style="padding:4px 12px 4px 0;color:#888;">Phone</td><td style="padding:4px 0;"><a href="tel:${esc(partner.phone)}" style="color:${company.primaryColor};">${esc(partner.phone)}</a></td></tr>`
            : ""
        }
      </table>

      <p style="margin-top:32px;"><a href="${adminLink}" style="background:${company.primaryColor};color:#fff;padding:11px 22px;border-radius:6px;text-decoration:none;font-weight:500;display:inline-block;">Open in ${esc(platform.name)}</a></p>

      <p style="margin-top:32px;color:#999;font-size:12px;">
        Reply to this email to contact the partner directly.<br/>
        Earnings on this referral: ${formatCompanyMoney(company, Number(company.payoutAppointment))} on appointment booked, ${formatCompanyMoney(company, Number(company.payoutJob))} on job sold.
      </p>
    </div>
  `;

  const text = [
    `New referral from ${partner.businessName ?? ""} for ${company.name}`,
    `${partner.fullName ?? "A partner"} has just submitted a new customer referral.`,
    ``,
    `CUSTOMER`,
    `Name:     ${referral.customerName}`,
    `Phone:    ${referral.customerPhone}`,
    `Email:    ${referral.customerEmail}`,
    `Address:  ${addressLines.join(", ")}`,
    `Services: ${referral.services.join(", ")}`,
    referral.notes ? `Notes:    ${referral.notes}` : null,
    ``,
    `PARTNER (REFERRER)`,
    `Business: ${partner.businessName ?? ""}`,
    `Contact:  ${partner.fullName ?? ""}`,
    `Email:    ${partner.email}`,
    partner.phone ? `Phone:    ${partner.phone}` : null,
    ``,
    `Open in ${platform.name}: ${adminLink}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: NOTIFY_EMAIL,
      replyTo: partner.email,
      subject,
      html,
      text,
    });
  } catch (err) {
    console.error("[email] new-referral notification failed:", err);
  }
}

export async function sendNewPartnerSignupNotification(
  partner: PartnerPayload,
  company: CompanyPayload,
): Promise<void> {
  if (!configured() || !resend || !NOTIFY_EMAIL) return;

  const adminLink = `${APP_URL}/company/partners`;
  const subject = `[${company.name}] New partner signup: ${
    partner.businessName ?? partner.fullName ?? partner.email
  }`;

  const html = `
    <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
      <h2 style="color:${company.primaryColor};margin-bottom:4px;">New partner signed up</h2>
      <p style="color:#666;margin-top:0;">A new tradesman has just registered for the ${esc(company.name)} referral programme on ${esc(platform.name)}.</p>

      <table style="border-collapse:collapse;font-size:14px;margin-top:20px;">
        <tr><td style="padding:4px 12px 4px 0;color:#888;">Business</td><td style="padding:4px 0;font-weight:500;">${esc(partner.businessName ?? "")}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#888;">Contact</td><td style="padding:4px 0;">${esc(partner.fullName ?? "")}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#888;">Email</td><td style="padding:4px 0;"><a href="mailto:${esc(partner.email)}" style="color:${company.primaryColor};">${esc(partner.email)}</a></td></tr>
        ${
          partner.phone
            ? `<tr><td style="padding:4px 12px 4px 0;color:#888;">Phone</td><td style="padding:4px 0;"><a href="tel:${esc(partner.phone)}" style="color:${company.primaryColor};">${esc(partner.phone)}</a></td></tr>`
            : ""
        }
      </table>

      <p style="margin-top:32px;"><a href="${adminLink}" style="background:${company.primaryColor};color:#fff;padding:11px 22px;border-radius:6px;text-decoration:none;font-weight:500;display:inline-block;">View all partners</a></p>
    </div>
  `;

  const text = [
    `New partner signed up for ${company.name}`,
    ``,
    `Business: ${partner.businessName ?? ""}`,
    `Contact:  ${partner.fullName ?? ""}`,
    `Email:    ${partner.email}`,
    partner.phone ? `Phone:    ${partner.phone}` : null,
    ``,
    `View all partners: ${adminLink}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: NOTIFY_EMAIL,
      replyTo: partner.email,
      subject,
      html,
      text,
    });
  } catch (err) {
    console.error("[email] new-partner-signup notification failed:", err);
  }
}

// Goes to the TradeRefer platform owner (Joe) when a new Company signs up.
export async function sendNewCompanySignupNotification(
  company: Pick<Company, "id" | "name" | "slug" | "contactEmail" | "contactPhone">,
  ownerName: string,
): Promise<void> {
  if (!configured() || !resend || !NOTIFY_EMAIL) return;

  const adminLink = `${APP_URL}/platform/companies`;
  const landingLink = `${APP_URL}/${company.slug}`;
  const subject = `[${platform.name}] New company signup: ${company.name}`;

  const html = `
    <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
      <h2 style="color:${platform.colors.primary};margin-bottom:4px;">New company on ${esc(platform.name)}</h2>
      <p style="color:#666;margin-top:0;"><strong>${esc(company.name)}</strong> just signed up.</p>

      <table style="border-collapse:collapse;font-size:14px;margin-top:20px;">
        <tr><td style="padding:4px 12px 4px 0;color:#888;">Company</td><td style="padding:4px 0;font-weight:500;">${esc(company.name)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#888;">Owner</td><td style="padding:4px 0;">${esc(ownerName)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#888;">Email</td><td style="padding:4px 0;"><a href="mailto:${esc(company.contactEmail)}" style="color:${platform.colors.primary};">${esc(company.contactEmail)}</a></td></tr>
        ${
          company.contactPhone
            ? `<tr><td style="padding:4px 12px 4px 0;color:#888;">Phone</td><td style="padding:4px 0;">${esc(company.contactPhone)}</td></tr>`
            : ""
        }
        <tr><td style="padding:4px 12px 4px 0;color:#888;">Landing</td><td style="padding:4px 0;"><a href="${landingLink}" style="color:${platform.colors.primary};">${esc(landingLink)}</a></td></tr>
      </table>

      <p style="margin-top:32px;"><a href="${adminLink}" style="background:${platform.colors.primary};color:#fff;padding:11px 22px;border-radius:6px;text-decoration:none;font-weight:500;display:inline-block;">View all companies</a></p>
    </div>
  `;

  const text = [
    `New company signup on ${platform.name}`,
    ``,
    `Company: ${company.name}`,
    `Owner:   ${ownerName}`,
    `Email:   ${company.contactEmail}`,
    company.contactPhone ? `Phone:   ${company.contactPhone}` : null,
    `Landing: ${landingLink}`,
    ``,
    `View all companies: ${adminLink}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: NOTIFY_EMAIL,
      replyTo: company.contactEmail,
      subject,
      html,
      text,
    });
  } catch (err) {
    console.error("[email] new-company-signup notification failed:", err);
  }
}

// Goes to the user requesting a password reset. The from address can be the
// platform default (notifications@traderefer.co.uk) — no company branding,
// because resets are platform-level.
export async function sendPasswordResetEmail(
  user: { email: string; fullName: string | null },
  resetUrl: string,
): Promise<void> {
  if (!resend) {
    // No Resend configured — log the link to the server console so dev can
    // still complete the flow. This MUST never happen in production.
    console.warn(
      `[email] no RESEND_API_KEY — password reset link for ${user.email}: ${resetUrl}`,
    );
    return;
  }

  const subject = `Reset your ${platform.name} password`;
  const html = `
    <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
      <h2 style="color:${platform.colors.primary};margin-bottom:4px;">Reset your password</h2>
      <p style="color:#666;margin-top:0;">
        Hi${user.fullName ? ` ${esc(user.fullName.split(" ")[0])}` : ""}, someone
        (hopefully you) requested a password reset for your ${esc(platform.name)} account.
      </p>
      <p>
        <a href="${resetUrl}" style="background:${platform.colors.primary};color:#fff;padding:11px 22px;border-radius:6px;text-decoration:none;font-weight:500;display:inline-block;">Reset my password</a>
      </p>
      <p style="color:#666;font-size:13px;">
        Or copy this link: <span style="word-break:break-all;">${esc(resetUrl)}</span>
      </p>
      <p style="color:#999;font-size:12px;margin-top:32px;">
        This link expires in 1 hour and can only be used once. If you didn't
        ask for a reset, you can safely ignore this email — your password
        won't change.
      </p>
    </div>
  `;

  const text = [
    `Reset your ${platform.name} password`,
    ``,
    `Hi${user.fullName ? ` ${user.fullName.split(" ")[0]}` : ""},`,
    ``,
    `Someone (hopefully you) requested a password reset. Open this link to set a new one:`,
    ``,
    resetUrl,
    ``,
    `Expires in 1 hour. Can only be used once. If this wasn't you, ignore this email.`,
  ].join("\n");

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: user.email,
      subject,
      html,
      text,
    });
  } catch (err) {
    console.error("[email] password-reset email failed:", err);
  }
}

export async function sendTeamInviteEmail(
  invitee: { email: string; fullName: string },
  context: { name: string; inviter: string },
  inviteUrl: string,
): Promise<void> {
  if (!resend) {
    console.warn(
      `[email] no RESEND_API_KEY — team invite link for ${invitee.email}: ${inviteUrl}`,
    );
    return;
  }

  const subject = `${context.inviter} invited you to ${context.name} on ${platform.name}`;
  const html = `
    <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
      <h2 style="color:${platform.colors.primary};margin-bottom:4px;">
        You've been invited to ${esc(context.name)}
      </h2>
      <p style="color:#666;margin-top:0;">
        ${esc(context.inviter)} has invited you to join the <strong>${esc(context.name)}</strong> team on ${esc(platform.name)}.
      </p>
      <p>
        Click the button below to set your password and get started. You'll
        have full admin access to ${esc(context.name)}'s referrals, partners
        and payouts.
      </p>
      <p>
        <a href="${inviteUrl}" style="background:${platform.colors.primary};color:#fff;padding:11px 22px;border-radius:6px;text-decoration:none;font-weight:500;display:inline-block;">Accept invite &amp; set password</a>
      </p>
      <p style="color:#666;font-size:13px;">
        Or copy this link: <span style="word-break:break-all;">${esc(inviteUrl)}</span>
      </p>
      <p style="color:#999;font-size:12px;margin-top:32px;">
        This invite expires in 7 days. If you weren't expecting it, you can
        safely ignore this email.
      </p>
    </div>
  `;

  const text = [
    `You've been invited to ${context.name} on ${platform.name}`,
    ``,
    `${context.inviter} has invited you to join the ${context.name} team.`,
    ``,
    `Set your password to get started:`,
    inviteUrl,
    ``,
    `This invite expires in 7 days.`,
  ].join("\n");

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: invitee.email,
      subject,
      html,
      text,
    });
  } catch (err) {
    console.error("[email] team invite failed:", err);
  }
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
