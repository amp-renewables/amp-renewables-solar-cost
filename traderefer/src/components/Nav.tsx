import Link from "next/link";
import { platform } from "@/lib/platform";
import type { SessionUser } from "@/lib/auth";
import type { Company } from "@prisma/client";
import { OrgSwitcher } from "./OrgSwitcher";

const partnerLinks = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/refer", label: "Refer a customer" },
  { href: "/dashboard/referrals", label: "My referrals" },
  { href: "/dashboard/payouts", label: "Payouts" },
  { href: "/dashboard/templates", label: "Templates" },
  { href: "/dashboard/settings", label: "Account" },
];

// Deliberately seven items — Signature lives under Templates, and
// Network + Billing live under Settings (each of those pages carries a
// SubNav tab row). The old direct URLs all still work; emails and
// write-gate CTAs link straight to /company/billing.
const companyLinks = [
  { href: "/company", label: "Overview" },
  { href: "/company/referrals", label: "Referrals" },
  { href: "/company/partners", label: "Partners" },
  { href: "/company/invites", label: "Invites" },
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

  // A switcher only earns its place when there's something to switch to:
  // 2+ memberships, or a superadmin with at least one company hat.
  const contextCount = user.memberships.length + (user.isSuperadmin ? 1 : 0);
  const showSwitcher = contextCount > 1;

  return (
    <header className="bg-brand text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* This nav sits on the dark --brand-primary background, so prefer
              the company's light/inverse logo. If none uploaded, fall back to
              their name as text — better than showing a dark logo that
              disappears into the background. */}
          {company?.logoUrlLight ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={company.logoUrlLight}
              alt={company.name}
              className="h-7 w-auto"
            />
          ) : (
            <Link
              href={links[0]?.href ?? "/"}
              className="font-bold text-lg"
            >
              {company?.name ?? platform.name}
            </Link>
          )}
          {rolePill && (
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded">
              {rolePill}
            </span>
          )}
          {showSwitcher && (
            <OrgSwitcher
              memberships={user.memberships}
              activeMembershipId={user.membershipId}
              isSuperadmin={user.isSuperadmin}
            />
          )}
        </div>
        <div className="hidden sm:flex items-center gap-3 text-sm text-emerald-100">
          <span className="hidden md:inline">
            {user.businessName || user.fullName || user.email}
          </span>
          <Link
            href="/help"
            target="_blank"
            rel="noopener"
            className="underline hover:text-white"
          >
            Help
          </Link>
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
          <div className="sm:hidden ml-auto flex items-center">
            <Link
              href="/help"
              target="_blank"
              rel="noopener"
              className="px-3 py-2 text-sm whitespace-nowrap hover:bg-white/10 rounded-t-lg"
            >
              Help
            </Link>
            <form action="/logout" method="POST">
              <button
                type="submit"
                className="px-3 py-2 text-sm whitespace-nowrap hover:bg-white/10 rounded-t-lg cursor-pointer"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </nav>
    </header>
  );
}
