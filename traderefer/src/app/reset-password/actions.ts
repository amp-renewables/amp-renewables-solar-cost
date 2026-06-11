"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, hashPassword, landingPathForRole } from "@/lib/auth";

const Schema = z
  .object({
    token: z.string().min(10),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type ResetPasswordState = {
  errors?: Record<string, string>;
  formError?: string;
};

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function resetPasswordAction(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const parsed = Schema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
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

  const hashed = hashToken(parsed.data.token);
  const tokenRow = await prisma.passwordResetToken.findUnique({
    where: { hashedToken: hashed },
    include: {
      user: {
        include: {
          memberships: { orderBy: { createdAt: "asc" }, take: 1 },
        },
      },
    },
  });

  if (
    !tokenRow ||
    tokenRow.usedAt ||
    tokenRow.expiresAt < new Date()
  ) {
    return {
      formError:
        "This reset link has expired or is no longer valid. Request a new one.",
    };
  }

  const newHash = await hashPassword(parsed.data.password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: tokenRow.userId },
      data: { hashedPassword: newHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: tokenRow.id },
      data: { usedAt: new Date() },
    }),
    // Invalidate every session so the previous password's cookies stop working.
    prisma.session.deleteMany({ where: { userId: tokenRow.userId } }),
  ]);

  // Log the user in with a fresh session, acting as their first
  // membership (superadmins with none land in platform context).
  const first = tokenRow.user.memberships[0] ?? null;
  await createSession(tokenRow.user.id, first?.id ?? null);
  redirect(landingPathForRole(first ? first.role : "SUPERADMIN"));
}
