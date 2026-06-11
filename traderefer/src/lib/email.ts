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
  customerEmail: string | null;
  addressLine1: string | null;
  addressLine2?: string | null;
  city: string | null;
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
    referral.city ? `${referral.city}, ${referral.postcode}` : referral.postcode,
  ].filter(Boolean) as string[];

  const html = `
    <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
      <h2 style="color:${company.primaryColor};margin-bottom:4px;">New referral from ${esc(partner.businessName ?? partner.fullName ?? "a partner")}</h2>
      <p style="color:#666;margin-top:0;">${esc(partner.fullName ?? "A partner")} has just submitted a new customer referral to <strong>${esc(company.name)}</strong>.</p>

      <h3 style="margin-top:28px;color:${company.primaryColor};">Customer</h3>
      <table style="border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:4px 12px 4px 0;color:#888;">Name</td><td style="padding:4px 0;font-weight:500;">${esc(referral.customerName)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#888;">Phone</td><td style="padding:4px 0;"><a href="tel:${esc(referral.customerPhone)}" style="color:${company.primaryColor};">${esc(referral.customerPhone)}</a></td></tr>
        ${
          referral.customerEmail
            ? `<tr><td style="padding:4px 12px 4px 0;color:#888;">Email</td><td style="padding:4px 0;"><a href="mailto:${esc(referral.customerEmail)}" style="color:${company.primaryColor};">${esc(referral.customerEmail)}</a></td></tr>`
            : ""
        }
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
        <tr><td style="padding:4px 12px 4px 0;color:#888;">Business</td><td style="padding:4px 0;font-weight:500;">${esc(partner.businessName ?? "(individual referrer)")}</td></tr>
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
    `New referral from ${partner.businessName ?? partner.fullName ?? "a partner"} for ${company.name}`,
    `${partner.fullName ?? "A partner"} has just submitted a new customer referral.`,
    ``,
    `CUSTOMER`,
    `Name:     ${referral.customerName}`,
    `Phone:    ${referral.customerPhone}`,
    referral.customerEmail ? `Email:    ${referral.customerEmail}` : null,
    `Address:  ${addressLines.join(", ")}`,
    `Services: ${referral.services.join(", ")}`,
    referral.notes ? `Notes:    ${referral.notes}` : null,
    ``,
    `PARTNER (REFERRER)`,
    `Business: ${partner.businessName ?? "(individual referrer)"}`,
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
        <tr><td style="padding:4px 12px 4px 0;color:#888;">Business</td><td style="padding:4px 0;font-weight:500;">${esc(partner.businessName ?? "(individual referrer)")}</td></tr>
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
    `Business: ${partner.businessName ?? "(individual referrer)"}`,
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

/**
 * Goes to a new PARTNER the moment they sign up under a company's
 * programme. Branded as the company (From display name + reply-to their
 * contact email) since the partner's relationship is with the company,
 * not with TradeRefer. Covers: the deal, how to refer, the bank-details
 * nudge.
 */
export async function sendPartnerWelcomeEmail(
  partner: { email: string; fullName: string | null },
  company: CompanyPayload,
): Promise<void> {
  if (!resend) {
    console.warn(
      `[email] no RESEND_API_KEY — partner welcome for ${partner.email} skipped`,
    );
    return;
  }

  const firstName = partner.fullName?.trim().split(/\s+/)[0] || "there";
  const appointment = formatCompanyMoney(
    company,
    Number(company.payoutAppointment),
  );
  const job = formatCompanyMoney(company, Number(company.payoutJob));
  const total = formatCompanyMoney(
    company,
    Number(company.payoutAppointment) + Number(company.payoutJob),
  );
  const referLink = `${APP_URL}/dashboard/refer`;
  const settingsLink = `${APP_URL}/dashboard/settings`;
  const fromDisplay = company.name.replace(/["<>]/g, "");

  const subject = `You're in — start earning ${total} per customer you refer to ${company.name}`;

  const html = `
    <div style="font-family:system-ui,sans-serif;color:#222;max-width:560px;">
      <h2 style="color:${company.primaryColor};margin-bottom:8px;">
        Welcome aboard, ${esc(firstName)}
      </h2>
      <p style="color:#444;line-height:1.5;">
        You're now a referral partner for <strong>${esc(company.name)}</strong>.
        Here's the deal, in black and white:
      </p>
      <table style="border-collapse:collapse;font-size:14px;margin:20px 0;">
        <tr><td style="padding:4px 16px 4px 0;color:#888;">Appointment booked</td><td style="padding:4px 0;font-weight:600;">${esc(appointment)}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#888;">Job sells</td><td style="padding:4px 0;font-weight:600;">${esc(job)} more</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#888;">Per customer</td><td style="padding:4px 0;font-weight:600;color:${company.primaryColor};">up to ${esc(total)}</td></tr>
      </table>
      <p style="color:#444;line-height:1.5;">
        Two things to do now:
      </p>
      <ol style="color:#444;font-size:14px;line-height:1.6;padding-left:20px;">
        <li>
          <strong>Send your first referral</strong> — name, mobile and
          postcode is all it takes. Takes under a minute.
        </li>
        <li>
          <strong>Add your bank details</strong> in your account settings
          so payouts can reach you. They're encrypted and only
          ${esc(company.name)} can see them.
        </li>
      </ol>
      <p style="margin-top:24px;">
        <a href="${referLink}" style="background:${company.primaryColor};color:#fff;padding:11px 22px;border-radius:6px;text-decoration:none;font-weight:500;display:inline-block;">Refer a customer</a>
        &nbsp;
        <a href="${settingsLink}" style="color:${company.primaryColor};font-size:14px;">Add bank details →</a>
      </p>
      <p style="margin-top:28px;color:#999;font-size:12px;">
        Tip: save the link on your phone — open ${esc(APP_URL.replace("https://", ""))}
        in your browser and choose "Add to Home Screen" to keep it one tap
        away. Questions? Just reply to this email.
      </p>
    </div>
  `;

  const text = [
    `Welcome aboard, ${firstName}`,
    ``,
    `You're now a referral partner for ${company.name}. The deal:`,
    ``,
    `Appointment booked:  ${appointment}`,
    `Job sells:           ${job} more`,
    `Per customer:        up to ${total}`,
    ``,
    `Two things to do now:`,
    `1. Send your first referral — name, mobile and postcode is all it takes: ${referLink}`,
    `2. Add your bank details so payouts can reach you: ${settingsLink}`,
    ``,
    `Questions? Just reply to this email.`,
  ].join("\n");

  try {
    await resend.emails.send({
      from: `${fromDisplay} <${FROM_EMAIL}>`,
      to: partner.email,
      replyTo: company.contactEmail,
      subject,
      html,
      text,
    });
  } catch (err) {
    console.error("[email] partner welcome failed:", err);
  }
}

