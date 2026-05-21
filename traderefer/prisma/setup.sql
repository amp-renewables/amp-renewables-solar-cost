-- ============================================================================
-- TradeRefer database setup — multi-tenant SaaS schema.
-- ============================================================================
-- Paste the whole thing into Neon's SQL Editor and click "Run". Creates all
-- tables AND seeds:
--   - SUPERADMIN: joe@amprenewables.co.uk        / ChangeMeJoe123!
--   - AMP Renewables (comped company)
--   - AMP COMPANY_ADMIN: admin@amprenewables.co.uk / ChangeMe123!
--   - Demo partner under AMP:  demo@northeastroofing.example / Demo1234!
--   - Sample referrals, payouts, status events, and default templates.
--
-- If you've already run the OLD setup.sql against the same DB, drop the
-- schema first so this can rebuild from scratch:
--   DROP SCHEMA public CASCADE; CREATE SCHEMA public;
-- ============================================================================

-- 1. Enums --------------------------------------------------------------------

CREATE TYPE "Role" AS ENUM ('SUPERADMIN', 'COMPANY_ADMIN', 'PARTNER');
CREATE TYPE "CompanyStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED');
CREATE TYPE "ReferralStatus" AS ENUM ('SUBMITTED', 'CONTACTED', 'APPOINTMENT_BOOKED', 'APPOINTMENT_COMPLETED', 'JOB_SOLD', 'JOB_INSTALLED', 'REJECTED');
CREATE TYPE "PayoutType" AS ENUM ('APPOINTMENT', 'JOB');
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');
CREATE TYPE "Channel" AS ENUM ('SMS', 'EMAIL');

-- 2. Tables -------------------------------------------------------------------

CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "websiteUrl" TEXT,
    "addressLine" TEXT,
    "logoUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#1a3c2a',
    "accentColor" TEXT NOT NULL DEFAULT '#52b788',
    "heroSubheading" TEXT,
    "services" TEXT[],
    "payoutAppointment" DECIMAL(10,2) NOT NULL DEFAULT 50,
    "payoutJob" DECIMAL(10,2) NOT NULL DEFAULT 250,
    "currencySymbol" TEXT NOT NULL DEFAULT '£',
    "status" "CompanyStatus" NOT NULL DEFAULT 'TRIAL',
    "isComped" BOOLEAN NOT NULL DEFAULT false,
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hashedPassword" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'PARTNER',
    "companyId" TEXT,
    "fullName" TEXT,
    "phone" TEXT,
    "businessName" TEXT,
    "bankAccountName" TEXT,
    "bankSortCode" TEXT,
    "bankAccountNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "services" TEXT[],
    "notes" TEXT,
    "status" "ReferralStatus" NOT NULL DEFAULT 'SUBMITTED',
    "appointmentBookedAt" TIMESTAMP(3),
    "appointmentDate" TIMESTAMP(3),
    "appointmentCompletedAt" TIMESTAMP(3),
    "jobSoldAt" TIMESTAMP(3),
    "jobInstalledAt" TIMESTAMP(3),
    "jobValue" DECIMAL(10,2),
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReferralStatusEvent" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "fromStatus" "ReferralStatus",
    "toStatus" "ReferralStatus" NOT NULL,
    "changedBy" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReferralStatusEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "type" "PayoutType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "paidBy" TEXT,
    "paymentRef" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MessageTemplate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "channel" "Channel" NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

-- 3. Indexes ------------------------------------------------------------------

CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");
CREATE UNIQUE INDEX "Company_stripeCustomerId_key" ON "Company"("stripeCustomerId");
CREATE UNIQUE INDEX "Company_stripeSubscriptionId_key" ON "Company"("stripeSubscriptionId");
CREATE INDEX "Company_status_idx" ON "Company"("status");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_companyId_idx" ON "User"("companyId");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE INDEX "Referral_companyId_status_idx" ON "Referral"("companyId", "status");
CREATE INDEX "Referral_companyId_createdAt_idx" ON "Referral"("companyId", "createdAt");
CREATE INDEX "Referral_partnerId_idx" ON "Referral"("partnerId");
CREATE INDEX "ReferralStatusEvent_referralId_idx" ON "ReferralStatusEvent"("referralId");
CREATE INDEX "Payout_referralId_idx" ON "Payout"("referralId");
CREATE INDEX "Payout_status_idx" ON "Payout"("status");
CREATE INDEX "MessageTemplate_companyId_channel_active_sortOrder_idx" ON "MessageTemplate"("companyId", "channel", "active", "sortOrder");

