// Platform-level config — applies to TradeRefer itself, not individual
// companies. Per-company branding (logo, colours, payout amounts, services)
// lives in the Company DB row and is loaded via src/lib/company.ts.

export const platform = {
  name: process.env.PLATFORM_NAME || "TradeRefer",
  domain: process.env.PLATFORM_DOMAIN || "traderefer.co.uk",
  // Apex is canonical — middleware 308-redirects www → apex. This fallback
  // backs canonical tags, the sitemap and OG metadataBase, so it must be the
  // apex, not www (APP_URL overrides it in production regardless).
  url:
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://traderefer.co.uk",
  supportEmail:
    process.env.PLATFORM_SUPPORT_EMAIL || "support@traderefer.co.uk",

  colors: {
    // TradeRefer's own brand. Deliberately distinct from the green
    // (#1a3c2a / #52b788) AMP Renewables uses — TradeRefer is the
    // platform, AMP is one tenant. Per-company landing pages and admin
    // layouts override these via the --brand-primary / --brand-accent
    // CSS variables.
    primary: process.env.PLATFORM_PRIMARY_COLOR || "#1e293b",
    accent: process.env.PLATFORM_ACCENT_COLOR || "#f59e0b",
  },

  pricing: {
    monthly: Number(process.env.PRICING_MONTHLY ?? 99),
    currency: process.env.PRICING_CURRENCY || "GBP",
    currencySymbol: process.env.PRICING_CURRENCY_SYMBOL || "£",
    trialDays: Number(process.env.TRIAL_DAYS ?? 14),
  },
} as const;

export function formatPrice(amount: number): string {
  return `${platform.pricing.currencySymbol}${amount.toLocaleString("en-GB")}`;
}
