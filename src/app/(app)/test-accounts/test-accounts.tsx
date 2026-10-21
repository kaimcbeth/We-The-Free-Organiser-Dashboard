"use client";

import { useState, useTransition } from "react";
import { setTestRole } from "@/app/actions";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ROLE_LABEL, type ViewRole } from "@/lib/roles";

const ROLES = ["member", "core_team", "organiser", "regional_lead"] as const;

// One tap to change the test person's role (their tours reset each time).
export function TestRole({
  personId,
  current,
}: {
  personId: string;
  current: ViewRole;
}) {
  const router = useRouter();
  const [role, setRole] = useState(current);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  return (
    <div>
      <p className="mb-2 text-sm font-medium">Role</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Role">
        {ROLES.map((r) => (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={role === r}
            disabled={pending}
            onClick={() =>
              start(async () => {
                const before = role;
                setRole(r);
                const res = await setTestRole(personId, r);
                if (res.error) {
                  setRole(before);
                  setError(res.error);
                } else {
                  setError("");
                  router.refresh();
                }
              })
            }
            className={`rounded-xl px-3 py-1.5 text-sm font-semibold ring-1 disabled:opacity-60 ${
              role === r
                ? "bg-navy text-white ring-navy"
                : "bg-white text-navy ring-stone-300 hover:bg-stone-50"
            }`}
          >
            {ROLE_LABEL[r]}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-stone-500">
        Changing the role also resets their welcome tour, so you can see it
        again.
      </p>
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}

export const GOD_RETURN_KEY = "wtf-god-session";

// Switch this browser to the test account (God Mode's own session is kept so
// the "Back to God Mode" bar can switch back).
export function SignInAs({
  personId,
  name,
  role,
}: {
  personId: string;
  name: string;
  role: ViewRole;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function go() {
    setBusy(true);
    setError("");
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setBusy(false);
      setError("Please sign in again first.");
      return;
    }
    const { data, error } = await supabase.functions.invoke("test-login", {
      body: { personId },
    });
    if (error || !data?.token_hash) {
      setBusy(false);
      setError("Couldn't sign in as them.");
      return;
    }
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
    if (verifyError) {
      setBusy(false);
      setError("Couldn't sign in as them.");
      return;
    }
    window.location.href =
      role === "member" ? "/me" : role === "core_team" ? "/attendance" : "/";
  }

  return (
    <span className="flex flex-col items-end">
      <button
        onClick={go}
        disabled={busy}
        className="rounded-xl bg-navy px-3 py-1.5 text-sm font-semibold text-white hover:bg-navy-2 disabled:opacity-60"
        title={`See the app as ${name}`}
      >
        {busy ? "Signing in…" : "Sign in as"}
      </button>
      {error && <span className="mt-1 text-xs text-red-700">{error}</span>}
    </span>
  );
}
