import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, landingPathForRole } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export default async function ForgotPasswordPage() {
  const user = await getSessionUser();
  if (user) redirect(landingPathForRole(user.role));

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-4 max-w-6xl mx-auto w-full">
        <Logo variant="dark" size="md" />
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-brand mb-2">
            Forgot your password?
          </h1>
          <p className="text-sm text-slate-600 mb-6">
            Enter the email on your account and we&apos;ll send you a reset
            link.
          </p>
          <ForgotPasswordForm />
          <p className="text-sm text-slate-600 mt-6">
            Remembered it?{" "}
            <Link href="/login" className="underline text-brand">
              Back to log in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
