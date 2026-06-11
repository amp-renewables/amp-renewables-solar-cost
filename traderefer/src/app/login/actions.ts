"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, landingPathForRole, verifyPassword } from "@/lib/auth";

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
