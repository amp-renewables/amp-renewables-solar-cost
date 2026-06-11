"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "./db";
import {
  hashPassword,
  landingPathForRole,
  requireUser,
  setActiveMembership,
  verifyPassword,
} from "./auth";

// Org switcher in the nav. Value "platform" (superadmin only) clears the
// active membership; anything else must be one of the user's membership
// ids — setActiveMembership validates ownership and no-ops otherwise.
export async function switchMembershipAction(formData: FormData) {
  const raw = formData.get("membershipId");
  const membershipId =
    typeof raw === "string" && raw && raw !== "platform" ? raw : null;

  const user = await setActiveMembership(membershipId);
  if (!user) redirect("/login");

  const target = membershipId
    ? user.memberships.find((m) => m.id === membershipId)
    : null;
  redirect(
    landingPathForRole(
      target ? target.role : user.isSuperadmin ? "SUPERADMIN" : user.role,
    ),
  );
}

const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmNewPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmNewPassword, {
    message: "Passwords don't match",
    path: ["confirmNewPassword"],
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: "New password must be different from your current one",
    path: ["newPassword"],
  });

export type ChangePasswordState = {
  errors?: Record<string, string>;
  formError?: string;
  ok?: string;
};

export async function changePasswordAction(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const user = await requireUser();
  const parsed = ChangePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmNewPassword: formData.get("confirmNewPassword"),
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

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { hashedPassword: true },
  });
  if (!dbUser) return { formError: "Account no longer exists." };

  const ok = await verifyPassword(parsed.data.currentPassword, dbUser.hashedPassword);
  if (!ok) {
    return { errors: { currentPassword: "Wrong current password" } };
  }

  const newHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { hashedPassword: newHash },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/company/settings");
  return { ok: "Password updated." };
}
