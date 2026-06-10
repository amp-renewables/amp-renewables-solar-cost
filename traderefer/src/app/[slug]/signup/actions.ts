"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { getCompanyBySlug } from "@/lib/company";
import { sendNewPartnerSignupNotification } from "@/lib/email";

const SignupSchema = z.object({
  slug: z.string().min(1),
  fullName: z.string().trim().min(2, "Please enter your full name"),
  businessName: z.string().trim().min(2, "Please enter your business name"),
  email: z.string().trim().email("Please enter a valid email"),
  phone: z.string().trim().min(7, "Please enter a valid phone number"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  // Optional bulk-invite attribution token. Bad/stale tokens are
  // silently ignored — attribution must never block a signup.
  inviteToken: z.string().trim().optional(),
});

export type PartnerSignupState = {
  errors?: Record<string, string>;
  formError?: string;
};

export async function partnerSignupAction(
  _prev: PartnerSignupState,
  formData: FormData,
): Promise<PartnerSignupState> {
  const parsed = SignupSchema.safeParse({
    slug: formData.get("slug"),
    fullName: formData.get("fullName"),
    businessName: formData.get("businessName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    inviteToken: formData.get("inviteToken") || undefined,
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

  const data = parsed.data;
  const company = await getCompanyBySlug(data.slug);
  if (!company) {
    return { formError: "That company doesn't exist anymore." };
  }

  const email = data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { formError: "An account already exists for that email address." };
  }

  const hashed = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      email,
      hashedPassword: hashed,
      fullName: data.fullName,
      businessName: data.businessName,
      phone: data.phone,
      role: "PARTNER",
      companyId: company.id,
    },
  });

  // Attribute the signup to a bulk invite, if one brought them here.
  // Token must belong to the SAME company (a token from company A can't
  // claim credit for a signup at company B). Failures are swallowed —
  // attribution is nice-to-have, the account is already created.
  if (data.inviteToken) {
    try {
      await prisma.partnerInvite.updateMany({
        where: {
          token: data.inviteToken,
          companyId: company.id,
          status: { not: "SIGNED_UP" },
        },
        data: {
          status: "SIGNED_UP",
          signedUpAt: new Date(),
          signedUpUserId: user.id,
        },
      });
    } catch (err) {
      console.error("[partner-signup] invite attribution failed:", err);
    }
  }

  await sendNewPartnerSignupNotification(
    {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      businessName: user.businessName,
      phone: user.phone,
    },
    company,
  );

  await createSession(user.id, user.role, user.companyId);
  redirect("/dashboard");
}
