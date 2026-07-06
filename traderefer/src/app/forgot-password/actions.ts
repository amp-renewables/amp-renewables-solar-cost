"use server";

import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { platform } from "@/lib/platform";
import { sendPasswordResetEmail } from "@/lib/email";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const Schema = z.object({
  email: z.string().trim().email("Enter a valid email"),
});

export type ForgotPasswordState = {
  errors?: Record<string, string>;
  // Same message shown whether the email exists or not, to avoid leaking
  // which addresses have accounts.
  ok?: boolean;
};

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function forgotPasswordAction(
  _prev: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  // Throttle reset requests per IP — caps token/email spam. Return the
  // normal success response so we don't reveal the limit (or which emails
  // exist). No token work happens when limited.
  const limited = await rateLimit("forgot-password", await clientIp(), {
    limit: 6,
    windowSec: 3600,
  });
  if (!limited.ok) return { ok: true };

  const parsed = Schema.safeParse({ email: formData.get("email") });
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
  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    // Invalidate any prior pending tokens to avoid token sprawl.
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const rawToken = crypto.randomBytes(32).toString("base64url");
    const hashedToken = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    await prisma.passwordResetToken.create({
      data: { userId: user.id, hashedToken, expiresAt },
    });

    const base =
      process.env.APP_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      platform.url;
    const resetUrl = `${base}/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail(
      { email: user.email, fullName: user.fullName },
      resetUrl,
    );
  }

  // Always return the same response — no account enumeration.
  return { ok: true };
}
