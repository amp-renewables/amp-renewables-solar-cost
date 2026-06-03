// Application-layer encryption for personally-sensitive fields (currently
// partner bank sort code + account number).
//
// THREAT MODEL:
//   - Defends against: leaked database dump, compromised Neon credentials,
//     unauthorised DB-level reads (e.g. accidental backup exposure).
//   - Does NOT defend against: a fully-compromised TradeRefer deployment
//     with access to both DB *and* the BANK_ENCRYPTION_KEY env var. That's
//     the same trust boundary as our auth secret — protect it the same way.
//
// FORMAT:
//   - AES-256-GCM authenticated encryption (detects tampering on read).
//   - Per-record random 12-byte IV.
//   - Storage envelope = base64( IV(12) || tag(16) || ciphertext )
//   - Key = 32 bytes (256 bits), hex-encoded in BANK_ENCRYPTION_KEY env var
//     (64 hex chars total). Generate with:
//       node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
//
// ROTATION:
//   - The key is bound to the stored ciphertext. Rotating means re-encrypting
//     every row with the new key in a single migration, then atomically
//     swapping the env var. Avoid rotation unless we suspect compromise —
//     the operational cost is meaningful.
//
// SEARCHABILITY:
//   - Ciphertext is non-deterministic (random IV), so two encryptions of the
//     same value produce different output. We don't currently need to search
//     by bank field, so this is fine. If we ever do, add a HMAC-SHA256(key2,
//     value) sidecar column for equality search.

import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

/** Lazy-loaded key — read once on first use so missing env in dev doesn't
 *  break unrelated code paths. */
let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const hex = process.env.BANK_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error(
      "BANK_ENCRYPTION_KEY is not set. Bank-field encryption cannot " +
        "proceed. Generate one with: " +
        `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`,
    );
  }
  const buf = Buffer.from(hex, "hex");
  if (buf.length !== KEY_BYTES) {
    throw new Error(
      `BANK_ENCRYPTION_KEY must be ${KEY_BYTES} bytes (${KEY_BYTES * 2} hex chars); ` +
        `got ${buf.length} bytes.`,
    );
  }
  cachedKey = buf;
  return cachedKey;
}

/**
 * Encrypt a string for at-rest storage. Returns a base64-encoded envelope
 * containing IV + auth tag + ciphertext.
 *
 * Each call produces a different ciphertext for the same input (random IV).
 *
 * Throws if BANK_ENCRYPTION_KEY isn't configured.
 */
export function encryptField(plain: string): string {
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ct = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("base64");
}

/**
 * Decrypt an envelope produced by encryptField. Throws if the envelope is
 * malformed, the auth tag doesn't verify (tampered ciphertext), or the key
 * is wrong (post-rotation pre-migration data).
 */
export function decryptField(envelope: string): string {
  const key = getKey();
  const buf = Buffer.from(envelope, "base64");
  if (buf.length < IV_BYTES + TAG_BYTES + 1) {
    throw new Error("Encrypted envelope is too short to be valid.");
  }
  const iv = buf.subarray(0, IV_BYTES);
  const tag = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ct = buf.subarray(IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString(
    "utf8",
  );
}

/**
 * Best-effort decrypt. Returns null on any failure. Use when partial
 * display (e.g. masked view) is acceptable and you don't want a malformed
 * row to crash an admin page.
 */
export function tryDecryptField(envelope: string | null): string | null {
  if (!envelope) return null;
  try {
    return decryptField(envelope);
  } catch (err) {
    console.error("[crypto] decrypt failed:", err);
    return null;
  }
}
