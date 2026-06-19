# TradeRefer — repo guide for future Claude sessions

> Auto-loaded by Claude Code in any session working in this repo. Skim it
> first to avoid re-discovering decisions. Update it when you ship
> something that breaks an assumption written here.

## What this is

**TradeRefer** is a multi-tenant SaaS that lets a service business
(initially a solar installer, but the model is generic) run their own
branded referral programme. Local tradesmen and past customers sign up
as partners under the business's landing page, submit customer
referrals, and get paid per appointment booked + per job sold. £99/month
GBP, 14-day no-card trial.

Live at https://traderefer.co.uk. Production-grade.

## Repo layout

```
amp-renewables-solar-cost/         <- repo root
├── CLAUDE.md                      <- this file
├── .gitignore
├── traderefer/                    <- the actual app (Vercel root = this)
│   ├── prisma/
│   │   ├── schema.prisma          <- single source of truth for the DB
│   │   ├── migrations/            <- intentionally sparse; we use db push
│   │   └── setup.sql              <- seed data for new local clones
│   ├── public/
│   ├── src/
│   │   ├── app/                   <- App Router routes
│   │   │   ├── (marketing)        <- /, /help, /terms, /privacy, /login, /signup
│   │   │   ├── [slug]/            <- per-company public surfaces
│   │   │   ├── company/           <- COMPANY_ADMIN area
│   │   │   ├── dashboard/         <- PARTNER area
│   │   │   ├── platform/          <- SUPERADMIN area
│   │   │   ├── api/
│   │   │   │   ├── stripe/webhook <- Stripe events → Company.status flips
│   │   │   │   └── cron/backup    <- weekly DB snapshot
│   │   │   ├── icon.svg           <- favicon (Next.js auto-discovers)
│   │   │   ├── error.tsx          <- root error boundary
│   │   │   ├── not-found.tsx      <- root 404
│   │   │   └── middleware.ts      <- www → apex 308 redirect
│   │   ├── components/            <- shared UI (Nav, Logo, PublicShell, StatusBadge)
│   │   └── lib/                   <- server-side helpers
│   ├── vercel.json                <- cron config
│   ├── .env.example               <- env var documentation
│   └── package.json
├── index.html                     <- vestigial AMP solar-cost page, ignore
└── README.md
```

**Vercel project Root Directory = `traderefer/`.** Run `vercel` commands
from the REPO ROOT (not from `traderefer/`), because Vercel CLI navigates
relative to project config and will look for `traderefer/traderefer/`
otherwise.

## Tech stack

