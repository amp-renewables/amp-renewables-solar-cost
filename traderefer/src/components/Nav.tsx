import Link from "next/link";
import { platform } from "@/lib/platform";
import type { SessionUser } from "@/lib/auth";
import type { Company } from "@prisma/client";

const partnerLinks = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/refer", label: "Refer a customer" },
  { href: "/dashboard/referrals", label: "My referrals" },
  { href: "/dashboard/payouts", label: "Payouts" },
  { href: "/dashboard/templates", label: "Templates" },
  { href: "/dashboard/settings", label: "Account" },
];

const companyLinks = [
  { href: "/company", label: "Overview" },
  { href: "/company/referrals", label: "Referrals" },
  { href: "/company/partners", label: "Partners" },
  { href: "/company/payouts", label: "Payouts" },
  { href: "/company/templates", label: "Templates" },
  { href: "/company/settings", label: "Settings" },
];

const platformLinks = [
  { href: "/platform", label: "Overview" },
  { href: "/platform/companies", label: "Companies" },
];

export function Nav({
  user,
  company,
}: {
  user: SessionUser;
  company?: Company | null;
}) {
  const links =
    user.role === "SUPERADMIN"
      ? platformLinks
      : user.role === "COMPANY_ADMIN"
        ? companyLinks
        : partnerLinks;

  const rolePill =
    user.role === "SUPERADMIN"
      ? "Platform"
      : user.role === "COMPANY_ADMIN"
        ? "Admin"
        : null;

  return (
    <header className="bg-brand text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {company?.logoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={company.logoUrl}
              alt={company.name}
              className="h-7 w-auto"
            />
          ) : (
            <Link
              href={links[0]?.href ?? "/"}
              className="font-bold text-lg"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              {company?.name ?? platform.name}
            </Link>
          )}
          {rolePill && (
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded">
              {rolePill}
            </span>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-3 text-sm text-emerald-100">
          <span className="hidden md:inline">
            {user.businessName || user.fullName || user.email}
          </span>
          <form action="/logout" method="POST">
            <button
              type="submit"
              className="underline hover:text-white cursor-pointer"
            >
              Log out
            </button>
          </form>
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
          <form action="/logout" method="POST" className="sm:hidden ml-auto">
            <button
              type="submit"
              className="px-3 py-2 text-sm whitespace-nowrap hover:bg-white/10 rounded-t-lg cursor-pointer"
            >
              Log out
            </button>
          </form>
        </div>
      </nav>
    </header>
  );
}
