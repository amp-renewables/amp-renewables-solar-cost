// SMS sending via Twilio's REST API. Deliberately uses fetch rather
// than the twilio npm SDK — the SDK is ~5MB of dependency for what is,
// for us, a single authenticated POST.
//
// CONFIGURATION (Vercel env vars):
//   TWILIO_ACCOUNT_SID  — starts AC…
//   TWILIO_AUTH_TOKEN   — from the Twilio console
//   TWILIO_FROM         — a Twilio number in E.164 (+447…) or an
//                         approved UK alphanumeric sender ID
//
// If any are missing, smsConfigured() is false and sendSms() returns a
// clear failure rather than throwing — the invites UI shows "SMS not
// set up yet" and the email channel keeps working. This lets the whole
// feature ship before the Twilio account exists.
//
// UK COMPLIANCE NOTE: companies invite their own business contacts
// (confirmed by checkbox at send time), which sits under legitimate
// business communication rather than cold marketing. The default
// template still includes an opt-out line. If Twilio is configured
// with a UK long number, recipients can reply STOP and Twilio handles
// suppression automatically.

import "server-only";

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const FROM = process.env.TWILIO_FROM;

export function smsConfigured(): boolean {
  return Boolean(ACCOUNT_SID && AUTH_TOKEN && FROM);
}

export type SmsResult =
  | { ok: true; sid: string }
  | { ok: false; error: string };

/**
 * Send one SMS. Returns a result object, never throws — callers batch
 * over contact lists and one bad number shouldn't abort the run.
 */
export async function sendSms(to: string, body: string): Promise<SmsResult> {
  if (!ACCOUNT_SID || !AUTH_TOKEN || !FROM) {
    return {
      ok: false,
      error:
        "SMS isn't configured yet — the platform owner needs to add Twilio credentials.",
    };
  }

  const normalised = normaliseUkNumber(to);
  if (!normalised) {
    return { ok: false, error: `"${to}" doesn't look like a UK mobile number.` };
  }

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: normalised,
          From: FROM,
          Body: body,
        }),
      },
    );

    const data = (await res.json()) as {
      sid?: string;
      message?: string;
      code?: number;
    };

    if (!res.ok || !data.sid) {
      return {
        ok: false,
        error: data.message || `Twilio returned HTTP ${res.status}`,
      };
    }
    return { ok: true, sid: data.sid };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error sending SMS",
    };
  }
}

/**
 * Normalise common UK mobile formats to E.164. Accepts:
 *   07xxx xxxxxx   → +447xxxxxxxxx
 *   +447xxxxxxxxx  → unchanged
 *   447xxxxxxxxx   → +447xxxxxxxxx
 * Returns null for anything that doesn't look like a UK mobile.
 */
export function normaliseUkNumber(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  if (/^\+447\d{9}$/.test(digits)) return digits;
  if (/^447\d{9}$/.test(digits)) return `+${digits}`;
  if (/^07\d{9}$/.test(digits)) return `+44${digits.slice(1)}`;
  return null;
}