-- 4. Foreign keys -------------------------------------------------------------

ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReferralStatusEvent" ADD CONSTRAINT "ReferralStatusEvent_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageTemplate" ADD CONSTRAINT "MessageTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- SEED DATA
-- ============================================================================
-- CHANGE THE PASSWORDS BELOW IMMEDIATELY AFTER FIRST LOGIN.
-- ============================================================================

-- AMP Renewables — comped account, status ACTIVE.
INSERT INTO "Company" (
  "id", "slug", "name", "contactEmail", "contactPhone", "websiteUrl", "addressLine",
  "primaryColor", "accentColor", "services", "payoutAppointment", "payoutJob",
  "status", "isComped", "updatedAt"
) VALUES (
  'seed_company_amp',
  'amprenewables',
  'AMP Renewables',
  'partners@amprenewables.co.uk',
  '0191 535 2711',
  'https://www.amprenewables.co.uk',
  '8 Bede House, Tower Road, Washington, Tyne and Wear, NE37 2SH',
  '#1a3c2a',
  '#52b788',
  ARRAY['Solar PV', 'Battery Storage', 'EV Charger', 'Heat Pump'],
  50,
  250,
  'ACTIVE',
  true,
  NOW()
);

-- Users.
-- Bcrypt hashes were generated locally with bcryptjs cost 10.
--   joe@amprenewables.co.uk        → ChangeMeJoe123!
--   admin@amprenewables.co.uk      → ChangeMe123!
--   demo@northeastroofing.example  → Demo1234!
INSERT INTO "User" ("id", "email", "hashedPassword", "role", "companyId", "fullName", "businessName", "phone", "updatedAt") VALUES
  ('seed_user_super', 'joe@amprenewables.co.uk',          '$2a$10$WZ8ARnHhzc5JAwyVe9ULC.UlX6cTsUjTjn5UOKQuisXJIYIRWsiOi', 'SUPERADMIN',    NULL,                 'Joe Murray',     NULL,                       NULL,            NOW()),
  ('seed_user_amp_admin', 'admin@amprenewables.co.uk',    '$2a$10$HE6wMeW1j3eQ7344qac93eMRAna.uqraeB3fqI2bqfXTLfNklzg06', 'COMPANY_ADMIN', 'seed_company_amp',   'AMP Admin',      'AMP Renewables',           NULL,            NOW()),
  ('seed_user_partner',   'demo@northeastroofing.example', '$2a$10$G3qg7AzAYZlki1HZ3U62EeoTfPcV1xHqHypK.PlX4ZkjGhPr1/ncW', 'PARTNER',       'seed_company_amp',   'Jamie Whitley',  'North East Roofing Co.',   '07700 900111',  NOW());

