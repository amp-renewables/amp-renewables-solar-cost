// Inbound SMS webhook. Twilio POSTs here whenever someone texts our
// invite number. Without this, replies hit Twilio's unconfigured
// default and vanish — and a reply IS the conversion moment ("sounds
// good, how do I sign up?").
//
// FLOW:
//   1. Validate the X-Twilio-Signature header (HMAC-SHA1 over the URL +
//      sorted form params, keyed with our auth token) so random callers
//      can't spoof inbound messages.
//   2. Match the sender's number against PartnerInvite rows (most recent
//      first), then against existing PARTNER users. That tells us which
//      company the conversation belongs to.
//   3. Forward the message to that company's contactEmail with the
//      sender's number front-and-centre for a personal text back.
//   4. Respond with TwiML: a short acknowledgement when matched, silence
//      when not (unmatched = probably spam; don't confirm the number is
//      live).
//
// STOP/opt-out keywords never reach us — Twilio intercepts them on long
// codes and suppresses future sends automatically (our sends then fail
// with error 21610, surfacing as FAILED in the invites table).

import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { sendInboundSmsForwardEmail } from "@/lib/email";
import { platform } from "@/lib/platform";

export const runtime = "nodejs";
export const maxDuration = 30;

const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

export async function POST(request: Request) {
  if (!AUTH_TOKEN) {
    console.error("[sms-inbound] TWILIO_AUTH_TOKEN not configured");
    return twiml(null, 500);
  }

  // Twilio sends application/x-www-form-urlencoded.
  const raw = await request.text();
  const params = new URLSearchParams(raw);

  // --- 1. Signature validation ---------------------------------------
  // Twilio's scheme: Base64(HMAC-SHA1(authToken, url + concat(sorted
  // key+value pairs))). The URL must be exactly what Twilio called —
  // we reconstruct from APP_URL to stay stable behind proxies.
  const signature = request.headers.get("x-twilio-signature") ?? "";
  const url = `${platform.url}/api/sms/inbound`;
  const sortedConcat = [...params.keys()]
    .sort()
    .map((k) => k + (params.get(k) ?? ""))
    .join("");
  const expected = createHmac("sha1", AUTH_TOKEN)
    .update(url + sortedConcat)
    .digest("base64");

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    console.warn("[sms-inbound] signature validation failed");
    return twiml(null, 403);
  }

  const fromNumber = params.get("From") ?? "";
  const body = (params.get("Body") ?? "").trim();
  if (!fromNumber || !body) {
    return twiml(null, 200);
  }

  // --- 2. Identify the sender ----------------------------------------
  // Most recent invite for this number wins (if two companies invited
  // the same roofer, the latest conversation is the likeliest context).
  const invite = await prisma.partnerInvite.findFirst({
    where: { phone: fromNumber },
    orderBy: { createdAt: "desc" },
    include: {
      company: {
        select: { name: true, contactEmail: true, primaryColor: true },
      },
    },
  });

  let company = invite?.company ?? null;
  let senderName = invite?.name ?? null;
  let senderContext = invite
    ? `Invited ${invite.sentAt ? invite.sentAt.toLocaleDateString("en-GB") : "recently"}${invite.status === "SIGNED_UP" ? ", already signed up" : ""}`
    : "";

  if (!company) {
    // Fall back to existing partners — their phone is stored as typed at
    // signup, so match loosely on the last 10 digits.
    const last10 = fromNumber.replace(/\D/g, "").slice(-10);
    if (last10.length === 10) {
      const partner = await prisma.user.findFirst({
        where: {
          phone: { contains: last10.slice(-9) },
          memberships: {
            some: { role: { in: ["BUSINESS_PARTNER", "AMBASSADOR"] } },
          },
        },
        select: {
          fullName: true,
          businessName: true,
          // Multi-org: a partner can refer to several companies. Route
          // the text to their oldest programme — without message context
          // there's no better signal, and the forward email shows the
          // sender's number so the admin can redirect if it was meant
          // for someone else.
          memberships: {
            where: { role: { in: ["BUSINESS_PARTNER", "AMBASSADOR"] } },
            orderBy: { createdAt: "asc" },
            take: 1,
            select: {
              company: {
                select: { name: true, contactEmail: true, primaryColor: true },
              },
            },
          },
        },
      });
      if (partner?.memberships[0]?.company) {
        company = partner.memberships[0].company;
        senderName = partner.fullName ?? partner.businessName;
        senderContext = "Existing partner";
      }
    }
  }

  // --- 3. Forward + 4. respond ---------------------------------------
  if (!company) {
    // Unknown number. Log for diagnostics, reply with nothing — don't
    // confirm to a potential spammer that the number is monitored.
    console.log(
      `[sms-inbound] unmatched sender ${fromNumber}: "${body.slice(0, 80)}"`,
    );
    return twiml(null, 200);
  }

  await sendInboundSmsForwardEmail(company, {
    fromNumber,
    body,
    senderName,
    senderContext,
  });

  return twiml(
    `Thanks — your message has been passed to ${company.name} and they'll get back to you directly.`,
    200,
  );
}

/** Build a TwiML response. Pass null for an empty <Response/> (no reply). */
function twiml(message: string | null, status: number): Response {
  const xml = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response/>`;
  return new Response(xml, {
    status,
    headers: { "Content-Type": "text/xml" },
  });
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
