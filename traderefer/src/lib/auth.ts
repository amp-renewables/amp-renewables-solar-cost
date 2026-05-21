import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@prisma/client";
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

type TokenPayload = {
  sub: string;
  sid: string;
  role: Role;
  cid: string | null;
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
    if (
      typeof payload.sub === "string" &&
      typeof payload.sid === "string" &&
      typeof payload.role === "string"
    ) {
      return {
        sub: payload.sub,
        sid: payload.sid,
        role: payload.role as Role,
        cid: typeof payload.cid === "string" ? payload.cid : null,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function createSession(
  userId: string,
  role: Role,
  companyId: string | null,
) {
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const session = await prisma.session.create({
    data: { userId, expiresAt },
  });
  const token = await signToken(
    { sub: userId, sid: session.id, role, cid: companyId },
    expiresAt,
  );
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

export type SessionUser = {
  id: string;
  email: string;
  role: Role;
  companyId: string | null;
  fullName: string | null;
  businessName: string | null;
};

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const session = await prisma.session.findUnique({
    where: { id: payload.sid },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;

  const u = session.user;
  return {
    id: u.id,
    email: u.email,
    role: u.role,
    companyId: u.companyId,
    fullName: u.fullName,
    businessName: u.businessName,
  };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireSuperadmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "SUPERADMIN") redirect("/dashboard");
  return user;
}

// Returns a user we know is a COMPANY_ADMIN attached to a company.
export async function requireCompanyAdmin(): Promise<
  SessionUser & { companyId: string }
> {
  const user = await requireUser();
  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    redirect("/dashboard");
  }
  return user as SessionUser & { companyId: string };
}

export async function requirePartner(): Promise<
  SessionUser & { companyId: string }
> {
  const user = await requireUser();
  if (user.role !== "PARTNER" || !user.companyId) {
    redirect("/login");
  }
  return user as SessionUser & { companyId: string };
}

// Pick the right post-login landing page for a user's role.
export function landingPathForRole(role: Role): string {
  if (role === "SUPERADMIN") return "/platform";
  if (role === "COMPANY_ADMIN") return "/company";
  return "/dashboard";
}