-- Sample referrals under AMP.
INSERT INTO "Referral" ("id", "companyId", "partnerId", "customerName", "customerPhone", "customerEmail", "addressLine1", "city", "postcode", "services", "notes", "status", "appointmentBookedAt", "appointmentDate", "appointmentCompletedAt", "jobSoldAt", "jobValue", "updatedAt") VALUES
  ('seed_ref_brennan',    'seed_company_amp', 'seed_user_partner', 'Sarah & Mark Brennan', '07700 900222', 'brennan.house@example.co.uk', '14 Linden Way',         'Newcastle upon Tyne', 'NE3 4QP', ARRAY['Solar PV', 'Battery Storage'], 'Re-roof job last month — solid south-facing roof, keen.', 'APPOINTMENT_BOOKED', NOW(),                          NOW() + INTERVAL '4 days', NULL,                            NULL,                            NULL,  NOW()),
  ('seed_ref_whitehead',  'seed_company_amp', 'seed_user_partner', 'Tom Whitehead',         '07700 900333', 'tom.w@example.co.uk',          '7 Cherry Tree Close',  'Sunderland',          'SR3 2AH', ARRAY['Solar PV'],                    NULL,                                                       'JOB_SOLD',           NOW() - INTERVAL '14 days',     NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days',        NOW() - INTERVAL '2 days',      6800,  NOW()),
  ('seed_ref_carmichael', 'seed_company_amp', 'seed_user_partner', 'Linda Carmichael',      '07700 900444', 'linda.c@example.co.uk',        '29 Old Mill Lane',     'Durham',              'DH1 5LD', ARRAY['Heat Pump', 'Solar PV'],       'Older property, will need a site visit to scope.',         'SUBMITTED',          NULL,                            NULL,                       NULL,                            NULL,                            NULL,  NOW());

-- Sample payouts.
INSERT INTO "Payout" ("id", "referralId", "type", "amount", "status", "paidAt", "paymentRef", "updatedAt") VALUES
  ('seed_payout_brennan_appt',     'seed_ref_brennan',    'APPOINTMENT', 50,  'PENDING', NULL,                       NULL,        NOW()),
  ('seed_payout_whitehead_appt',   'seed_ref_whitehead',  'APPOINTMENT', 50,  'PAID',    NOW() - INTERVAL '7 days',   'BT-2026-04', NOW()),
  ('seed_payout_whitehead_job',    'seed_ref_whitehead',  'JOB',         250, 'PENDING', NULL,                       NULL,        NOW());

-- Status history.
INSERT INTO "ReferralStatusEvent" ("id", "referralId", "fromStatus", "toStatus", "changedBy") VALUES
  ('seed_event_brennan_1', 'seed_ref_brennan', NULL,         'SUBMITTED',          'seed_user_partner'),
  ('seed_event_brennan_2', 'seed_ref_brennan', 'SUBMITTED',  'CONTACTED',          'seed_user_amp_admin'),
  ('seed_event_brennan_3', 'seed_ref_brennan', 'CONTACTED',  'APPOINTMENT_BOOKED', 'seed_user_amp_admin');

-- Message templates for AMP.
INSERT INTO "MessageTemplate" ("id", "companyId", "channel", "title", "subject", "body", "sortOrder", "active", "updatedAt") VALUES
  ('seed_tpl_amp_sms_intro',   'seed_company_amp', 'SMS',   'Initial intro',                     NULL,
    'Hi! It''s {{partnerName}} from {{businessName}}. As mentioned, I work with {{companyName}} for solar & battery installs in the North East — they''re MCS certified and look after our customers really well. With your permission I can pass your details over and they''ll be in touch to arrange a free no-obligation survey. Just reply YES if happy. Cheers!',
    10, true, NOW()),
  ('seed_tpl_amp_sms_booked',  'seed_company_amp', 'SMS',   'After the appointment is booked',   NULL,
    'Quick heads up — {{companyName}} have your appointment in for the free solar survey. Any questions before then, give me a shout or call them direct on {{supportPhone}}. — {{partnerName}}',
    20, true, NOW()),
  ('seed_tpl_amp_email_intro', 'seed_company_amp', 'EMAIL', 'Detailed intro email',
    'Solar quote from {{companyName}} — sending your details across',
    E'Hi,\n\nThanks for the chat — as discussed I''m putting you in touch with {{companyName}}, the MCS-certified installers I use for solar & battery work in the North East.\n\nI''ll forward your details (name, phone, address) so they can call you to arrange a free, no-obligation survey. There''s no pressure to go ahead — it''s the easiest way to find out exactly what a system would cost for your property.\n\nIf you''d rather contact them directly first, they''re on {{supportPhone}} or {{supportEmail}}.\n\nCheers,\n{{partnerName}}\n{{businessName}}',
    10, true, NOW()),
  ('seed_tpl_amp_email_followup', 'seed_company_amp', 'EMAIL', 'Follow-up after survey',
    'How did the {{companyName}} survey go?',
    E'Hi,\n\nJust a quick one — hope the survey with {{companyName}} went well last week. Any questions about the quote or anything they covered, give me a shout — happy to help walk through it.\n\nIf you decide to go ahead, they''re a solid team to work with.\n\nCheers,\n{{partnerName}}',
    20, true, NOW());

-- Done! Hit your Vercel URL and:
--   Sign in as platform owner:    joe@amprenewables.co.uk        / ChangeMeJoe123!
--   Sign in as AMP company admin: admin@amprenewables.co.uk      / ChangeMe123!
--   Sign in as referring partner: demo@northeastroofing.example  / Demo1234!
-- AMP's branded landing page: /amprenewables
-- Sign up a new company:      /signup
