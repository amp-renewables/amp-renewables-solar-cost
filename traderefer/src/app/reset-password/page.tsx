import crypto from "node:crypto";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser, landingPathForRole } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { ResetPasswordForm } from "./ResetPasswordForm";

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const user = await getSessionUser();
  if (user) redirect(landingPathForRole(user.role));

  const sp = await searchParams;
  const token = (sp.token ?? "").trim();

  // Validate the token up-front so we can render a useful error rather than
  // letting the user fill in the form for a bad token.
  let tokenValid = false;
  if (token) {
    const row = await prisma.passwordResetToken.findUnique({
      where: { hashedToken: hashToken(token) },
    });
    tokenValid = Boolean(row && !row.usedAt && row.expiresAt > new Date());
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-4 max-w-6xl mx-auto w-full">
        <Logo variant="dark" size="md" />
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          {tokenValid ? (
            <>
              <h1 className="text-2xl font-bold text-brand mb-2">
                Choose a new password
              </h1>
              <p className="text-sm text-slate-600 mb-6">
                We&apos;ll log you in straight after.
              </p>
              <ResetPasswordForm token={token} />
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-brand mb-2">
                Link expired
              </h1>
              <p className="text-sm text-slate-600 mb-6">
                This reset link is invalid or has expired. Request a new one.
              </p>
              <Link
                href="/forgot-password"
                className="btn-primary inline-block px-4 py-2 rounded-lg text-sm font-medium"
              >
                Request a new reset link
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
