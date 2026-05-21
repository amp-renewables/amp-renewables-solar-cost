import "./globals.css";
import type { Metadata } from "next";
import { platform } from "@/lib/platform";

export const metadata: Metadata = {
  title: `${platform.name} — Run your own referral programme`,
  description: `Let local tradesmen refer customers to you. Pay them per appointment and per job sold. Branded sign-up page, partner dashboards, payout tracking — all included.`,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Fraunces:wght@700&display=swap"
          rel="stylesheet"
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `:root { --brand-primary: ${platform.colors.primary}; --brand-accent: ${platform.colors.accent}; }`,
          }}
        />
      </head>
      <body style={{ fontFamily: "'DM Sans', sans-serif" }}>{children}</body>
    </html>
  );
}