/**
 * Forwards an inbound SMS reply (to our Twilio number) to the company
 * whose invite/partner the sender matches. The reply moment is the
 * conversion moment — this email is built to make texting them back
 * effortless: the sender's number is front and centre.
 */
export async function sendInboundSmsForwardEmail(
  company: Pick<Company, "name" | "contactEmail" | "primaryColor">,
  sms: {
    fromNumber: string;
    body: string;
    senderName: string | null;
    senderContext: string; // e.g. "invited 2 days ago", "existing partner"
  },
): Promise<void> {
  if (!resend) {
    console.warn(
      `[email] no RESEND_API_KEY — inbound SMS forward for ${company.contactEmail} skipped`,
    );
    return;
  }

  const who = sms.senderName || sms.fromNumber;
  const subject = `Text reply from ${who}: "${sms.body.slice(0, 60)}${sms.body.length > 60 ? "…" : ""}"`;

  const html = `
    <div style="font-family:system-ui,sans-serif;color:#222;max-width:560px;">
      <h2 style="color:${company.primaryColor};margin-bottom:4px;">
        ${esc(who)} texted back
      </h2>
      <p style="color:#666;margin-top:0;font-size:13px;">
        ${esc(sms.senderContext)} · replied to your ${esc(platform.name)} invite number
      </p>
      <blockquote style="border-left:3px solid ${company.primaryColor};margin:20px 0;padding:8px 16px;background:#f8fafc;font-size:15px;white-space:pre-wrap;">${esc(sms.body)}</blockquote>
      <p style="font-size:14px;color:#444;">
        Reply directly from your own phone:
        <a href="sms:${esc(sms.fromNumber)}" style="color:${company.primaryColor};font-weight:600;">${esc(sms.fromNumber)}</a>
      </p>
      <p style="margin-top:24px;color:#999;font-size:12px;">
        Texts to the invite number aren't a two-way inbox — replies land
        here as email. Texting them back from your own number keeps the
        conversation personal.
      </p>
    </div>
  `;

  const text = [
    `${who} texted back (${sms.senderContext}):`,
    ``,
    `"${sms.body}"`,
    ``,
    `Reply directly from your own phone: ${sms.fromNumber}`,
  ].join("\n");

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: company.contactEmail,
      subject,
      html,
      text,
    });
  } catch (err) {
    console.error("[email] inbound SMS forward failed:", err);
  }
}

