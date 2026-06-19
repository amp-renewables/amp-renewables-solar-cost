// Weekly DB backup → Vercel Blob. Triggered by Vercel Cron on Sundays
// at 03:00 UTC. Belt-and-braces on top of Neon's own point-in-time
// restore window (6h on the free tier) — gives us up to 90 days of
// weekly snapshots in storage outside Neon, so we can recover from
// "noticed a corruption bug 3 days later" type failures and also from
// the unlikely-but-non-zero case of Neon itself losing our project.
//
// FORMAT: Single JSON snapshot, all tables included. Decimal, BigInt and
// Date values go through a custom replacer so they round-trip cleanly. The
// whole payload is then AES-256-GCM encrypted with BACKUP_ENCRYPTION_KEY
// before upload (see src/lib/crypto.ts) — the dump contains cross-tenant
// customer/partner PII, and Vercel Blob is public-by-URL, so encryption is
// the access control. Files are stored with a `.json.enc` extension. Bank
// columns are additionally BANK_ENCRYPTION_KEY ciphertext (defence in depth).
//
// AUTH: Vercel Cron sends an `Authorization: Bearer <CRON_SECRET>`
// header; we reject anything else with 401. This stops random callers
// triggering an expensive backup or harvesting the JSON file URL from
// any logs that might leak.
//
// RETENTION: After a successful upload, prune backups older than
// RETENTION_DAYS. We never delete the just-created one even if its
// timestamp somehow looks older.

import { NextResponse } from "next/server";
import { put, list, del } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { backupEncryptionConfigured, encryptBackup } from "@/lib/crypto";
import { reportError } from "@/lib/report-error";

// Force the route to run on the Node.js runtime (not edge) — Prisma
// needs the Node runtime, and pg connections work properly there.
export const runtime = "nodejs";
// Vercel free-tier function timeout is 10s; Pro is 60s. The dump should
// complete in well under 5s at TradeRefer's data size, but bump the
// ceiling defensively so a slow Neon cold-start doesn't kill us.
export const maxDuration = 60;

const RETENTION_DAYS = 90;
const SCHEMA_VERSION = 1;

export async function GET(request: Request) {
  // --- 1. Authorisation ------------------------------------------------
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    console.error("[cron-backup] CRON_SECRET is not configured");
    return NextResponse.json(
      { ok: false, error: "Backups not configured" },
      { status: 500 },
    );
  }
  const got = request.headers.get("authorization");
  if (got !== `Bearer ${expected}`) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  // --- 2. Dump every table --------------------------------------------
  let dump: Record<string, unknown>;
  try {
    dump = await collectDump();
  } catch (err) {
    await reportError("cron-backup:dump", err);
    return NextResponse.json(
      { ok: false, error: "Dump failed", detail: String(err) },
      { status: 500 },
    );
  }

  const json = JSON.stringify(dump, jsonReplacer, 2);

  // --- 3. Encrypt ------------------------------------------------------
  // The dump is a full cross-tenant export of customer/partner PII. Vercel
  // Blob is public-by-URL, so we encrypt the payload with a dedicated key
  // (held outside Blob) before upload — a leaked URL then yields ciphertext.
  // If the key isn't configured we REFUSE to write rather than silently
  // emit a cleartext PII dump to public storage.
  if (!backupEncryptionConfigured()) {
    await reportError(
      "cron-backup:config",
      new Error(
        "BACKUP_ENCRYPTION_KEY not set — refusing to write an unencrypted " +
          "PII dump to public storage",
      ),
    );
    return NextResponse.json(
      { ok: false, error: "Backup encryption key not configured" },
      { status: 500 },
    );
  }

  let body: string;
  try {
    body = encryptBackup(json);
  } catch (err) {
    await reportError("cron-backup:encrypt", err);
    return NextResponse.json(
      { ok: false, error: "Encryption failed", detail: String(err) },
      { status: 500 },
    );
  }

  // --- 4. Upload ------------------------------------------------------
  // Timestamp first so listings sort newest-last alphabetically. The
  // random suffix still adds a layer, but encryption is the real defence.
  // `.enc` extension marks the payload as an encryptBackup envelope for the
  // restore script.
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const key = `backups/v${SCHEMA_VERSION}/${stamp}.json.enc`;

  let uploadedUrl: string;
  try {
    const blob = await put(key, body, {
      access: "public",
      addRandomSuffix: true,
      contentType: "application/octet-stream",
      cacheControlMaxAge: 0,
    });
    uploadedUrl = blob.url;
  } catch (err) {
    await reportError("cron-backup:upload", err);
    return NextResponse.json(
      { ok: false, error: "Upload failed", detail: String(err) },
      { status: 500 },
    );
  }

  // --- 5. Prune --------------------------------------------------------
  const pruned = await pruneOldBackups(uploadedUrl);

  // --- 6. Done ---------------------------------------------------------
  return NextResponse.json({
    ok: true,
    snapshotKey: key,
    snapshotUrl: uploadedUrl,
    bytes: body.length,
    tables: Object.fromEntries(
      Object.entries(dump.tables as Record<string, unknown[]>).map(
        ([name, rows]) => [name, rows.length],
      ),
    ),
    prunedCount: pruned,
  });
}

