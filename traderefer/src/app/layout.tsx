import "./globals.css";
import type { Metadata, Viewport } from "next";
import { platform } from "@/lib/platform";

const title = `${platform.name} — Turn your contacts into a referral engine`;
const description = `Turn local tradesmen and former customers into a referral engine for your business. Branded sign-up page, partner dashboards, payout tracking — all included.`;

export const metadata: Metadata = {
  // Resolves relative OG/canonical URLs against the canonical apex host.
  metadataBase: new URL(platform.url),
  title: {
    default: title,
    // Tenant landing pages set their own title; this frames it.
    template: `%s | ${platform.name}`,
  },
  description,
  // iOS "Add to Home Screen" reads these — without them the installed
  // app gets a Safari-chrome wrapper instead of a standalone window.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: platform.name,
  },
  openGraph: {
    type: "website",
    siteName: platform.name,
    title,
    description,
    url: platform.url,
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export const viewport: Viewport = {
  themeColor: "#1e293b",
  width: "device-width",
  initialScale: 1,
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