/**
 * Goes to a PARTNER the moment a payout goes PENDING for them while
 * they have no bank details on file. This is the "Sarah refers a
 * customer, the appointment books, £50 sits unpayable, Sarah ghosts"
 * loop-closer. Branded as the company, same as the welcome email.
 *
 * Sent once per triggering status change (not on a nagging schedule) —
 * the company's payouts page flags missing details for manual chasing
 * if this doesn't land.
 */
export async function sendBankDetailsNeededEmail(
  partner: { email: string; fullName: string | null },
  company: CompanyPayload,
  amounts: { justEarned: number; totalPending: number },
): Promise<void> {
  if (!resend) {
    console.warn(
      `[email] no RESEND_API_KEY — bank-details-needed for ${partner.email} skipped`,
    );
    return;
  }

  const firstName = partner.fullName?.trim().split(/\s+/)[0] || "there";
  const justEarned = formatCompanyMoney(company, amounts.justEarned);
  const totalPending = formatCompanyMoney(company, amounts.totalPending);
  const settingsLink = `${APP_URL}/dashboard/settings`;
  const fromDisplay = company.name.replace(/["<>]/g, "");

  const subject = `You've earned ${justEarned} — add your bank details so ${company.name} can pay you`;

  const html = `
    <div style="font-family:system-ui,sans-serif;color:#222;max-width:560px;">
      <h2 style="color:${company.primaryColor};margin-bottom:8px;">
        Good news, ${esc(firstName)} — you're owed money
      </h2>
      <p style="color:#444;line-height:1.5;">
        One of your referrals just moved forward, which puts
        <strong> ${esc(justEarned)}</strong> in your pending payouts
        ${
          amounts.totalPending > amounts.justEarned
            ? `(<strong>${esc(totalPending)}</strong> pending in total)`
            : ""
        }.
      </p>
      <p style="color:#444;line-height:1.5;">
        One snag: <strong>${esc(company.name)} has nowhere to send it</strong> —
        you haven't added your bank details yet. Takes under a minute:
      </p>
      <p style="margin-top:20px;">
        <a href="${settingsLink}" style="background:${company.primaryColor};color:#fff;padding:11px 22px;border-radius:6px;text-decoration:none;font-weight:500;display:inline-block;">Add my bank details</a>
      </p>
      <p style="margin-top:24px;color:#999;font-size:12px;">
        Your sort code and account number are encrypted the moment you save
        them, and only ${esc(company.name)} can see them — and only when
        they're actually paying you. Questions? Just reply to this email.
      </p>
    </div>
  `;

  const text = [
    `Good news, ${firstName} — you're owed money`,
    ``,
    `One of your referrals just moved forward, which puts ${justEarned} in your pending payouts${amounts.totalPending > amounts.justEarned ? ` (${totalPending} pending in total)` : ""}.`,
    ``,
    `One snag: ${company.name} has nowhere to send it — you haven't added your bank details yet. Takes under a minute:`,
    ``,
    settingsLink,
    ``,
    `Your details are encrypted on save and only ${company.name} can see them. Questions? Just reply to this email.`,
  ].join("\n");

  try {
    await resend.emails.send({
      from: `${fromDisplay} <${FROM_EMAIL}>`,
      to: partner.email,
      replyTo: company.contactEmail,
      subject,
      html,
      text,
    });
  } catch (err) {
    console.error("[email] bank-details-needed failed:", err);
  }
}

// Goes to the new Company admin when they sign up — confirms the account
// is set up and gives them the key URLs (landing page, partner signup link,
// login). Sent in addition to (not instead of) the operator notification.
//
// Does not require NOTIFY_EMAIL to be configured — sends directly to the
// company contactEmail. The platform RESEND_API_KEY is the only hard
// requirement; without it we log a warning and move on.
export async function sendCompanyWelcomeEmail(
  company: Pick<Company, "name" | "slug" | "contactEmail" | "trialEndsAt">,
  ownerName: string,
): Promise<void> {
  if (!resend) {
    console.warn(
      `[email] no RESEND_API_KEY — welcome email for ${company.contactEmail} skipped`,
    );
    return;
  }

  const landingLink = `${APP_URL}/${company.slug}`;
  const signupLink = `${APP_URL}/${company.slug}/signup`;
  const loginLink = `${APP_URL}/login`;
  const settingsLink = `${APP_URL}/company/settings`;

  const trialEndsFormatted = company.trialEndsAt
    ? company.trialEndsAt.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const subject = `Welcome to ${platform.name}, ${company.name}`;
  const firstName = ownerName.split(" ")[0] || ownerName;

  const html = `
    <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
      <h2 style="color:${platform.colors.primary};margin-bottom:4px;">Welcome to ${esc(platform.name)}, ${esc(firstName)}</h2>
      <p style="color:#666;margin-top:0;">
        Your ${esc(platform.name)} account is set up and your branded landing
        page is live. Here's everything you need to get started.
      </p>

      <h3 style="margin-top:28px;color:${platform.colors.primary};font-size:15px;">Your links</h3>
      <table style="border-collapse:collapse;font-size:14px;width:100%;">
        <tr>
          <td style="padding:6px 12px 6px 0;color:#888;vertical-align:top;width:160px;">Landing page</td>
          <td style="padding:6px 0;"><a href="${landingLink}" style="color:${platform.colors.primary};word-break:break-all;">${esc(landingLink)}</a><br/><span style="color:#999;font-size:12px;">Public marketing page — share this with potential customers</span></td>
        </tr>
        <tr>
          <td style="padding:6px 12px 6px 0;color:#888;vertical-align:top;">Partner signup link</td>
          <td style="padding:6px 0;"><a href="${signupLink}" style="color:${platform.colors.primary};word-break:break-all;font-weight:500;">${esc(signupLink)}</a><br/><span style="color:#999;font-size:12px;">Send this to the tradesmen you want referrals from</span></td>
        </tr>
        <tr>
          <td style="padding:6px 12px 6px 0;color:#888;vertical-align:top;">Log in</td>
          <td style="padding:6px 0;"><a href="${loginLink}" style="color:${platform.colors.primary};">${esc(loginLink)}</a></td>
        </tr>
      </table>

      ${
        trialEndsFormatted
          ? `<h3 style="margin-top:28px;color:${platform.colors.primary};font-size:15px;">Your free trial</h3>
      <p style="font-size:14px;color:#444;margin:6px 0;">
        You're on a ${platform.pricing.trialDays}-day free trial until
        <strong>${esc(trialEndsFormatted)}</strong>. After that it's
        ${platform.pricing.currencySymbol}${platform.pricing.monthly}/month.
        Cancel anytime — no contracts.
      </p>`
          : ""
      }

      <h3 style="margin-top:28px;color:${platform.colors.primary};font-size:15px;">First steps</h3>
      <ol style="font-size:14px;color:#444;padding-left:20px;">
        <li style="margin-bottom:8px;"><strong>Upload your logo and pick your brand colours</strong> — they'll show on your landing page and partner dashboards.</li>
        <li style="margin-bottom:8px;"><strong>Tune your payouts</strong> — set what you pay per appointment and per job sold.</li>
        <li style="margin-bottom:8px;"><strong>Share your signup link</strong> with the tradesmen you want to refer customers from.</li>
      </ol>

      <p style="margin-top:24px;">
        <a href="${settingsLink}" style="background:${platform.colors.primary};color:#fff;padding:11px 22px;border-radius:6px;text-decoration:none;font-weight:500;display:inline-block;">Open your settings</a>
      </p>

      <p style="margin-top:32px;color:#999;font-size:12px;">
        Need a hand? Reply to this email or write to
        <a href="mailto:${esc(platform.supportEmail)}" style="color:${platform.colors.primary};">${esc(platform.supportEmail)}</a>.
      </p>
    </div>
  `;

  const text = [
    `Welcome to ${platform.name}, ${firstName}`,
    ``,
    `Your ${platform.name} account is set up and your branded landing page is live.`,
    ``,
    `YOUR LINKS`,
    `Landing page:        ${landingLink}`,
    `Partner signup link: ${signupLink}`,
    `Log in:              ${loginLink}`,
    ``,
    trialEndsFormatted
      ? `Free trial ends: ${trialEndsFormatted} (${platform.pricing.trialDays}-day trial, then ${platform.pricing.currencySymbol}${platform.pricing.monthly}/month)`
      : null,
    ``,
    `FIRST STEPS`,
    `1. Upload your logo and pick your brand colours`,
    `2. Tune your payouts (per appointment, per job sold)`,
    `3. Share your signup link with tradesmen`,
    ``,
    `Open your settings: ${settingsLink}`,
    ``,
    `Need a hand? Reply to this email or write to ${platform.supportEmail}.`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: company.contactEmail,
      replyTo: platform.supportEmail,
      subject,
      html,
      text,
    });
  } catch (err) {
    console.error("[email] welcome email failed:", err);
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

/**
 * Email a referrer when their referred company makes its first payment
 * (so the discount has just activated). Sent to the company's
 * contactEmail. Short, transactional — celebrates the win without
 * marketing fluff.
 */
export async function sendReferralQualifiedEmail(
  referrer: { contactEmail: string; name: string },
  referredCompanyName: string,
  newPercentOff: number,
  monthlyPrice: number,
  currencySymbol: string,
): Promise<void> {
  if (!resend) {
    console.warn(
      `[email] no RESEND_API_KEY — referral-qualified email for ${referrer.contactEmail} skipped`,
    );
    return;
  }

  const newMonthly = Math.max(
    0,
    monthlyPrice - (monthlyPrice * newPercentOff) / 100,
  );
  const subject =
    newPercentOff === 100
      ? `🎉 ${referredCompanyName} just paid — your ${platform.name} subscription is free`
      : `${referredCompanyName} just paid — you're now ${newPercentOff}% off`;

  const html = `
    <div style="font-family:system-ui,sans-serif;color:#222;max-width:560px;">
      <h2 style="color:${platform.colors.primary};margin-bottom:8px;">
        ${
          newPercentOff === 100
            ? "Your subscription is now free"
            : `Your discount just bumped to ${newPercentOff}%`
        }
      </h2>
      <p style="color:#444;line-height:1.5;">
        Good news ${esc(referrer.name.split(" ")[0] || "")} —
        <strong>${esc(referredCompanyName)}</strong> just made their first
        payment on ${esc(platform.name)}. That activates your referral
        discount.
      </p>
      <table style="border-collapse:collapse;font-size:14px;margin:20px 0;">
        <tr><td style="padding:4px 16px 4px 0;color:#888;">Your new rate</td><td style="padding:4px 0;font-weight:600;">${esc(currencySymbol)}${newMonthly.toFixed(2)}/month</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#888;">Discount applied</td><td style="padding:4px 0;">${newPercentOff}% off ${esc(currencySymbol)}${monthlyPrice}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#888;">When it lands</td><td style="padding:4px 0;">From your next invoice</td></tr>
      </table>
      <p style="color:#666;font-size:13px;">
        The discount stays as long as ${esc(referredCompanyName)} keeps
        their subscription. If they cancel you'll lose that 25% slice —
        we'll let you know if that happens.
      </p>
      ${
        newPercentOff < 100
          ? `<p style="color:#666;font-size:13px;">Refer ${(100 - newPercentOff) / 25} more paying companies and your subscription is free forever.</p>`
          : ""
      }
      <p style="margin-top:24px;">
        <a href="${APP_URL}/company/network" style="background:${platform.colors.primary};color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:500;display:inline-block;">View your network</a>
      </p>
    </div>
  `;

  const text = [
    newPercentOff === 100
      ? `Your ${platform.name} subscription is now free.`
      : `Your discount just bumped to ${newPercentOff}%.`,
    ``,
    `${referredCompanyName} just made their first payment on ${platform.name}.`,
    ``,
    `Your new rate: ${currencySymbol}${newMonthly.toFixed(2)}/month`,
    `Discount applied: ${newPercentOff}% off ${currencySymbol}${monthlyPrice}`,
    `When it lands: from your next invoice`,
    ``,
    `View your network: ${APP_URL}/company/network`,
  ].join("\n");

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: referrer.contactEmail,
      subject,
      html,
      text,
    });
  } catch (err) {
    console.error("[email] referral-qualified send failed:", err);
  }
}

