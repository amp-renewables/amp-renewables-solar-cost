// One-off maintenance: delete the PRE-ENCRYPTION cleartext backup blobs from
// Vercel Blob (the snapshots written before 2026-06-19, when the dump became
// AES-256-GCM encrypted). Those cleartext `.json` files are the actual PII
// exposure — this removes them.
//
// SAFETY:
//   - Dry-run by DEFAULT. Prints what it WOULD delete and exits. Pass
//     --confirm to actually delete.
//   - Only targets backups/**/*.json (the old cleartext format). NEVER
//     touches the new encrypted *.json.enc snapshots.
//   - Warns and stops if there are zero encrypted snapshots yet — deleting
//     the cleartext ones then would leave only Neon's PITR window. Set
//     BACKUP_ENCRYPTION_KEY and let one backup run first.
//
// USAGE (run from the traderefer/ directory — it uses its @vercel/blob):
//   # get the token: `vercel env pull .env.production.local --environment=production`
//   # then read BLOB_READ_WRITE_TOKEN out of that file, or copy it from the
//   # Vercel dashboard (Storage → your Blob store → tokens).
//
//   BLOB_READ_WRITE_TOKEN=… node scripts/purge-cleartext-backups.mjs            # dry run
//   BLOB_READ_WRITE_TOKEN=… node scripts/purge-cleartext-backups.mjs --confirm  # delete

import { list, del } from "@vercel/blob";

const confirm = process.argv.includes("--confirm");

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error(
    "BLOB_READ_WRITE_TOKEN is not set. Pull it with " +
      "`vercel env pull .env.production.local --environment=production` " +
      "or copy it from the Vercel dashboard, then re-run.",
  );
  process.exit(1);
}

// Page through the whole backups/ prefix (cursor-based) so we don't miss any.
const all = [];
let cursor;
do {
  const page = await list({ prefix: "backups/", cursor, limit: 1000 });
  all.push(...page.blobs);
  cursor = page.cursor;
} while (cursor);

const cleartext = all.filter((b) => b.pathname.endsWith(".json")); // NOT .json.enc
const encrypted = all.filter((b) => b.pathname.endsWith(".json.enc"));

console.log(
  `Found ${all.length} backup blobs: ${cleartext.length} cleartext (.json), ` +
    `${encrypted.length} encrypted (.json.enc).`,
);
for (const b of cleartext) {
  console.log("  cleartext:", b.pathname, "—", b.uploadedAt.toISOString());
}

if (cleartext.length === 0) {
  console.log("\nNo cleartext backups to delete. Nothing to do.");
  process.exit(0);
}

if (encrypted.length === 0) {
  console.error(
    "\n⚠️  STOP: there are no encrypted (.json.enc) snapshots yet. Deleting " +
      "the cleartext backups now would leave only Neon's ~6h PITR as recovery. " +
      "Set BACKUP_ENCRYPTION_KEY, run one backup, then re-run this.",
  );
  process.exit(1);
}

if (!confirm) {
  console.log(
    `\nDry run — nothing deleted. Re-run with --confirm to delete the ` +
      `${cleartext.length} cleartext blob(s) above.`,
  );
  process.exit(0);
}

let deleted = 0;
for (const b of cleartext) {
  await del(b.url);
  console.log("deleted:", b.pathname);
  deleted += 1;
}
console.log(`\nDone — deleted ${deleted} cleartext backup blob(s).`);
