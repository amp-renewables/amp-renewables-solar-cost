import Link from "next/link";
import { redirect } from "next/navigation";
import { platform } from "@/lib/platform";
import { getSessionUser, landingPathForRole } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect(landingPathForRole(user.role));

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-4 max-w-6xl mx-auto w-full">
        <Link href="/" className="font-bold text-xl text-brand">
          {platform.name}
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-brand mb-2">Log in</h1>
          <p className="text-sm text-slate-600 mb-6">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="underline text-brand">
              Sign up
            </Link>
            .
          </p>
          <LoginForm />
        </div>
      </main>
    </div>
  );
}
