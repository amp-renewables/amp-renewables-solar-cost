// Single source of truth for branding & per-licensee config.
// Every user-facing string, colour, and payout amount that varies between
// licensees flows from here. Change via env vars; the codebase itself stays
// brand-agnostic.

export const brand = {
  productName: process.env.BRAND_PRODUCT_NAME || "TradeRefer",
  companyName: process.env.BRAND_COMPANY_NAME || "AMP Renewables",
  domain: process.env.BRAND_DOMAIN || "amprenewables.co.uk",
  supportEmail:
    process.env.BRAND_SUPPORT_EMAIL || "partners@amprenewables.co.uk",
  supportPhone: process.env.BRAND_SUPPORT_PHONE || "0191 535 2711",

  colors: {
    primary: process.env.BRAND_PRIMARY_COLOR || "#1a3c2a",
    accent: process.env.BRAND_ACCENT_COLOR || "#52b788",
  },

  currency: process.env.BRAND_CURRENCY || "GBP",
  currencySymbol: process.env.BRAND_CURRENCY_SYMBOL || "£",

  payouts: {
    perAppointment: Number(process.env.PAYOUT_APPOINTMENT ?? 50),
    perJob: Number(process.env.PAYOUT_JOB ?? 250),
  },

  services: (process.env.BRAND_SERVICES ||
    "Solar PV,Battery Storage,EV Charger,Heat Pump")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
} as const;

export function formatMoney(amount: number | string): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return `${brand.currencySymbol}${n.toLocaleString("en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function totalPotentialPerJob(): number {
  return brand.payouts.perAppointment + brand.payouts.perJob;
}
