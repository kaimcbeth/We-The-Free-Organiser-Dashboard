"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const GOD_RETURN_KEY = "wtf-god-session";

// A bar at the bottom of every page while you're signed in as a test account,
// with a one-tap way back to God Mode.
export function TestAccountBar() {
  const [name, setName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      const meta = session?.user.user_metadata;
      if (meta?.test_account)
        setName(
          [meta.given_name, meta.family_name].filter(Boolean).join(" ") ||
            "test account",
        );
    });
  }, []);

  if (!name) return null;

  async function back() {
    setBusy(true);
    const supabase = createClient();
    let saved: { access_token: string; refresh_token: string } | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(GOD_RETURN_KEY) ?? "null");
    } catch {
      saved = null;
    }
    if (saved) {
      const { error } = await supabase.auth.setSession(saved);
      if (!error) {
        try {
          localStorage.removeItem(GOD_RETURN_KEY);
        } catch {
          /* ignore */
        }
        window.location.assign("/test-accounts");
        return;
      }
    }
    await supabase.auth.signOut({ scope: "local" });
    window.location.assign("/login");
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-yellow text-navy shadow-[0_-2px_8px_rgba(0,0,0,0.1)]">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-2 text-sm">
        <span>
          Test account: <span className="font-semibold">{name}</span>
        </span>
        <button
          onClick={back}
          disabled={busy}
          className="rounded-lg bg-navy px-3 py-1.5 font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Switching…" : "Back to God Mode"}
        </button>
      </div>
    </div>
  );
}