// --- Dump helpers ------------------------------------------------------

async function collectDump() {
  // Run table reads in parallel — they're independent and small.
  const [
    companies,
    users,
    sessions,
    resetTokens,
    referrals,
    referralStatusEvents,
    payouts,
    messageTemplates,
    bankAccess,
  ] = await Promise.all([
    prisma.company.findMany(),
    prisma.user.findMany(),
    prisma.session.findMany(),
    prisma.passwordResetToken.findMany(),
    prisma.referral.findMany(),
    prisma.referralStatusEvent.findMany(),
    prisma.payout.findMany(),
    prisma.messageTemplate.findMany(),
    prisma.bankDetailsAccess.findMany(),
  ]);

  return {
    schemaVersion: SCHEMA_VERSION,
    dumpedAt: new Date().toISOString(),
    tables: {
      Company: companies,
      User: users,
      Session: sessions,
      PasswordResetToken: resetTokens,
      Referral: referrals,
      ReferralStatusEvent: referralStatusEvents,
      Payout: payouts,
      MessageTemplate: messageTemplates,
      BankDetailsAccess: bankAccess,
    },
  };
}

/**
 * JSON.stringify replacer that round-trips the Prisma types we
 * actually use. Date is already handled by stringify (ISO string);
 * Decimal needs converting to a string; BigInt would otherwise throw.
 * Buffers / Uint8Arrays get base64 — we don't currently store any but
 * the cost is negligible to future-proof.
 */
function jsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "object" && value !== null) {
    // Prisma Decimal — duck-type rather than import the runtime type
    // (avoids a hard dep on @prisma/client/runtime path that's changed
    // between Prisma versions).
    const maybeDecimal = value as { toFixed?: unknown; constructor?: { name?: string } };
    if (
      typeof maybeDecimal.toFixed === "function" &&
      maybeDecimal.constructor?.name === "Decimal"
    ) {
      return (value as { toString: () => string }).toString();
    }
  }
  return value;
}

// --- Pruning ----------------------------------------------------------

async function pruneOldBackups(keepUrl: string): Promise<number> {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  let pruned = 0;
  try {
    // List everything under backups/ — small list at our cadence
    // (52 weekly snapshots × however many retention windows we've
    // accumulated). No pagination needed at sensible retention.
    const result = await list({ prefix: "backups/" });
    for (const blob of result.blobs) {
      if (blob.url === keepUrl) continue;
      if (blob.uploadedAt.getTime() < cutoff) {
        try {
          await del(blob.url);
          pruned += 1;
        } catch (err) {
          console.error(
            "[cron-backup] failed to prune",
            blob.pathname,
            err,
          );
        }
      }
    }
  } catch (err) {
    console.error("[cron-backup] list during prune failed:", err);
  }
  return pruned;
}
