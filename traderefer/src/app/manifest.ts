// Web app manifest — makes TradeRefer installable ("Add to Home Screen")
// on Android/Chrome and gives the installed app its identity. Next.js
// serves this at /manifest.webmanifest and injects the <link> tag.
//
// Deliberately NO service worker: Chrome hasn't required one for
// installability since 2023, we have no offline requirement, and a SW
// brings cache-invalidation problems we don't want while the product
// changes daily. Revisit if offline referral-drafting ever becomes a
// real ask.
//
// start_url is /dashboard — partners are the audience who'll install
// this (submitting referrals from their phone). Company admins live on
// desktop. If a logged-out user opens the installed app, /dashboard
// redirects to /login, which is the right flow anyway.

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TradeRefer",
    short_name: "TradeRefer",
    description:
      "Refer customers, track every job, and see exactly what you're owed.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#fafaf7",
    theme_color: "#1e293b",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
