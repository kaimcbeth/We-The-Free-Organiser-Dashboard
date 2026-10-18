"use client";

import { useActionState } from "react";
import { claimInvite, type ClaimState } from "@/app/attendee-actions";

export function ConnectButton({
  token,
  firstName,
  email,
}: {
  token: string;
  firstName: string;
  email: string;
}) {
  const [state, action, pending] = useActionState<ClaimState, FormData>(
    claimInvite,
    {},
  );
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <p className="text-sm text-stone-600">
        Logged in as <span className="font-medium text-stone-900">{email}</span>
      </p>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-pink px-4 py-3 text-base font-semibold text-navy hover:bg-pink-strong disabled:opacity-60"
      >
        {pending ? "Connecting…" : `Yes, I'm ${firstName}. Connect`}
      </button>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
    </form>
  );
}
