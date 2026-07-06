import Link from "next/link";
import { platform } from "@/lib/platform";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8 text-center">
        <p className="text-xs uppercase tracking-wider text-slate-500">
          404
        </p>
        <h1
          className="text-2xl font-bold text-brand mt-2"
        >
          Page not found
        </h1>
        <p className="text-sm text-slate-600 mt-3">
          The page you&apos;re looking for doesn&apos;t exist on {platform.name}.
        </p>
        <Link
          href="/"
          className="inline-block mt-6 px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:opacity-90"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
