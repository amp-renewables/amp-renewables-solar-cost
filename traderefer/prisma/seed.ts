// Seeds an admin user, a demo partner with a handful of referrals at
// different statuses, and a starter set of SMS/email templates.
//
// Safe to re-run: uses upserts.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@amprenewables.co.uk";
  const partnerEmail = "demo@northeastroofing.example";

  const adminPass = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";
  const partnerPass = process.env.SEED_PARTNER_PASSWORD || "Demo1234!";

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      hashedPassword: await bcrypt.hash(adminPass, 10),
      role: "ADMIN",
      fullName: "AMP Admin",
      businessName: "AMP Renewables",
    },
  });

  const partner = await prisma.user.upsert({
    where: { email: partnerEmail },
    update: {},
    create: {
      email: partnerEmail,
      hashedPassword: await bcrypt.hash(partnerPass, 10),
      role: "PARTNER",
      fullName: "Jamie Whitley",
      businessName: "North East Roofing Co.",
      phone: "07700 900111",
    },
  });

  // Demo referrals — only seed if none exist for this partner.
  const existing = await prisma.referral.count({
    where: { partnerId: partner.id },
  });
  if (existing === 0) {
    await prisma.referral.create({
      data: {
        partnerId: partner.id,
        customerName: "Sarah & Mark Brennan",
        customerPhone: "07700 900222",
        customerEmail: "brennan.house@example.co.uk",
        addressLine1: "14 Linden Way",
        city: "Newcastle upon Tyne",
        postcode: "NE3 4QP",
        services: ["Solar PV", "Battery Storage"],
        notes: "Re-roof job last month — solid south-facing roof, keen.",
        status: "APPOINTMENT_BOOKED",
        appointmentBookedAt: new Date(),
        appointmentDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        payouts: {
          create: { type: "APPOINTMENT", amount: 50, status: "PENDING" },
        },
        statusHistory: {
          createMany: {
            data: [
              { toStatus: "SUBMITTED", changedBy: partner.id },
              {
                fromStatus: "SUBMITTED",
                toStatus: "CONTACTED",
                changedBy: admin.id,
              },
              {
                fromStatus: "CONTACTED",
                toStatus: "APPOINTMENT_BOOKED",
                changedBy: admin.id,
              },
            ],
          },
        },
      },
    });

    await prisma.referral.create({
      data: {
        partnerId: partner.id,
        customerName: "Tom Whitehead",
        customerPhone: "07700 900333",
        customerEmail: "tom.w@example.co.uk",
        addressLine1: "7 Cherry Tree Close",
        city: "Sunderland",
        postcode: "SR3 2AH",
        services: ["Solar PV"],
        status: "JOB_SOLD",
        appointmentBookedAt: new Date(Date.now() - 14 * 86400000),
        appointmentDate: new Date(Date.now() - 10 * 86400000),
        appointmentCompletedAt: new Date(Date.now() - 9 * 86400000),
        jobSoldAt: new Date(Date.now() - 2 * 86400000),
        jobValue: 6800,
        payouts: {
          create: [
            {
              type: "APPOINTMENT",
              amount: 50,
              status: "PAID",
              paidAt: new Date(Date.now() - 7 * 86400000),
              paymentRef: "BT-2026-04",
            },
            { type: "JOB", amount: 250, status: "PENDING" },
          ],
        },
      },
    });

    await prisma.referral.create({
      data: {
        partnerId: partner.id,
        customerName: "Linda Carmichael",
        customerPhone: "07700 900444",
        customerEmail: "linda.c@example.co.uk",
        addressLine1: "29 Old Mill Lane",
        city: "Durham",
        postcode: "DH1 5LD",
        services: ["Heat Pump", "Solar PV"],
        notes: "Older property, will need a site visit to scope.",
        status: "SUBMITTED",
      },
    });
  }

  // Default templates.
  await ensureTemplate({
    channel: "SMS",
    title: "Initial intro",
    sortOrder: 10,
    body: `Hi! It's {{partnerName}} from {{businessName}}. As mentioned, I work with {{companyName}} for solar & battery installs in the North East — they're MCS certified and look after our customers really well. With your permission I can pass your details over and they'll be in touch to arrange a free no-obligation survey. Just reply YES if happy. Cheers!`,
  });

  await ensureTemplate({
    channel: "SMS",
    title: "After the appointment is booked",
    sortOrder: 20,
    body: `Quick heads up — {{companyName}} have your appointment in for the free solar survey. Any questions before then, give me a shout or call them direct on {{supportPhone}}. — {{partnerName}}`,
  });

  await ensureTemplate({
    channel: "EMAIL",
    title: "Detailed intro email",
    sortOrder: 10,
    subject: `Solar quote from {{companyName}} — sending your details across`,
    body: `Hi,

Thanks for the chat — as discussed I'm putting you in touch with {{companyName}}, the MCS-certified installers I use for solar & battery work in the North East.

I'll forward your details (name, phone, address) so they can call you to arrange a free, no-obligation survey. There's no pressure to go ahead — it's the easiest way to find out exactly what a system would cost for your property.

A bit about them:
- Based in the North East — local team, local installs
- MCS certified — required for the Smart Export Guarantee
- They cover solar PV, batteries, EV chargers and heat pumps

If you'd rather contact them directly first, they're on {{supportPhone}} or {{supportEmail}}.

Cheers,
{{partnerName}}
{{businessName}}`,
  });

  await ensureTemplate({
    channel: "EMAIL",
    title: "Follow-up after survey",
    sortOrder: 20,
    subject: `How did the {{companyName}} survey go?`,
    body: `Hi,

Just a quick one — hope the survey with {{companyName}} went well last week. Any questions about the quote or anything they covered, give me a shout — happy to help walk through it.

If you decide to go ahead, they're a solid team to work with.

Cheers,
{{partnerName}}`,
  });

  console.log("\n✓ Seed complete");
  console.log(`  Admin login:   ${adminEmail} / ${adminPass}`);
  console.log(`  Partner login: ${partnerEmail} / ${partnerPass}`);
}

async function ensureTemplate(t: {
  channel: "SMS" | "EMAIL";
  title: string;
  body: string;
  subject?: string;
  sortOrder: number;
}) {
  const existing = await prisma.messageTemplate.findFirst({
    where: { channel: t.channel, title: t.title },
  });
  if (existing) return;
  await prisma.messageTemplate.create({
    data: {
      channel: t.channel,
      title: t.title,
      body: t.body,
      subject: t.subject ?? null,
      sortOrder: t.sortOrder,
      active: true,
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
