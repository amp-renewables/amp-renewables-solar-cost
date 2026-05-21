import Link from "next/link";
import { brand } from "@/lib/brand";
import type { SessionUser } from "@/lib/auth";

const partnerLinks = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/refer", label: "Refer a customer" },
  { href: "/dashboard/referrals", label: "My referrals" },
  { href: "/dashboard/payouts", label: "Payouts" },
  { href: "/dashboard/templates", label: "Templates" },
];

const adminLinks = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/referrals", label: "Referrals" },
  { href: "/admin/partners", label: "Partners" },
  { href: "/admin/payouts", label: "Payouts" },
  { href: "/admin/templates", label: "Templates" },
];

export function Nav({ user }: { user: SessionUser }) {
  const links = user.role === "ADMIN" ? adminLinks : partnerLinks;

  return (
    <header className="bg-brand text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link
            href={user.role === "ADMIN" ? "/admin" : "/dashboard"}
            className="font-bold text-lg"
          >
            {brand.productName}
            {user.role === "ADMIN" && (
              <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded">
                Admin
              </span>
            )}
          </Link>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-sm text-emerald-100">
          <span className="hidden md:inline">
            {user.businessName || user.fullName || user.email}
          </span>
          <a href="/logout" className="underline hover:text-white">
            Log out
          </a>
        </div>
      </div>
      <nav className="bg-black/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-3 py-2 text-sm whitespace-nowrap hover:bg-white/10 rounded-t-lg"
            >
              {l.label}
            </Link>
          ))}
          <a
            href="/logout"
            className="sm:hidden px-3 py-2 text-sm whitespace-nowrap hover:bg-white/10 rounded-t-lg ml-auto"
          >
            Log out
          </a>
        </div>
      </nav>
    </header>
  );
}
