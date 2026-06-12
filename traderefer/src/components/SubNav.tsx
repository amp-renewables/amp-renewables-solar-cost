import Link from "next/link";

// Tab row for pages grouped under one top-nav item (Templates ↔
// Signature, Settings ↔ Network ↔ Billing). Server component — active
// state is passed in by the page rather than sniffed from the URL.
export function SubNav({
  items,
  active,
}: {
  items: { href: string; label: string }[];
  active: string;
}) {
  return (
    <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
      {items.map((item) => {
        const isActive = item.href === active;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3 py-2 text-sm font-medium -mb-px border-b-2 whitespace-nowrap ${
              isActive
                ? "border-brand text-brand"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export const TEMPLATE_TABS = [
  { href: "/company/templates", label: "Message templates" },
  { href: "/company/signature", label: "Email signature" },
];

export const SETTINGS_TABS = [
  { href: "/company/settings", label: "Programme settings" },
  { href: "/company/network", label: "Network" },
  { href: "/company/billing", label: "Billing" },
];
