"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, landingPathForRole, verifyPassword } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const LoginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export type LoginState = {
  errors?: Record<string, string>;
  formError?: string;
};

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  // Throttle by IP before any password work — caps single-source brute force.
  const limited = await rateLimit("login", await clientIp(), {
    limit: 12,
    windowSec: 600,
  });
  if (!limited.ok) {
    return {
      formError: "Too many attempts. Please wait a few minutes and try again.",
    };
  }

  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
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

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      memberships: { orderBy: { createdAt: "asc" }, take: 1 },
    },
  });
  if (!user) {
    return { formError: "Email or password is incorrect." };
  }
  // Dormant referrer (referred via a Golden Ticket link but never claimed)
  // — no password is set. Point them at the way to set one rather than
  // returning a confusing "incorrect password".
  if (!user.hashedPassword) {
    return {
      formError:
        "You haven't set a password yet. If you've referred someone, check your email or texts for a link to claim your account — or use ‘Forgot your password?’ below to set one.",
    };
  }
  const ok = await verifyPassword(password, user.hashedPassword);
  if (!ok) {
    return { formError: "Email or password is incorrect." };
  }

  // Land in the user's first (oldest) membership context; superadmins
  // with no memberships land in platform context. The nav's org
  // switcher handles everything beyond that.
  const first = user.memberships[0] ?? null;
  if (!first && !user.isSuperadmin) {
    // No memberships at all — account exists but belongs nowhere.
    // Shouldn't happen outside manual DB surgery; fail closed.
    return {
      formError:
        "Your account isn't linked to any programme. Contact support.",
    };
  }

  await createSession(user.id, first?.id ?? null);
  redirect(landingPathForRole(first ? first.role : "SUPERADMIN"));
}
