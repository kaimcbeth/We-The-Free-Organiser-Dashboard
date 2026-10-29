import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Login links land here. Older links (and Google/Facebook) bring a code or a
// token_hash, which we swap for a session. Email links now carry the login in
// the #fragment instead, which never reaches the server: the browser keeps it
// through this redirect and AuthFromLink signs them in on the next page.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = (searchParams.get("type") as EmailOtpType | null) ?? "email";

  const supabase = await createClient();

  let ok = !code && !tokenHash; // nothing here: it's in the #fragment
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