- **Next.js 16** (App Router, React 19, server components by default)
- **TypeScript** throughout, strict mode
- **Prisma 6** + **Neon Postgres** (EU/London region)
- **Tailwind 4 beta** + **Inter** font (no Fraunces — that's a Claude-ism)
- **jose** (JWT) + **bcryptjs** for auth, with a server-side `Session`
  table so logouts are revocable
- **Stripe** (live mode) for £99/mo subscription billing
- **Resend** for transactional email
- **Vercel Blob** for logo uploads + DB backup snapshots
- **Cloudflare** for DNS + edge proxy

## Multi-tenancy + role model (multi-org, since 2026-06-11)

A User is a person (one email, one password, one set of bank details).
What they ARE at each company lives in the `Membership` join table —
one row per (user, company), `role: MembershipRole`:

- `COMPANY_ADMIN` — runs that company's programme. Up to 4 per company.
- `BUSINESS_PARTNER` — a trade business referring customers (full rates).
- `AMBASSADOR` — an individual (past customer, friend) referring at the
  company's separate, usually lower, ambassador rates.

One person can hold memberships at many companies — ambassador at AMP,
admin of their own company — and switches "hats" via the org switcher
in the nav (rendered only when they have 2+ contexts).

Platform operators (Joe) are flagged `User.isSuperadmin` — orthogonal
to memberships. Superadmin with no active membership = Platform context
(`/platform/*`).

**Active context**: `Session.activeMembershipId` (server-side) records
which membership a session is acting as. `getSessionUser()` derives
`role`/`companyId` from it fresh on every request; the JWT carries only
`sub` + `sid`. Sessions with a null/stale pointer self-heal by adopting
the user's first membership — nobody gets logged out by membership
changes.

**Joining flows** (all in production):
- Anonymous on `/<slug>/signup` → account + membership (type picker
  between business/ambassador when the company accepts both).
- Logged-in non-member on `/<slug>/signup` → one-click "join programme"
  (new membership, no second account).
- Existing email on any signup form → typing their EXISTING password
  proves ownership and attaches the new company/membership to that
  account; wrong password is rejected with a hint.
- `/signup` (company signup) deliberately does NOT bounce logged-in
  users — a partner starting their own programme is the target case.

**DEPRECATED but still present**: `User.role` and `User.companyId`
columns (and the old `Role` enum). Nothing reads them anymore; they're
kept so a half-deployed build can't crash. Drop in a later cleanup.

`Company.isComped` exempts AMP from billing — they're the original
tenant + reference example. Don't accidentally bill them.

## Schema highlights

`User`
- email (unique), bcrypt password, role, optional companyId
- bank fields stored as **AES-256-GCM ciphertext** (`bankSortCode`,
  `bankAccountNumber`). Plus plaintext `bankSortCodeLast2` /
  `bankAccountNumberLast4` for masked admin display without paying a
  decrypt per row.

`Company`
- slug, branding (`logoUrl`, `logoUrlLight`, `primaryColor`, `accentColor`)
- `payoutAppointment` / `payoutJob` (Decimal) — set by company admin
- `status: CompanyStatus` enum (TRIAL / ACTIVE / PAST_DUE / CANCELLED)
- `isComped` (boolean) — never billed, always-write
- Stripe linkage: `stripeCustomerId`, `stripeSubscriptionId`,
  `currentPeriodEnd`, `trialEndsAt`
- `emailSignature` — optional template for `/company/signature`

`Referral`
- companyId + partnerId + customer details + service array
- `status: ReferralStatus` (SUBMITTED → CONTACTED → APPOINTMENT_BOOKED →
  APPOINTMENT_COMPLETED → JOB_SOLD → JOB_INSTALLED, plus REJECTED)
- `archivedAt` — soft archive (orthogonal to status)
- `customerConsentConfirmed` + `customerConsentConfirmedAt` — required
  GDPR consent record from the partner at submission

`Payout`
- belongs to a Referral, type APPOINTMENT or JOB
- status PENDING / PAID / CANCELLED
- amount comes from the Company's payout settings at the time the
  Referral hit the corresponding status

`BankDetailsAccess`
- append-only audit log. Written every time a COMPANY_ADMIN clicks
  "Reveal" on a partner's masked bank details in `/company/payouts`.

`Session` — JWT sid → server-side row; deletable for logout-everywhere.

`PasswordResetToken` — hashed SHA-256, 1h expiry. Reused for team-invite
links (7d expiry there).

`MessageTemplate` — per-company SMS / email scripts partners can copy.

## Auth helpers (`src/lib/auth.ts`)

- `getSessionUser()` — cached per-request. Returns `SessionUser` with
  `role`/`companyId`/`membershipId` derived from the session's ACTIVE
  membership, plus the full `memberships` list (drives the org
  switcher). Always re-reads from DB so revoked sessions/memberships
  don't survive.
- `requireSuperadmin()` (checks `isSuperadmin`) /
  `requireCompanyAdmin()` / `requirePartner()` (accepts both
  BUSINESS_PARTNER and AMBASSADOR) — page-level guards.
- `setActiveMembership(id | null)` — re-points the session at another
  of the user's memberships (validates ownership). Used by
  `switchMembershipAction` in `lib/account-actions.ts`.
- Payout rates: `ratesForRole(company, role)` in `lib/payouts.ts` picks
  ambassador vs business rates. `expectedPayoutsForStatus` takes the
  referrer's role; the status-change action looks up the referral
  partner's membership to pass it. `payoutsForCompany` = business rates
  (public headline numbers).

## Billing write-gate (`src/lib/stripe.ts`)

`companyWriteGate(company)` determines whether a company can perform
mutating actions:

- `isComped` → always can
- Stripe not configured → always can (dev safety; production has it
  configured)
- TRIAL + trialEndsAt > now → can
- ACTIVE → can
- TRIAL expired / PAST_DUE / CANCELLED → cannot

**Every mutating server action calls `assertCompanyCanWriteById(companyId)`
at the top.** When adding a new server action that writes data, do the
same. This is the only thing stopping a cancelled company from
continuing to submit referrals.

Exempt from the gate: the billing actions themselves (Checkout / Portal)
must remain callable for users to escape PAST_DUE / CANCELLED.

**Deliberate exception — partner referral submission** (`submitReferralAction`,
since 2026-06-11): partners CAN submit referrals to a lapsed company.
The referral is stored normally, but the company gets a locked teaser
email (`sendLockedReferralNotification` — partner name only, no customer
details, billing CTA) instead of the full notification. The company side
is read-locked while lapsed: `/company`, `/company/referrals` and the
referral detail page mask customer details behind a "reactivate" notice
(check `companyWriteGate(company).canWrite` — the same gate, used for
display). Real demand piling up is the dunning mechanism. Status changes
remain hard-gated, so a lapsed company can't work referrals.

## Stripe webhook (`src/app/api/stripe/webhook/route.ts`)

Source of truth for `Company.status` changes. Handles:

- `checkout.session.completed` → TRIAL → ACTIVE on first subscription
- `customer.subscription.updated` / `created` → keep status + period_end fresh
- `customer.subscription.deleted` → ACTIVE → CANCELLED
- `invoice.payment_failed` → ACTIVE → PAST_DUE
- `invoice.payment_succeeded` → PAST_DUE → ACTIVE

**Critical gotcha**: Stripe API version `2026-04-22.dahlia` moved
`current_period_end` from `Subscription` top-level to each
`SubscriptionItem`. The handler reads `subscription.items.data[0]
.current_period_end` with a fallback to the legacy field.

## Bank-detail encryption (`src/lib/crypto.ts`)

AES-256-GCM with a 32-byte key in `BANK_ENCRYPTION_KEY` env var, stored
separately from the database. Encryption envelope: base64(IV(12) ||
tag(16) || ciphertext). Each call generates a fresh random IV — same
plaintext produces different ciphertext, so equality searches need a
HMAC sidecar if ever needed (not currently).

- Encrypt on save (`saveBankAction` in `src/app/dashboard/settings/actions.ts`)
- Decrypt for partner-self-view (`/dashboard/settings`)
- Masked admin view (`/company/payouts`) uses `bankSortCodeLast2` /
  `bankAccountNumberLast4`; full reveal goes through
  `revealPartnerBankDetailsAction` which writes a `BankDetailsAccess`
  audit row.

**Rotation is hard** — the key is bound to every existing ciphertext.
Rotating means re-encrypting every row in a single migration. Don't
rotate casually.

## Email signature (`src/lib/signature.ts`)

Per-company customisable one-liner snippet (`Company.emailSignature`)
with `{{placeholder}}` interpolation. Rendered as both plain text and
HTML. The `/company/signature` page uses a `RichCopyButton` that writes
both `text/html` and `text/plain` to the clipboard via `ClipboardItem`,
so pasting into Gmail/Outlook/Apple Mail renders the formatted version.

## Public surfaces vs admin surfaces

| Path | Audience | Notes |
|---|---|---|
| `/` | Public | TradeRefer marketing |
| `/help`, `/terms`, `/privacy` | Public | Use `PublicShell` for shared header/footer |
| `/[slug]` | Public | Per-company landing — branded with company colours |
| `/[slug]/signup` | Public | Partner signup with consent checkbox. Logged-in users see a "Preview mode" banner so company admins can QA without logging out. |
| `/signup` | Public | Company signup (new tenants) |
| `/login`, `/forgot-password`, `/reset-password` | Public | |
| `/dashboard/*` | PARTNER | Their referrals, payouts, settings (incl. bank details), signature templates from their company |
| `/company/*` | COMPANY_ADMIN | Overview, referrals (with active/archived tabs), partners, payouts (with masked bank reveal), settings, signature, billing, templates |
| `/platform/*` | SUPERADMIN | Cross-tenant overview |

`Nav.tsx` switches link set based on role. The company-admin layout and
partner layout inject the COMPANY's brand colours via `<style>` in the
layout, overriding the platform's default slate/amber.

## Branding & colours

- Platform brand (TradeRefer itself): slate `#1e293b` + amber `#f59e0b`,
  set in `src/lib/platform.ts` and `globals.css :root`
- Per-company branding: `Company.primaryColor` / `accentColor`,
  overridden in company-admin and partner-dashboard layouts via
  `<style dangerouslySetInnerHTML>` (hex regex-validated on save so the
  `dangerouslySetInnerHTML` is safe)
- **AMP Renewables specifically** stores its own green so it stays
  green even though the platform defaults changed. Don't accidentally
  bulk-update Company colours.
- Inter font with weight 800 for h1/h2/h3 (see `globals.css`)

## Code conventions

- **Server components by default.** Use `"use client"` only when you
  need state, effects, or browser APIs.
- **Server actions** for mutations. Live in colocated `actions.ts` next
  to the page/component. All mutating actions:
  1. Call `requireX()` to gate by role
  2. Call `assertCompanyCanWriteById(companyId)` to gate by billing
  3. Use `safeParse` (not `parse`) on Zod schemas — `parse` throws an
     ugly stack
- **No nested `<form>`.** Use `formAction` on a button to dispatch to a
  different server action while sharing the parent form's inputs.
- **`formNoValidate`** on alternate-action buttons whose inputs aren't
  required for that action. (We hit this on the logo Remove button — the
  required file input blocked the Remove submit otherwise.)
- **Revalidate the right paths** after a save. If branding changes
  affect `/<slug>`, revalidate that. The whole-app paths to remember:
  - `/company/settings` writes → revalidate `/company`, `/company/settings`, `/<slug>`, `/<slug>/signup`
  - Logo upload → same plus the previous-blob delete
- **Decrypt on read, encrypt on write** for bank fields. Never store
  plaintext.
- **British English** in user-facing copy. en-GB locale on `<html>`.
- **No emojis** in code or copy unless explicitly asked. Joe pushes back.

## Common operations

```bash
# Dev server
cd ~/amp-renewables-solar-cost/traderefer && npm run dev

# Type-check
cd ~/amp-renewables-solar-cost/traderefer && npx tsc --noEmit

# Production build (requires env vars set)
cd ~/amp-renewables-solar-cost/traderefer && \
  DATABASE_URL=... AUTH_SECRET=... BANK_ENCRYPTION_KEY=... \
  npm run build

# Schema change
cd ~/amp-renewables-solar-cost/traderefer && \
  DATABASE_URL=... npx prisma db push --skip-generate && \
  npx prisma generate

# Deploy to production (run from REPO ROOT, not traderefer/)
cd ~/amp-renewables-solar-cost && vercel deploy --prod

# Tail Vercel logs
cd ~/amp-renewables-solar-cost && \
  vercel logs $(vercel ls amp-renewables-solar-cost | grep Production | head -1 | awk '{print $3}') --since 10m

# Connect to production DB
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"
psql "$(vercel env pull .env.production.local --environment=production --yes &>/dev/null && grep '^DATABASE_URL=' .env.production.local | cut -d= -f2- | tr -d '"')"

# Trigger backup manually (only from Vercel cron UI — local can't auth because CRON_SECRET is Sensitive)
# Use the Vercel dashboard → Crons → /api/cron/backup → Run Job
```

## Recent significant changes (worth knowing before editing)

- **2026-06-11**: Multi-org Membership model + Ambassador role. Session
  carries an active membership; org switcher in nav; type picker on
  partner signup; per-company ambassador rates + accepts-toggles in
  settings; role-aware payout creation. Old User.role/companyId columns
  deprecated in place.
- **2026-06-04**: Weekly DB backup cron. Bank field encryption + masked
  reveal + audit log. DMARC. Favicon. Archive + delete referrals.
- **2026-05-29**: Email signature feature. Two logo slots (standard +
  light variant for dark backgrounds). Customer consent checkbox on
  referral form. Help/Terms/Privacy pages.
- **2026-05-22**: Homepage v2 with problem-agitation + Hormozi-style
  offer section. Brand re-skin (slate/amber, not green). Inter font.
- **2026-05-21**: Initial big push — Stripe live billing, www→apex
  middleware, /platform/companies, error boundaries, Stripe webhook,
  write-gate, Cloudflare email routing.
- **2026-06-19**: Review-batch hardening. (1) Backup dump now AES-256-GCM
  encrypted with a SEPARATE `BACKUP_ENCRYPTION_KEY` before upload (files
  are `.json.enc`); cron REFUSES to write if the key is unset (no cleartext
  PII to public Blob). Shared crypto helpers extracted in `lib/crypto.ts`
  (`encryptBackup`/`decryptBackup`). (2) Postgres-backed IP rate limiting
  (`lib/rate-limit.ts` + `RateLimit` model) on login / forgot-password /
  both signups — FAILS OPEN. (3) Password change revokes other sessions
  (`currentSessionId()` in auth.ts). (4) `markPayoutPaidAction` guards on
  status=PENDING via atomic updateMany; `@@unique([referralId, type])` on
  Payout; Stripe `incomplete` → PAST_DUE not ACTIVE; bank-nudge PENDING sum
  scoped to company. (5) SEO: `app/robots.ts`, `app/sitemap.ts` (static +
  active tenants, daily revalidate), per-tenant `generateMetadata` on
  `/[slug]`, OG/Twitter + `metadataBase` in root layout, generated
  `app/opengraph-image.tsx`, noindex on auth pages, `platform.url` default
  → apex. (6) `lib/report-error.ts` emails NOTIFY_EMAIL on silent server
  failures (Stripe webhook, backup cron) — pragmatic stand-in for Sentry.

## Open decisions / known gaps

1. **Drop deprecated `User.role` / `User.companyId` columns** — kept
   through the 2026-06-11 multi-org migration for deploy safety. Once
   stable for a while, remove from schema + db push.
2. **~~Rate limiting~~** — DONE 2026-06-19 (Postgres-backed, fails open).
3. **Sentry / error monitoring** — partial: `reportError()` emails alerts
   on critical server paths. Swap in `@sentry/nextjs` for full coverage
   (incl. client + all routes) when traffic justifies it.
4. **Solicitor review** of /terms and /privacy — they're flagged as
   draft in the page footers. NB: Terms §4 still references a "card on
   file" the no-card trial never collects — fix in that pass.
5. **`BACKUP_ENCRYPTION_KEY` must be set in Vercel** — the backup cron
   skips (and alerts) until it is. Generate with the randomBytes(32) hex
   one-liner; back it up OUTSIDE Vercel (losing it = unrecoverable
   snapshots). Also purge any pre-2026-06-19 cleartext `.json` backup
   blobs from Vercel Blob — they pre-date the encryption fix.

## Things to avoid

- **Don't introduce another root layout `<style>` injection** without
  thinking about how it interacts with the per-company colour overrides
  in `company/layout.tsx` and `dashboard/layout.tsx`.
- **Don't add a card-on-file trial step.** This was explicitly rejected
  after ChatGPT feedback — Joe values low signup friction over the
  marginal abuse it would prevent.
- **Don't bring back the misleading "pays for £99 for X months" ROI
  maths.** That assumed all of £4,750 was profit, which it isn't. The
  current "The offer" section is the Hormozi-style risk-asymmetry
  framing — keep it.
- **Don't restyle the homepage hero away from "Stop Hoping for
  Word-of-Mouth. Systemise It." / "Weaponise your contacts."** Joe
  workshopped that copy and it's settled.
- **Don't roll the platform colours back to green.** Slate + amber is
  deliberately distinct from AMP (the original tenant) — they were
  identical by accident before.
- **Don't store passwords in plain text or log them.** bcrypt only.
- **Don't store new sensitive fields in plaintext.** Use the
  `encryptField` / `decryptField` helpers from `src/lib/crypto.ts` plus
  a plaintext last-N column for masking display.
- **Don't change the homepage CTA copy away from "Launch My Referral
  Programme"** without checking with Joe — chosen for outcome-led punch.

## Joe's preferences

- British plain-spoken voice. No marketing-speak. No Vegas pitch.
- Decisive recommendations. "Do X" rather than "you could do X, Y or Z".
- Honest about scale — don't over-engineer for problems we don't yet
  have. Use the "what's the cost of doing this later?" question to decide.
- No emojis unless explicitly asked.
- Show maths only when it's actually honest.
- Comfortable being told something is a bad idea.

## Where to read more

- Long-form architecture: this file
- Current production state + recent decisions: user memory at
  `~/.claude/projects/-Users-philtallon/memory/MEMORY.md`
- Schema: `traderefer/prisma/schema.prisma`
- Env documentation: `traderefer/.env.example`
- PR history: `gh pr list -R amp-renewables/amp-renewables-solar-cost`
