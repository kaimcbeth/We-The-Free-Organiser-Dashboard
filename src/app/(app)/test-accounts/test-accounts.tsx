"use client";

import { useState, useTransition } from "react";
import { createTestAccount } from "@/app/actions";
import { createClient } from "@/lib/supabase/client";
import { inputClass } from "@/components/form";
import { ROLE_LABEL, type ViewRole } from "@/lib/roles";

const ROLES = ["member", "core_team", "organiser", "regional_lead"] as const;

export function NewTestAccount({ communityName }: { communityName: string }) {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("member");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await createTestAccount(first, last, role);
          if (r.error) setMsg({ ok: false, text: r.error });
          else {
            setMsg({ ok: true, text: `${first} is ready.` });
            setFirst("");
            setLast("");
          }
        });
      }}
      className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
    >
      <h2 className="font-semibold">New test account in {communityName}</h2>
      <div className="grid grid-cols-2 gap-2">
        <input
          value={first}
          onChange={(e) => setFirst(e.target.value)}
          placeholder="First name"
          aria-label="First name"
          required
          className={inputClass}
        />
        <input
          value={last}
          onChange={(e) => setLast(e.target.value)}
          placeholder="Last name (e.g. Test)"
          aria-label="Last name"
          className={inputClass}
        />
      </div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Role">
        {ROLES.map((r) => (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={role === r}
            onClick={() => setRole(r)}
            className={`rounded-xl px-3 py-1.5 text-sm font-semibold ring-1 ${
              role === r
                ? "bg-navy text-white ring-navy"
                : "bg-white text-navy ring-stone-300 hover:bg-stone-50"
            }`}
          >
            {ROLE_LABEL[r]}
          </button>
        ))}
      </div>
      <button
        disabled={pending}
        className="w-full rounded-xl bg-pink px-4 py-2.5 font-semibold text-navy hover:bg-pink-strong disabled:opacity-60"
      >
        {pending ? "Making…" : "Make test account"}
      </button>
      {msg && (
        <p className={`text-sm ${msg.ok ? "text-stone-700" : "text-red-700"}`}>
          {msg.text}
        </p>
      )}
    </form>
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
