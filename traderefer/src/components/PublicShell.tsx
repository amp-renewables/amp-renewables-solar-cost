// Shared chrome for public marketing / legal / help pages. Keeps the
// header, footer and link sets in sync without duplicating markup across
// /help, /terms, /privacy.

import Link from "next/link";
import { platform } from "@/lib/platform";
import { Logo } from "./Logo";

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <Logo variant="dark" size="md" />
        <nav className="flex items-center gap-3 text-sm">
          <Link
            href="/login"
            className="px-4 py-2 text-slate-700 hover:underline"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="px-4 py-2 rounded-lg btn-primary font-medium"
          >
            Start free trial
          </Link>
        </nav>
      </header>

      {children}

      <footer className="text-center text-sm text-slate-500 py-10 px-6 space-y-4 border-t border-slate-200 mt-12">
        <div className="flex justify-center opacity-60">
          <Logo variant="dark" size="sm" />
        </div>
        <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-slate-600">
          <Link href="/" className="hover:text-brand">
            Home
          </Link>
          <Link href="/help" className="hover:text-brand">
            Help
          </Link>
          <Link href="/terms" className="hover:text-brand">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-brand">
            Privacy
          </Link>
          <a
            href={`mailto:${platform.supportEmail}`}
            className="hover:text-brand"
          >
            Contact
          </a>
        </nav>
        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()} {platform.name}.
        </p>
      </footer>
    </div>
  );
}
