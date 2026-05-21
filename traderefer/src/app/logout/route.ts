import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

// POST-only on purpose. Accepting GET makes the app vulnerable to forced
// logouts via `<img src="/logout">` in user-controlled content (referral
// notes, partner profiles, etc.). Status 303 redirects POST → GET on /.
export async function POST() {
  await destroySession();
  return NextResponse.redirect(
    new URL("/", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"),
    303,
  );
}
