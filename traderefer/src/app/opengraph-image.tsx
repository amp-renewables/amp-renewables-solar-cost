import { ImageResponse } from "next/og";
import { platform } from "@/lib/platform";

// Default OG/Twitter card image for the platform's public pages. Next.js
// auto-serves this for routes that don't provide their own. Brand slate
// background + amber accent, system fonts (no remote font fetch at build).
export const alt = `${platform.name} — turn your contacts into a referral engine`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: platform.colors.primary,
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: platform.colors.accent,
          }}
        >
          {platform.name}
        </div>
        <div
          style={{
            fontSize: 76,
            fontWeight: 800,
            lineHeight: 1.05,
            marginTop: 28,
            maxWidth: 980,
          }}
        >
          Turn your contacts into a referral engine.
        </div>
        <div
          style={{
            fontSize: 34,
            marginTop: 32,
            color: "rgba(255,255,255,0.8)",
            maxWidth: 900,
          }}
        >
          Branded sign-up, partner dashboards and payout tracking — all in one.
        </div>
      </div>
    ),
    size,
  );
}
