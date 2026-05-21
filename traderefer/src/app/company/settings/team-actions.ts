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
  const teamCount = await prisma.user.count({
    where: { companyId: admin.companyId, role: "COMPANY_ADMIN" },
  });
  if (teamCount >= MAX_TEAM_SIZE) {
    return {
      formError: `You already have ${MAX_TEAM_SIZE} team members — that's the limit on your current plan.`,
    };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return {
      errors: {
        email: "An account already exists for that email address.",
      },
    };
  }

  // Create the user with a random password they'll never use (they'll set
  // their real one via the invite link). Random bytes -> bcrypt makes the
  // hash unguessable in the unlikely event the invite email never arrives.
  const placeholderPassword = crypto.randomBytes(32).toString("base64url");
  const hashedPlaceholder = await hashPassword(placeholderPassword);

  const company = await prisma.company.findUnique({
    where: { id: admin.companyId },
    select: { name: true },
  });

  const { rawToken } = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email,
        hashedPassword: hashedPlaceholder,
        fullName: parsed.data.fullName,
        businessName: company?.name ?? null,
        role: "COMPANY_ADMIN",
        companyId: admin.companyId,
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

  const base =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    platform.url;
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

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { companyId: true, role: true },
  });
  if (
    !target ||
    target.companyId !== admin.companyId ||
    target.role !== "COMPANY_ADMIN"
  ) {
    return;
  }

  // Delete sessions + reset tokens first (cascade handles it actually,
  // but being explicit reads better).
  await prisma.user.delete({ where: { id: targetId } });
  revalidatePath("/company/settings");
}
