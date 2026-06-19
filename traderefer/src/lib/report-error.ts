// Lightweight server-side error alerting for the paths that otherwise fail
// SILENTLY — the Stripe webhook (billing breaking with no signal) and the
// backup cron. Always logs; additionally emails the platform inbox when
// Resend + NOTIFY_EMAIL are configured.
//
// This is deliberately minimal, not a replacement for full error monitoring.
// When traffic grows, swap the email for Sentry (@sentry/nextjs) — wire it
// here and the call sites don't change. Best-effort: never throws, so a
// failing alert can't break the path it's reporting on.

import "server-only";
import { Resend } from "resend";
import { platform } from "./platform";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL;
const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";

export async function reportError(
  context: string,
  error: unknown,
  extra?: Record<string, unknown>,
): Promise<void> {
  // Always log — this is the floor even when email isn't configured.
  console.error(`[${context}]`, error, extra ?? "");

  if (!resend || !NOTIFY_EMAIL) return;

  const detail =
    error instanceof Error
      ? `${error.name}: ${error.message}\n\n${error.stack ?? ""}`
      : String(error);
  const extraBlock = extra
    ? `\n\nContext:\n${JSON.stringify(extra, null, 2)}`
    : "";

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: NOTIFY_EMAIL,
      subject: `[${platform.name}] error: ${context}`,
      text: `An error was reported on ${platform.name}.\n\nWhere: ${context}\n\n${detail}${extraBlock}`,
    });
  } catch (sendErr) {
    // Don't let a failing alert mask the original error.
    console.error("[report-error] failed to send alert email:", sendErr);
  }
}
