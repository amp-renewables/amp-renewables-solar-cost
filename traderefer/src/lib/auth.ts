import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import type { MembershipRole } from "@prisma/client";
import { prisma } from "./db";

const COOKIE_NAME = "traderefer_session";
const SESSION_DAYS = 30;

function getSecret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "AUTH_SECRET env var must be set to a long random string (32+ chars).",
    );
  }
  return new TextEncoder().encode(s);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(
  plain: string,
  hashed: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

// The JWT carries only identity (sub) + session row id (sid). Role and
// company are NOT trusted from the token — they're resolved fresh from
// the DB on every request via the session's active membership, so a
// role change or revoked membership takes effect immediately.
type TokenPayload = {
  sub: string;
  sid: string;
};

async function signToken(payload: TokenPayload, expiresAt: Date) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getSecret());
}

async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    // Pre-multi-org tokens carried extra claims (role, cid); we ignore
    // them. sub + sid is all that's required, so old cookies stay valid.
    if (typeof payload.sub === "string" && typeof payload.sid === "string") {
      return { sub: payload.sub, sid: payload.sid };
    }
    return null;
  } catch {
    return null;
  }
}

export async function createSession(
  userId: string,
  activeMembershipId: string | null,
) {
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const session = await prisma.session.create({
    data: { userId, expiresAt, activeMembershipId },
  });
  const token = await signToken({ sub: userId, sid: session.id }, expiresAt);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      await prisma.session
        .delete({ where: { id: payload.sid } })
        .catch(() => {});
    }
  }
  cookieStore.delete(COOKIE_NAME);
}

// The role a session is currently ACTING as. SUPERADMIN means "platform
// context" (no active membership); the membership roles mean "acting
// within the active membership's company".
export type SessionRole = "SUPERADMIN" | MembershipRole;

export type MembershipSummary = {
  id: string;
  role: MembershipRole;
  companyId: string;
  companyName: string;
  companySlug: string;
};

export type SessionUser = {
  id: string;
  email: string;
  fullName: string | null;
  businessName: string | null;
  isSuperadmin: boolean;
  // Derived from the active membership (or SUPERADMIN in platform
  // context). Null only for a broken account: no memberships and not a
  // superadmin. companyId/membershipId are null exactly when role is
  // SUPERADMIN or null.
  role: SessionRole | null;
  companyId: string | null;
  membershipId: string | null;
  // Every hat this user can wear, oldest first — drives the org
  // switcher in the nav.
  memberships: MembershipSummary[];
};

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const session = await prisma.session.findUnique({
    where: { id: payload.sid },
    include: {
      user: {
        include: {
          memberships: {
            include: { company: { select: { name: true, slug: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });
  if (!session || session.expiresAt < new Date()) return null;

  const u = session.user;
  const memberships: MembershipSummary[] = u.memberships.map((m) => ({
    id: m.id,
    role: m.role,
    companyId: m.companyId,
    companyName: m.company.name,
    companySlug: m.company.slug,
  }));

  // Resolve the active membership. A session can point at a membership
  // that's since been revoked (SetNull) or predate the multi-org model
  // (null) — self-heal by adopting the user's first membership, unless
  // they're a superadmin, whose natural home is platform context.
  let active =
    memberships.find((m) => m.id === session.activeMembershipId) ?? null;
  if (!active && !u.isSuperadmin && memberships.length > 0) {
    active = memberships[0];
    await prisma.session.update({
      where: { id: session.id },
      data: { activeMembershipId: active.id },
    });
  }

  const role: SessionRole | null = active
    ? active.role
    : u.isSuperadmin
      ? "SUPERADMIN"
      : null;

  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    businessName: u.businessName,
    isSuperadmin: u.isSuperadmin,
    role,
    companyId: active?.companyId ?? null,
    membershipId: active?.id ?? null,
    memberships,
  };
});

// Re-point the current session at another of the user's memberships
// (or null for a superadmin returning to platform context). Validates
// ownership — you can't switch into a membership that isn't yours.
export async function setActiveMembership(
  membershipId: string | null,
): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (!user) return null;

  if (membershipId !== null) {
    const owns = user.memberships.some((m) => m.id === membershipId);
    if (!owns) return null;
  } else if (!user.isSuperadmin) {
    // Only superadmins have a no-company context to return to.
    return null;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;

  await prisma.session.update({
    where: { id: payload.sid },
    data: { activeMembershipId: membershipId },
  });
  return user;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireSuperadmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.isSuperadmin) redirect("/dashboard");
  return user;
}

// Acting as a COMPANY_ADMIN of the active membership's company.
export async function requireCompanyAdmin(): Promise<
  SessionUser & { companyId: string; membershipId: string }
> {
  const user = await requireUser();
  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    redirect(landingPathForRole(user.role));
  }
  return user as SessionUser & { companyId: string; membershipId: string };
}

// Acting as a referrer (business partner or ambassador) of the active
// membership's company. Both roles share /dashboard — payout rates are
// the only material difference, and those are resolved per-role at
// payout-creation and display time.
export async function requirePartner(): Promise<
  SessionUser & { companyId: string; membershipId: string }
> {
  const user = await requireUser();
  if (
    (user.role !== "BUSINESS_PARTNER" && user.role !== "AMBASSADOR") ||
    !user.companyId
  ) {
    redirect(landingPathForRole(user.role));
  }
  return user as SessionUser & { companyId: string; membershipId: string };
}

// Pick the right landing page for the role a session is acting as.
export function landingPathForRole(role: SessionRole | null): string {
  if (role === "SUPERADMIN") return "/platform";
  if (role === "COMPANY_ADMIN") return "/company";
  if (role === "BUSINESS_PARTNER" || role === "AMBASSADOR") {
    return "/dashboard";
  }
  return "/login";
}
