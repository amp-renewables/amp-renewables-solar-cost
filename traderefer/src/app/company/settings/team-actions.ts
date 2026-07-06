"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, requireCompanyAdmin } from "@/lib/auth";
import { assertCompanyCanWriteById } from "@/lib/stripe";
import { sendTeamInviteEmail } from "@/lib/email";
import { platform } from "@/lib/platform";
import { MAX_TEAM_SIZE } from "./team-config";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

const InviteSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter their name"),
  email: z.string().trim().email("Enter a valid email"),
});

export type InviteState = {
  errors?: Record<string, string>;
  formError?: string;
  ok?: string;
};

export async function inviteTeamMemberAction(
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const admin = await requireCompanyAdmin();
  await assertCompanyCanWriteById(admin.companyId);
  const parsed = InviteSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && !errors[field]) {
        errors[field] = issue.message;
      }
    }
    return { errors };
  }

  const email = parsed.data.email.toLowerCase();

  // Enforce the team-size limit.
  const teamCount = await prisma.membership.count({
    where: { companyId: admin.companyId, role: "COMPANY_ADMIN" },
  });
  if (teamCount >= MAX_TEAM_SIZE) {
    return {
      formError: `You already have ${MAX_TEAM_SIZE} team members — that's the limit on your current plan.`,
    };
  }

  const company = await prisma.company.findUnique({
    where: { id: admin.companyId },
    select: { name: true },
  });
  const base =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    platform.url;

  // Multi-org: the invitee may already have a TradeRefer account (a
  // partner here or elsewhere, or an admin of their own company). In
  // that case we just attach an admin membership and point them at
  // login — no password dance, their existing credentials work.
  const existing = await prisma.user.findUnique({
    where: { email },
    include: { memberships: { where: { companyId: admin.companyId } } },
  });
  if (existing) {
    if (existing.memberships.length > 0) {
      return {
        errors: {
          email: "That person is already part of this company.",
        },
      };
    }
    await prisma.membership.create({
      data: {
        userId: existing.id,
        companyId: admin.companyId,
        role: "COMPANY_ADMIN",
      },
    });
    await sendTeamInviteEmail(
      { email, fullName: existing.fullName ?? parsed.data.fullName },
      { name: company?.name ?? "your company", inviter: admin.fullName ?? admin.email },
      `${base}/login`,
    );
    revalidatePath("/company/settings");
    return { ok: `${email} added — they can switch to this company after logging in.` };
  }

  // Create the user with a random password they'll never use (they'll set
  // their real one via the invite link). Random bytes -> bcrypt makes the
  // hash unguessable in the unlikely event the invite email never arrives.
  const placeholderPassword = crypto.randomBytes(32).toString("base64url");
  const hashedPlaceholder = await hashPassword(placeholderPassword);

  const { rawToken } = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email,
        hashedPassword: hashedPlaceholder,
        fullName: parsed.data.fullName,
        businessName: company?.name ?? null,
      },
    });
    await tx.membership.create({
      data: {
        userId: newUser.id,
        companyId: admin.companyId,
        role: "COMPANY_ADMIN",
      },
    });
    const rawToken = crypto.randomBytes(32).toString("base64url");
    await tx.passwordResetToken.create({
      data: {
        userId: newUser.id,
        hashedToken: hashToken(rawToken),
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
    });
    return { rawToken };
  });

  const inviteUrl = `${base}/reset-password?token=${rawToken}`;

  await sendTeamInviteEmail(
    { email, fullName: parsed.data.fullName },
    { name: company?.name ?? "your company", inviter: admin.fullName ?? admin.email },
    inviteUrl,
  );

  revalidatePath("/company/settings");
  return { ok: `Invite sent to ${email}.` };
}

export async function removeTeamMemberAction(formData: FormData) {
  const admin = await requireCompanyAdmin();
  await assertCompanyCanWriteById(admin.companyId);
  const targetId = String(formData.get("userId") || "");
  if (!targetId || targetId === admin.id) return;

  // Multi-org: removing someone from THIS team must not nuke their
  // whole account — they may be a partner or admin elsewhere. Delete the
  // membership; any session acting as it self-heals to another of their
  // memberships (Session.activeMembershipId is SetNull on delete).
  const target = await prisma.membership.findUnique({
    where: {
      userId_companyId: { userId: targetId, companyId: admin.companyId },
    },
    include: {
      user: { select: { isSuperadmin: true, _count: { select: { memberships: true, referrals: true } } } },
    },
  });
  if (!target || target.role !== "COMPANY_ADMIN") return;

  await prisma.membership.delete({ where: { id: target.id } });

  // If that was their only membership and nothing else anchors the
  // account (no referrals, not a superadmin), clean up the orphaned
  // user row too. Restrict on Referral.partner makes the delete safe —
  // best-effort, never blocks the removal itself.
  if (
    !target.user.isSuperadmin &&
    target.user._count.memberships === 1 &&
    target.user._count.referrals === 0
  ) {
    await prisma.user.delete({ where: { id: targetId } }).catch(() => {});
  }
  revalidatePath("/company/settings");
}
