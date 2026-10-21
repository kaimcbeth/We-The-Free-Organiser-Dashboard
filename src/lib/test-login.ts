import { createClient } from "@/lib/supabase/client";

export const GOD_RETURN_KEY = "wtf-god-session";

// God Mode: switch this browser to a community's hidden test account
// (Fergus). God's own session is kept so "Back to God Mode" can switch back.
// Returns an error message, or never returns (the page changes).
export async function signInAsTestPerson(opts: {
  personId?: string;
  teamId?: string;
  role?: string;
}): Promise<string> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return "Please sign in again first.";

  let { personId, role } = opts;
  if (!personId && opts.teamId) {
    const { data } = await supabase.rpc("test_person", {
      p_team_id: opts.teamId,
    });
    const p = data as { person_id: string; role: string } | null;
    if (!p?.person_id) return "This community has no test account.";
    personId = p.person_id;
    role = p.role;
  }
  if (!personId) return "No test account to sign in as.";

  const { data, error } = await supabase.functions.invoke("test-login", {
    body: { personId },
  });
  if (error || !data?.token_hash) return "Couldn't sign in as them.";
  try {
    localStorage.setItem(
      GOD_RETURN_KEY,
      JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      }),
    );
  } catch {
    /* without storage, "Back to God Mode" will ask you to sign in again */
  }
  // Leave any "View as" preview behind.
  document.cookie = "view_as=; path=/; max-age=0";
  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: data.token_hash,
    type: "magiclink",
  });
  if (verifyError) return "Couldn't sign in as them.";
  window.location.href =
    role === "member" ? "/me" : role === "core_team" ? "/attendance" : "/";
  return "";
}
