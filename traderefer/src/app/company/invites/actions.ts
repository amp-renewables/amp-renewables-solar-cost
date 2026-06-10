"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth";
import { assertCompanyCanWriteById } from "@/lib/stripe";
import { sendSms, smsConfigured, normaliseUkNumber } from "@/lib/sms";
import {
  parseContactLines,
  renderInviteMessage,
  newInviteToken,
  sentInLast24h,
  DAILY_SEND_CAP,
} from "@/lib/invites";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;
const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";

// ─── Add contacts ────────────────────────────────────────────────────

const AddSchema = z.object({
  contactLines: z.string().trim().min(3, "Paste at least one contact"),
  channel: z.enum(["SMS", "EMAIL"]),
});

export type AddInvitesState = {
  ok?: string;
  error?: string;
  problems?: string[];
};

export async function addInvitesAction(
  _prev: AddInvitesState,
  formData: FormData,
): Promise<AddInvitesState> {
  const admin = await requireCompanyAdmin();
  await assertCompanyCanWriteById(admin.companyId);

  const parsed = AddSchema.safeParse({
    contactLines: formData.get("contactLines"),
    channel: formData.get("channel"),
  });
  if (!parsed.success) {
    return { error: "Paste at least one contact (one per line)." };
  }

  const { contacts, problems } = parseContactLines(parsed.data.contactLines);
  const channel = parsed.data.channel;

  // Channel-specific validation: SMS needs a phone, EMAIL needs an email.
  const usable = contacts.filter((c) =>
    channel === "SMS" ? c.phone : c.email,
  );
  const skipped = contacts.length - usable.length;
  if (usable.length === 0) {
    return {
      error:
        channel === "SMS"
          ? "None of those contacts have a phone number — needed for SMS invites."
          : "None of those contacts have an email address — needed for email invites.",
      problems,
    };
  }

  // Dedupe against contacts already invited by this company on this
  // channel — re-pasting the same list shouldn't create duplicates.
  const existing = await prisma.partnerInvite.findMany({
    where: { companyId: admin.companyId, channel },
    select: { phone: true, email: true },
  });
  const seenPhones = new Set(existing.map((e) => e.phone).filter(Boolean));
  const seenEmails = new Set(existing.map((e) => e.email).filter(Boolean));

  const fresh = usable.filter((c) => {
    if (channel === "SMS") {
      const norm = c.phone ? normaliseUkNumber(c.phone) : null;
      return norm ? !seenPhones.has(norm) : true;
    }
    return c.email ? !seenEmails.has(c.email) : true;
  });
  const duplicates = usable.length - fresh.length;

  if (fresh.length > 0) {
    await prisma.partnerInvite.createMany({
      data: fresh.map((c) => ({
        companyId: admin.companyId,
        name: c.name,
        phone:
          channel === "SMS" && c.phone
            ? (normaliseUkNumber(c.phone) ?? c.phone)
            : c.phone,
        email: c.email,
        channel,
        token: newInviteToken(),
      })),
    });
  }

  revalidatePath("/company/invites");

  const bits = [`Added ${fresh.length} contact${fresh.length === 1 ? "" : "s"}.`];
  if (duplicates > 0) bits.push(`${duplicates} already on your list.`);
  if (skipped > 0)
    bits.push(
      `${skipped} skipped (missing ${channel === "SMS" ? "phone" : "email"}).`,
    );
  return { ok: bits.join(" "), problems };
}

// ─── Send pending invites ────────────────────────────────────────────

const SendSchema = z.object({
  message: z.string().trim().min(20, "Message is too short").max(1600),
  subject: z.string().trim().max(150).optional(),
  channel: z.enum(["SMS", "EMAIL"]),
  // Optional teammate to send as. Validated against the company's admin
  // list server-side; absent (single-admin companies don't render the
  // dropdown) falls back to the logged-in admin.
  senderId: z.string().trim().optional(),
  // The business-relationship confirmation — same legal pattern as the
  // customer-consent checkbox on the referral form.
  contactsConfirmed: z.literal("1", {
    errorMap: () => ({
      message:
        "You must confirm these are your own business contacts before sending.",
    }),
  }),
});

export type SendInvitesState = {
  ok?: string;
  error?: string;
};

