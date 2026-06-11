"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { Company, MembershipRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  createSession,
  getSessionUser,
  hashPassword,
  setActiveMembership,
  verifyPassword,
} from "@/lib/auth";
import { getCompanyBySlug } from "@/lib/company";
import {
  sendNewPartnerSignupNotification,
  sendPartnerWelcomeEmail,
} from "@/lib/email";

const SignupSchema = z.object({
  slug: z.string().min(1),
  // Which kind of referrer they're signing up as. The form only offers
  // the types the company accepts; validated again server-side below so
  // a hand-rolled POST can't sneak a disallowed type in.
  referrerType: z.enum(["BUSINESS_PARTNER", "AMBASSADOR"]),
  fullName: z.string().trim().min(2, "Please enter your full name"),
  // Optional — past customers and friends refer as themselves, not as a
  // business. Empty string is normalised to undefined below.
  businessName: z.string().trim().optional(),
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

// A company can't accept a referrer type it has switched off. If a
// company has somehow switched BOTH off, business partners are treated
// as accepted — a signup page that rejects everyone helps nobody, and
// settings prevents that state anyway.
function referrerTypeAllowed(
  company: Pick<Company, "acceptsBusinessPartners" | "acceptsAmbassadors">,
  type: MembershipRole,
): boolean {
  const business =
    company.acceptsBusinessPartners || !company.acceptsAmbassadors;
  if (type === "BUSINESS_PARTNER") return business;
  if (type === "AMBASSADOR") return company.acceptsAmbassadors;
  return false;
}

export async function partnerSignupAction(
  _prev: PartnerSignupState,
  formData: FormData,
): Promise<PartnerSignupState> {
  const parsed = SignupSchema.safeParse({
    slug: formData.get("slug"),
    referrerType: formData.get("referrerType"),
    // Optional field: absent/empty → undefined so Zod .optional() accepts
    // it (same null-vs-undefined gotcha as the referral form).
    businessName: formData.get("businessName") || undefined,
    fullName: formData.get("fullName"),
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
  if (!referrerTypeAllowed(company, data.referrerType)) {
    return {
      formError: `${company.name} isn't accepting that type of referrer right now.`,
    };
  }

  // Ambassadors are individuals — never store a business name for them.
  const businessName =
    data.referrerType === "AMBASSADOR" ? null : data.businessName || null;

  const email = data.email.toLowerCase();

  // Multi-org: an email that already has an account (a partner at
  // another company, or a company admin) can join this programme on the
  // same login — IF the password they typed matches their existing one.
  // That proves account ownership; without it, knowing someone's email
  // would be enough to attach things to their account.
  const existing = await prisma.user.findUnique({
    where: { email },
    include: { memberships: { where: { companyId: company.id } } },
  });
  if (existing) {
    const ok = await verifyPassword(data.password, existing.hashedPassword);
    if (!ok) {
      return {
        formError:
          "An account already exists for that email. Enter your existing password to join this programme with it, or log in first.",
      };
    }
    if (existing.memberships.length > 0) {
      return {
        formError:
          "You're already part of this programme — log in instead.",
      };
    }
  }

  const user = existing
    ? existing
    : await prisma.user.create({
        data: {
          email,
          hashedPassword: await hashPassword(data.password),
          fullName: data.fullName,
          businessName,
          phone: data.phone,
        },
      });

  const membership = await prisma.membership.create({
    data: {
      userId: user.id,
      companyId: company.id,
      role: data.referrerType,
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

  // Two emails in parallel: the ops notification to the company admin,
  // and the welcome to the new partner. Both fire-and-forget — a failed
  // send never blocks the signup.
  await Promise.all([
    sendNewPartnerSignupNotification(
      {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        businessName: user.businessName,
        phone: user.phone,
      },
      company,
    ),
    sendPartnerWelcomeEmail(
      { email: user.email, fullName: user.fullName },
      company,
      data.referrerType,
    ),
  ]);

  await createSession(user.id, membership.id);
  redirect("/dashboard");
}

// One-click join for someone who's ALREADY logged in and lands on
// another company's signup page — no new account, no password, just a
// new membership in the chosen role. Their session switches to the new
// company immediately; the org switcher gets them back.
export async function joinProgrammeAction(
  _prev: PartnerSignupState,
  formData: FormData,
): Promise<PartnerSignupState> {
  const user = await getSessionUser();
  if (!user) {
    return { formError: "You're not logged in anymore — refresh the page." };
  }

  const parsed = z
    .object({
      slug: z.string().min(1),
      referrerType: z.enum(["BUSINESS_PARTNER", "AMBASSADOR"]),
      inviteToken: z.string().trim().optional(),
    })
    .safeParse({
      slug: formData.get("slug"),
      referrerType: formData.get("referrerType"),
      inviteToken: formData.get("inviteToken") || undefined,
    });
  if (!parsed.success) {
    return { formError: "Something went wrong — refresh and try again." };
  }

  const company = await getCompanyBySlug(parsed.data.slug);
  if (!company) {
    return { formError: "That company doesn't exist anymore." };
  }
  if (!referrerTypeAllowed(company, parsed.data.referrerType)) {
    return {
      formError: `${company.name} isn't accepting that type of referrer right now.`,
    };
  }
  if (user.memberships.some((m) => m.companyId === company.id)) {
    return { formError: "You're already part of this programme." };
  }

  const membership = await prisma.membership.create({
    data: {
      userId: user.id,
      companyId: company.id,
      role: parsed.data.referrerType,
    },
  });

  if (parsed.data.inviteToken) {
    try {
      await prisma.partnerInvite.updateMany({
        where: {
          token: parsed.data.inviteToken,
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
      console.error("[join-programme] invite attribution failed:", err);
    }
  }

  await Promise.all([
    sendNewPartnerSignupNotification(
      {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        businessName: user.businessName,
        phone: null,
      },
      company,
    ),
    sendPartnerWelcomeEmail(
      { email: user.email, fullName: user.fullName },
      company,
      parsed.data.referrerType,
    ),
  ]);

  await setActiveMembership(membership.id);
  redirect("/dashboard");
}
