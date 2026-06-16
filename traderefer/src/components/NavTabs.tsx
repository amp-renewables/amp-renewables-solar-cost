"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The top-nav tab row. Client component so it can read the current path
// and mark the active tab — the SubNav (server component) takes `active`
// as a prop, but the top nav spans every page so usePathname is cleaner.
//
// Active = the link whose href is the longest matching prefix of the
// current path. That way "/company/referrals" lights up Referrals, while
// "/company" only lights up Overview (it isn't a prefix of itself plus a
// segment).
export function NavTabs({
  links,
}: {
  links: { href: string; label: string }[];
}) {
  const pathname = usePathname();

  const activeHref = links.reduce<string | null>((best, l) => {
    const matches = pathname === l.href || pathname.startsWith(l.href + "/");
    if (matches && l.href.length > (best?.length ?? -1)) return l.href;
    return best;
  }, null);

  return (
    <>
      {links.map((l) => {
        const isActive = l.href === activeHref;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={isActive ? "page" : undefined}
            className={`px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              isActive
                ? "border-brand-accent text-white"
                : "border-transparent text-white/70 hover:text-white"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </>
  );
}
