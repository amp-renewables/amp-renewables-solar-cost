// Fixed-window rate limiter for unauthenticated auth endpoints. Postgres-
// backed (RateLimit model) so it works on serverless with no extra infra —
// at auth volumes the per-request write cost is negligible.
//
// Keyed by caller IP. This defends a single source brute-forcing one
// account; it does NOT stop distributed credential-stuffing across many
// IPs (that needs a WAF / per-account lockout) — a deliberate, proportionate
// line for current scale.
//
// Fails OPEN: if the limiter errors, we allow the request. Locking everyone
// out of login because the limiter had a hiccup is worse than the attack it
// guards against.

import "server-only";
import { headers } from "next/headers";
import { prisma } from "./db";

/** Best-effort caller IP. Cloudflare sits in front, so cf-connecting-ip is
 *  the true client; fall back through the standard proxy headers. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const cf = h.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return h.get("x-real-ip")?.trim() || "unknown";
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

export async function rateLimit(
  bucket: string,
  identifier: string,
  opts: { limit: number; windowSec: number },
): Promise<RateLimitResult> {
  const now = new Date();
  const windowMs = opts.windowSec * 1000;
  const where = { bucket_identifier: { bucket, identifier } };

  try {
    const existing = await prisma.rateLimit.findUnique({ where });

    // No row, or the previous window has elapsed → start a fresh window.
    if (!existing || now.getTime() - existing.windowStart.getTime() >= windowMs) {
      await prisma.rateLimit.upsert({
        where,
        create: { bucket, identifier, count: 1, windowStart: now },
        update: { count: 1, windowStart: now },
      });
      return { ok: true };
    }

    if (existing.count >= opts.limit) {
      const retryAfterSec = Math.ceil(
        (existing.windowStart.getTime() + windowMs - now.getTime()) / 1000,
      );
      return { ok: false, retryAfterSec: Math.max(retryAfterSec, 1) };
    }

    await prisma.rateLimit.update({ where, data: { count: { increment: 1 } } });
    return { ok: true };
  } catch (err) {
    console.error("[rate-limit] check failed, allowing:", err);
    return { ok: true };
  }
}