export async function sendInvitesAction(
  _prev: SendInvitesState,
  formData: FormData,
): Promise<SendInvitesState> {
  const admin = await requireCompanyAdmin();
  await assertCompanyCanWriteById(admin.companyId);

  const parsed = SendSchema.safeParse({
    message: formData.get("message"),
    subject: formData.get("subject") || undefined,
    channel: formData.get("channel"),
    senderId: formData.get("senderId") || undefined,
    contactsConfirmed: formData.get("contactsConfirmed"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form." };
  }
  const { message, subject, channel, senderId } = parsed.data;

  // Resolve who the batch is "sent as". Defaults to the logged-in admin;
  // a different teammate must be a COMPANY_ADMIN of the SAME company —
  // otherwise the form was tampered with and we fail loudly rather than
  // silently falling back (silently sending as someone else would be
  // worse than an error).
  let sender = {
    fullName: admin.fullName,
    businessName: admin.businessName,
    email: admin.email,
  };
  if (senderId && senderId !== admin.id) {
    const teammate = await prisma.user.findUnique({
      where: { id: senderId },
      select: {
        companyId: true,
        role: true,
        fullName: true,
        businessName: true,
        email: true,
      },
    });
    if (
      !teammate ||
      teammate.companyId !== admin.companyId ||
      teammate.role !== "COMPANY_ADMIN"
    ) {
      return { error: "That sender isn't on your team." };
    }
    sender = {
      fullName: teammate.fullName,
      businessName: teammate.businessName,
      email: teammate.email,
    };
  }

  if (channel === "SMS" && !smsConfigured()) {
    return {
      error:
        "SMS sending isn't configured yet. Use email invites for now, or ask the platform owner to finish Twilio setup.",
    };
  }
  if (channel === "EMAIL" && !resend) {
    return { error: "Email sending isn't configured on this deployment." };
  }

  const company = await prisma.company.findUnique({
    where: { id: admin.companyId },
    select: {
      id: true,
      name: true,
      slug: true,
      payoutAppointment: true,
      payoutJob: true,
      currencySymbol: true,
    },
  });
  if (!company) return { error: "Company not found." };

  // Daily cap — protects the platform's shared sending reputation.
  const sentToday = await sentInLast24h(company.id);
  const remainingToday = DAILY_SEND_CAP - sentToday;
  if (remainingToday <= 0) {
    return {
      error: `You've hit the ${DAILY_SEND_CAP}-invite daily limit. Try again tomorrow.`,
    };
  }

  const pending = await prisma.partnerInvite.findMany({
    where: { companyId: company.id, channel, status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: Math.min(remainingToday, 100), // batch ceiling per click
  });
  if (pending.length === 0) {
    return { error: "No pending contacts on this channel — add some first." };
  }

  const senderName =
    sender.fullName?.trim() || sender.businessName?.trim() || company.name;

  let sent = 0;
  let failed = 0;

  // Sequential sends. At 100 max per batch and ~100-300ms per provider
  // call this stays comfortably inside the 60s function ceiling, and
  // sequencing avoids tripping provider rate limits.
  for (const invite of pending) {
    const body = renderInviteMessage(message, company, invite, senderName);

    let ok = false;
    let failReason: string | null = null;

    if (channel === "SMS") {
      const result = await sendSms(invite.phone ?? "", body);
      ok = result.ok;
      if (!result.ok) failReason = result.error;
    } else {
      try {
        const renderedSubject = renderInviteMessage(
          subject || `Join the ${company.name} referral programme`,
          company,
          invite,
          senderName,
        );
        // Friendly From display name so the recipient's inbox shows
        // "Joe Murray at AMP Renewables" rather than a bare platform
        // address they've never heard of. The actual sending address
        // must stay on our verified domain (Resend rejects anything
        // else); display name is free text. Quotes stripped from the
        // name so a creative company name can't break the header.
        const fromDisplay = `${senderName} at ${company.name}`.replace(
          /["<>]/g,
          "",
        );
        const { error } = await resend!.emails.send({
          from: `${fromDisplay} <${FROM_EMAIL}>`,
          to: invite.email!,
          replyTo: sender.email,
          subject: renderedSubject,
          text: body,
        });
        ok = !error;
        if (error) failReason = error.message;
      } catch (err) {
        ok = false;
        failReason = err instanceof Error ? err.message : "Send failed";
      }
    }

    await prisma.partnerInvite.update({
      where: { id: invite.id },
      data: ok
        ? { status: "SENT", sentAt: new Date(), sentMessage: body, failReason: null }
        : { status: "FAILED", failReason },
    });
    if (ok) sent += 1;
    else failed += 1;
  }

  revalidatePath("/company/invites");

  const bits = [`Sent ${sent} invite${sent === 1 ? "" : "s"}.`];
  if (failed > 0) bits.push(`${failed} failed — see the list below for reasons.`);
  if (pending.length === Math.min(remainingToday, 100) && pending.length === 100)
    bits.push("Click send again for the next batch.");
  return { ok: bits.join(" ") };
}

// ─── Housekeeping ────────────────────────────────────────────────────

export async function deleteInviteAction(formData: FormData) {
  const admin = await requireCompanyAdmin();
  await assertCompanyCanWriteById(admin.companyId);

  const id = String(formData.get("inviteId") || "");
  if (!id) return;

  const invite = await prisma.partnerInvite.findUnique({
    where: { id },
    select: { companyId: true },
  });
  if (!invite || invite.companyId !== admin.companyId) return;

  await prisma.partnerInvite.delete({ where: { id } });
  revalidatePath("/company/invites");
}

/** Re-queue a FAILED invite so the next send batch retries it. */
export async function retryInviteAction(formData: FormData) {
  const admin = await requireCompanyAdmin();
  await assertCompanyCanWriteById(admin.companyId);

  const id = String(formData.get("inviteId") || "");
  if (!id) return;

  const invite = await prisma.partnerInvite.findUnique({
    where: { id },
    select: { companyId: true, status: true },
  });
  if (!invite || invite.companyId !== admin.companyId) return;
  if (invite.status !== "FAILED") return;

  await prisma.partnerInvite.update({
    where: { id },
    data: { status: "PENDING", failReason: null },
  });
  revalidatePath("/company/invites");
}
