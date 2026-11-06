"use client";

import { useActionState } from "react";
import { claimRoleInvite, type StartState } from "./actions";

export function StartForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState<StartState, FormData>(
    claimRoleInvite,
    {},
  );
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <p className="text-sm text-stone-600">
        Logged in as <span className="font-medium text-stone-900">{email}</span>
      </p>
      <label className="block">
        <span className="text-sm font-medium text-navy">Your name</span>
        <input
          name="name"
          required
          autoComplete="name"
          placeholder="First and last name"
          className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-base"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-pink px-4 py-3 text-base font-semibold text-navy hover:bg-pink-strong disabled:opacity-60"
      >
        {pending ? "Setting you up…" : "Let's go"}
      </button>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
    </form>
  );
}