/**
 * Email a referrer when one of their referred companies churns (so
 * their discount has just dropped). Honest, not dramatic. We tell them
 * the new rate, not how much they "lost" — different framing.
 */
export async function sendReferralChurnedEmail(
  referrer: { contactEmail: string; name: string },
  churnedCompanyName: string,
  newPercentOff: number,
  monthlyPrice: number,
  currencySymbol: string,
): Promise<void> {
  if (!resend) {
    console.warn(
      `[email] no RESEND_API_KEY — referral-churned email for ${referrer.contactEmail} skipped`,
    );
    return;
  }

  const newMonthly = Math.max(
    0,
    monthlyPrice - (monthlyPrice * newPercentOff) / 100,
  );
  const subject = `${churnedCompanyName} cancelled — your ${platform.name} discount is now ${newPercentOff}%`;

  const html = `
    <div style="font-family:system-ui,sans-serif;color:#222;max-width:560px;">
      <h2 style="color:${platform.colors.primary};margin-bottom:8px;">
        ${esc(churnedCompanyName)} has cancelled their ${esc(platform.name)} subscription
      </h2>
      <p style="color:#444;line-height:1.5;">
        That removes one of your referral discount slices — your
        subscription will be ${esc(currencySymbol)}${newMonthly.toFixed(2)}/month from
        the next invoice (was ${esc(currencySymbol)}${monthlyPrice} at the
        full rate).
      </p>
      <p style="color:#666;font-size:13px;">
        ${
          newPercentOff === 0
            ? `Refer another paying company and you're back to 25% off.`
            : `You're still at ${newPercentOff}% off thanks to your other active referrals.`
        }
      </p>
      <p style="margin-top:24px;">
        <a href="${APP_URL}/company/network" style="background:${platform.colors.primary};color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:500;display:inline-block;">View your network</a>
      </p>
    </div>
  `;

  const text = [
    `${churnedCompanyName} has cancelled their ${platform.name} subscription.`,
    ``,
    `Your subscription will be ${currencySymbol}${newMonthly.toFixed(2)}/month from the next invoice (was ${currencySymbol}${monthlyPrice} at the full rate).`,
    ``,
    newPercentOff === 0
      ? `Refer another paying company and you're back to 25% off.`
      : `You're still at ${newPercentOff}% off thanks to your other active referrals.`,
    ``,
    `View your network: ${APP_URL}/company/network`,
  ].join("\n");

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: referrer.contactEmail,
      subject,
      html,
      text,
    });
  } catch (err) {
    console.error("[email] referral-churned send failed:", err);
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
