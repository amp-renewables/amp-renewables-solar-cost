import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

// POST-only on purpose. Accepting GET makes the app vulnerable to forced
// logouts via `<img src="/logout">` in user-controlled content (referral
// notes, partner profiles, etc.). Status 303 redirects POST → GET on /.
//
// Origin is derived from `request.url` so the redirect lands on whatever
// host the request came in on (traderefer.co.uk in prod, localhost in dev).
// Avoids needing a NEXT_PUBLIC_BASE_URL env var per environment.
export async function POST(request: Request) {
  await destroySession();
  return NextResponse.redirect(new URL("/", request.url), 303);
}
