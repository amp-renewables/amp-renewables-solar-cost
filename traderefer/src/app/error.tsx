"use client";

// Global error boundary. Rendered when a Server Component, server action,
// or route handler throws. Keeps the user inside the app and gives them a
// retry button instead of falling through to Next.js's stock page.

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Logged to Vercel logs for triage. `digest` is the redacted id Next
    // surfaces in production; the full stack stays server-side.
    console.error("[error boundary]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8 text-center">
        <h1
          className="text-2xl font-bold text-brand"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          Something went wrong
        </h1>
        <p className="text-sm text-slate-600 mt-3">
          {error.message ||
            "We hit an unexpected error. Try again, or head back to your dashboard."}
        </p>
        {error.digest && (
          <p className="text-xs text-slate-400 mt-2 font-mono">
            Ref: {error.digest}
          </p>
        )}
        <div className="mt-6 flex gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:opacity-90 cursor-pointer"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
