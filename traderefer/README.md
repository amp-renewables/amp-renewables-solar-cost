# TradeRefer

A white-label tradesman referral platform. Roofers and other trades sign up,
submit customer referrals, track their progress, and see what they're owed.
Each appointment booked pays out, each job sold pays out again.

Built initially for **AMP Renewables** (solar/battery/EV/heat pump installer
in the North East) but the codebase is **brand-agnostic** — every name,
colour, payout amount and contact detail comes from environment variables,
so the same code can be licensed to other solar (or non-solar) installers
with no code changes.

---

## Features

**Partner side** (the roofer / tradesman):
- Public landing page with sign-up
- One-page referral form (customer name, contact, address, services, notes)
- Dashboard showing referrals, statuses, and earnings
- Payouts page (pending + paid totals)
- Ready-to-send SMS & email templates with the partner's own name
  automatically substituted

**Admin side** (the installer running the programme):
- Overview dashboard with totals
- Full referral list with filtering and search
- Per-referral detail view — update status, attach appointment date / job
  value, internal notes, full status history
- Partners list with per-partner earnings
- Payouts queue — mark single or batch payments as paid with payment refs
- Editable SMS / email templates (no redeploy needed to change copy)

**Built-in business logic:**
- Status changes auto-create the right payouts (idempotent):
  `APPOINTMENT_BOOKED` → £50 appointment payout
  `JOB_SOLD` → +£250 job payout
- Reversing a status cancels unpaid payouts; never touches paid ones
- Full audit trail of every status change

---

## White-label / licensing

Everything brandable lives in `src/lib/brand.ts`, populated from env vars:

| Env var | Default | Purpose |
|---|---|---|
| `BRAND_PRODUCT_NAME` | `TradeRefer` | Platform name (shown in header) |
| `BRAND_COMPANY_NAME` | `AMP Renewables` | The installer this deployment is for |
| `BRAND_DOMAIN` | `amprenewables.co.uk` | Used in template substitutions |
| `BRAND_SUPPORT_EMAIL` | `partners@amprenewables.co.uk` | Footer + template contact |
| `BRAND_SUPPORT_PHONE` | `0191 535 2711` | Footer + template contact |
| `BRAND_PRIMARY_COLOR` | `#1a3c2a` | Main UI colour |
| `BRAND_ACCENT_COLOR` | `#52b788` | Accent / button highlight |
| `BRAND_CURRENCY_SYMBOL` | `£` | Money display |
| `BRAND_SERVICES` | `Solar PV,Battery Storage,EV Charger,Heat Pump` | Comma-separated service list |
| `PAYOUT_APPOINTMENT` | `50` | Per-appointment payout in £ |
| `PAYOUT_JOB` | `250` | Per-job payout in £ |

**Licensing model:** one database + one deployment per licensee. Cleanest
data isolation, simplest billing (you charge a licence fee per deployment),
no risk of one customer seeing another's data. If you later want
multi-tenancy in a single deployment you can add a `tenantId` column to
`User`, `Referral`, `Payout`, and `MessageTemplate` and gate every query
on it — the schema is already structured to make this a clean refactor.

---

## Stack

- Next.js 15 (App Router, React 19, Server Actions)
- TypeScript
- Tailwind CSS v4
- Prisma + Postgres
- Cookie-based session auth (JWT + bcrypt — no third-party auth dependency)
- Zod for input validation

---

## Local development

### 1. Install

```bash
cd traderefer
npm install
```

### 2. Set up the database

Easiest path — use the bundled Docker Compose:

```bash
docker compose up -d        # starts Postgres on localhost:5432
cp .env.example .env        # then edit AUTH_SECRET at minimum
```

Or use your own Postgres — just set `DATABASE_URL` in `.env`.

Generate a strong `AUTH_SECRET`:

```bash
openssl rand -hex 32
```

### 3. Run migrations + seed

```bash
npm run db:push    # creates tables from schema.prisma
npm run db:seed    # creates admin + demo partner + sample referrals
```

Default seeded logins:
- **Admin:** `admin@amprenewables.co.uk` / `ChangeMe123!`
- **Partner:** `demo@northeastroofing.example` / `Demo1234!`

(Override via `SEED_ADMIN_PASSWORD` / `SEED_PARTNER_PASSWORD`.)

### 4. Start the dev server

```bash
npm run dev
```

Open http://localhost:3000.

---

## Deployment

This is a standard Next.js app — deploys cleanly to **Vercel**, **Railway**,
**Fly.io**, **Render**, or any Node host.

Production checklist:
1. Set every env var from `.env.example`. `AUTH_SECRET` **must** be a long
   random string.
2. Point `DATABASE_URL` at managed Postgres (Supabase, Neon, RDS, etc.).
3. Run `npm run db:push` (or `npm run db:migrate deploy` once you've
   generated migrations) against the production DB.
4. Rotate the seeded admin password immediately, or create a fresh admin
   user and delete the seeded one.

---

## Where things live

```
prisma/
  schema.prisma           # database schema
  seed.ts                 # admin + demo data + default templates
src/
  lib/
    brand.ts              # ALL white-label config (env-driven)
    auth.ts               # session, login, role guards
    db.ts                 # Prisma client singleton
    payouts.ts            # payout rules (idempotent reconciliation)
    status.ts             # referral status labels/colours
  components/
    Nav.tsx               # shared nav (partner + admin)
    StatusBadge.tsx
    CopyButton.tsx
  app/
    page.tsx              # public landing page
    login/                # login form + action
    signup/               # signup form + action
    logout/               # logout route
    dashboard/            # partner area (auth-gated, role=PARTNER)
      page.tsx            # overview
      refer/              # submit referral
      referrals/          # list
      payouts/            # earnings
      templates/          # SMS + email templates
    admin/                # admin area (auth-gated, role=ADMIN)
      page.tsx            # overview
      referrals/          # list + detail (status updater)
      partners/           # partner list with earnings
      payouts/            # payment queue
      templates/          # template editor
```

---

## What's intentionally not built yet

These are well-scoped follow-ons rather than gaps in v1:

- **Outbound notifications.** When status changes (e.g. APPOINTMENT_BOOKED),
  email/SMS the partner. Hook into the same status-update action in
  `src/app/admin/referrals/[id]/actions.ts`. Recommend Resend for email,
  Twilio for SMS.
- **Password reset / email verification.** v1 assumes admins create accounts
  responsibly. Add a token table + `/forgot-password` route when needed.
- **Multi-tenant mode.** See "Licensing model" above.
- **Stripe Connect for automated payouts.** v1 marks payouts as paid
  manually; integrating Stripe Connect would let you pay partners
  automatically each month.
- **Audit log of admin actions.** Status events already log who changed
  what; extending to all admin actions is a small additional model.

---

## Security notes

- Passwords hashed with bcrypt (cost 10).
- Sessions are server-side records + signed JWT cookies (HS256). Revoking a
  session deletes the DB row so the cookie becomes invalid even if not yet
  expired.
- Cookies are `httpOnly`, `sameSite=lax`, and `secure` in production.
- All form input is validated with Zod before hitting the database.
- Role checks happen in `layout.tsx` for both partner and admin areas, so
  every child route is gated. Server actions re-check the role server-side
  in case someone bypasses the layout.
