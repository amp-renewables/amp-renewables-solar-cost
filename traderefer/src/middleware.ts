// Host-level redirect: www.traderefer.co.uk → traderefer.co.uk (apex is
// canonical). Runs before any page rendering so it catches every route
// including "/" (which the vercel.json `:path*` rule didn't match).
//
// Keep this file small — Next.js middleware runs on every request and
// adds cold-start latency. No DB calls, no imports beyond next/server.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host");
  if (host === "www.traderefer.co.uk") {
    const url = new URL(request.url);
    url.host = "traderefer.co.uk";
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

// Apply to everything except static assets / _next internals / api routes.
// API routes are explicitly excluded so the Stripe webhook keeps working
// even if it ever gets hit on www (which it shouldn't, post-DNS fix).
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
