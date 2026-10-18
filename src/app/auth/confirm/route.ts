import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// The link in the login email lands here (the 6-digit code is the main way in;
// this is the backup). We swap it for a session, then send the person on.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = (searchParams.get("type") as EmailOtpType | null) ?? "email";

  const supabase = await createClient();

  let ok = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    ok = !error;
  }

  // Where they were heading before logging in (same site only).
  const saved = decodeURIComponent(
    request.cookies.get("after_login")?.value ?? "/",
  );
  const next = saved.startsWith("/") && !saved.startsWith("//") ? saved : "/";

  const response = NextResponse.redirect(
    new URL(ok ? next : "/login?error=link", origin),
  );
  response.cookies.delete("after_login");
  return response;
}
