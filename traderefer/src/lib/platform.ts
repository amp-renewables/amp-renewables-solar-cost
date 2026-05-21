// Platform-level config — applies to TradeRefer itself, not individual
// companies. Per-company branding (logo, colours, payout amounts, services)
// lives in the Company DB row and is loaded via src/lib/company.ts.

export const platform = {
  name: process.env.PLATFORM_NAME || "TradeRefer",
  domain: process.env.PLATFORM_DOMAIN || "traderefer.co.uk",
  url:
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://www.traderefer.co.uk",
  supportEmail:
    process.env.PLATFORM_SUPPORT_EMAIL || "support@traderefer.co.uk",

  colors: {
    primary: process.env.PLATFORM_PRIMARY_COLOR || "#1a3c2a",
    accent: process.env.PLATFORM_ACCENT_COLOR || "#52b788",
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
