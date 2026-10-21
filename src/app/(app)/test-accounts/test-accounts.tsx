"use client";

import { useState, useTransition } from "react";
import { setTestRole } from "@/app/actions";
import { useRouter } from "next/navigation";
import { signInAsTestPerson } from "@/lib/test-login";
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

// Switch this browser to the test account.
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
    const err = await signInAsTestPerson({ personId, role });
    if (err) {
      setBusy(false);
      setError(err);
    }
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
