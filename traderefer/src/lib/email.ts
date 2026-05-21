// Email notifications. Sends to NOTIFY_EMAIL (configured in env) whenever:
//   - a new partner signs up
//   - a partner submits a new referral
//
// Uses Resend (resend.com). If RESEND_API_KEY or NOTIFY_EMAIL aren't set the
// helpers no-op, so the app works fine in dev without email configured.
//
// All send calls swallow errors — a failing email must never block signup
// or referral submission.

import "server-only";
import { Resend } from "resend";
import { brand, formatMoney } from "./brand";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL;
const FROM_EMAIL =
  process.env.FROM_EMAIL || "onboarding@resend.dev"; // Resend's default sandbox sender
const APP_URL = process.env.APP_URL || "";

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

export async function sendNewReferralNotification(
  referral: ReferralPayload,
  partner: PartnerPayload,
): Promise<void> {
  if (!configured() || !resend || !NOTIFY_EMAIL) return;

  const adminLink = APP_URL
    ? `${APP_URL}/admin/referrals/${referral.id}`
    : "";
  const subject = `[${brand.productName}] New referral from ${
    partner.businessName ?? partner.fullName ?? "a partner"
  }: ${referral.customerName}`;

  const addressLines = [
    referral.addressLine1,
    referral.addressLine2,
    `${referral.city}, ${referral.postcode}`,
  ].filter(Boolean) as string[];

  const html = `
    <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
      <h2 style="color:${brand.colors.primary};margin-bottom:4px;">New referral from ${esc(partner.businessName ?? "")}</h2>
      <p style="color:#666;margin-top:0;">${esc(partner.fullName ?? "A partner")} has just submitted a new customer referral.</p>

      <h3 style="margin-top:28px;color:${brand.colors.primary};">Customer</h3>
      <table style="border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:4px 12px 4px 0;color:#888;">Name</td><td style="padding:4px 0;font-weight:500;">${esc(referral.customerName)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#888;">Phone</td><td style="padding:4px 0;"><a href="tel:${esc(referral.customerPhone)}" style="color:${brand.colors.primary};">${esc(referral.customerPhone)}</a></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#888;">Email</td><td style="padding:4px 0;"><a href="mailto:${esc(referral.customerEmail)}" style="color:${brand.colors.primary};">${esc(referral.customerEmail)}</a></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#888;vertical-align:top;">Address</td><td style="padding:4px 0;">${addressLines.map(esc).join("<br/>")}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#888;">Services</td><td style="padding:4px 0;">${esc(referral.services.join(", "))}</td></tr>
        ${
          referral.notes
            ? `<tr><td style="padding:4px 12px 4px 0;color:#888;vertical-align:top;">Notes</td><td style="padding:4px 0;white-space:pre-wrap;">${esc(referral.notes)}</td></tr>`
            : ""
        }
      </table>

      <h3 style="margin-top:28px;color:${brand.colors.primary};">Partner (referrer)</h3>
      <table style="border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:4px 12px 4px 0;color:#888;">Business</td><td style="padding:4px 0;font-weight:500;">${esc(partner.businessName ?? "")}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#888;">Contact</td><td style="padding:4px 0;">${esc(partner.fullName ?? "")}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#888;">Email</td><td style="padding:4px 0;"><a href="mailto:${esc(partner.email)}" style="color:${brand.colors.primary};">${esc(partner.email)}</a></td></tr>
        ${
          partner.phone
            ? `<tr><td style="padding:4px 12px 4px 0;color:#888;">Phone</td><td style="padding:4px 0;"><a href="tel:${esc(partner.phone)}" style="color:${brand.colors.primary};">${esc(partner.phone)}</a></td></tr>`
            : ""
        }
      </table>

      ${
        adminLink
          ? `<p style="margin-top:32px;"><a href="${adminLink}" style="background:${brand.colors.primary};color:#fff;padding:11px 22px;border-radius:6px;text-decoration:none;font-weight:500;display:inline-block;">Open in ${esc(brand.productName)}</a></p>`
          : ""
      }

      <p style="margin-top:32px;color:#999;font-size:12px;">
        Reply to this email to contact the partner directly.<br/>
        Earnings on this referral: ${formatMoney(brand.payouts.perAppointment)} on appointment booked, ${formatMoney(brand.payouts.perJob)} on job sold.
      </p>
    </div>
  `;

  const text = [
    `New referral from ${partner.businessName ?? ""}`,
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
    adminLink ? `Open in ${brand.productName}: ${adminLink}` : null,
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
): Promise<void> {
  if (!configured() || !resend || !NOTIFY_EMAIL) return;

  const adminLink = APP_URL ? `${APP_URL}/admin/partners` : "";
  const subject = `[${brand.productName}] New partner signup: ${
    partner.businessName ?? partner.fullName ?? partner.email
  }`;

  const html = `
    <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
      <h2 style="color:${brand.colors.primary};margin-bottom:4px;">New partner signed up</h2>
      <p style="color:#666;margin-top:0;">A new tradesman has just registered for the ${esc(brand.productName)} referral programme.</p>

      <table style="border-collapse:collapse;font-size:14px;margin-top:20px;">
        <tr><td style="padding:4px 12px 4px 0;color:#888;">Business</td><td style="padding:4px 0;font-weight:500;">${esc(partner.businessName ?? "")}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#888;">Contact</td><td style="padding:4px 0;">${esc(partner.fullName ?? "")}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#888;">Email</td><td style="padding:4px 0;"><a href="mailto:${esc(partner.email)}" style="color:${brand.colors.primary};">${esc(partner.email)}</a></td></tr>
        ${
          partner.phone
            ? `<tr><td style="padding:4px 12px 4px 0;color:#888;">Phone</td><td style="padding:4px 0;"><a href="tel:${esc(partner.phone)}" style="color:${brand.colors.primary};">${esc(partner.phone)}</a></td></tr>`
            : ""
        }
      </table>

      ${
        adminLink
          ? `<p style="margin-top:32px;"><a href="${adminLink}" style="background:${brand.colors.primary};color:#fff;padding:11px 22px;border-radius:6px;text-decoration:none;font-weight:500;display:inline-block;">View all partners</a></p>`
          : ""
      }

      <p style="margin-top:32px;color:#999;font-size:12px;">
        Reply to this email to contact the partner directly.
      </p>
    </div>
  `;

  const text = [
    `New partner signed up`,
    `A new tradesman has just registered for the ${brand.productName} referral programme.`,
    ``,
    `Business: ${partner.businessName ?? ""}`,
    `Contact:  ${partner.fullName ?? ""}`,
    `Email:    ${partner.email}`,
    partner.phone ? `Phone:    ${partner.phone}` : null,
    ``,
    adminLink ? `View all partners: ${adminLink}` : null,
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

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
