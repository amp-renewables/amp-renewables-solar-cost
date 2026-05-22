import "./globals.css";
import type { Metadata } from "next";
import { platform } from "@/lib/platform";

export const metadata: Metadata = {
  title: `${platform.name} — Turn your contacts into a referral engine`,
  description: `Turn local tradesmen and former customers into a referral engine for your business. Branded sign-up page, partner dashboards, payout tracking — all included.`,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `:root { --brand-primary: ${platform.colors.primary}; --brand-accent: ${platform.colors.accent}; }`,
          }}
        />
      </head>
      <body
        style={{
          fontFamily:
            "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}
