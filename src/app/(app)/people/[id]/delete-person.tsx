"use client";

import { useState, useTransition } from "react";
import { deletePerson } from "@/app/actions";

export function DeletePerson({ personId, name, events }: { personId: string; name: string; events: number }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-sm font-medium text-red-700 hover:text-red-900"
      >
        Delete {name}
      </button>
    );
  }

  return (
    <div className="rounded-2xl bg-red-50 p-4 ring-1 ring-red-200">
      <p className="font-semibold text-red-900">Delete {name}?</p>
      <p className="mt-1 text-sm text-red-800">
        This removes them from the People list
        {events > 0 ? ` and from the ${events} ${events === 1 ? "event" : "events"} they were checked in to` : ""}.
        It can&apos;t be undone.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await deletePerson(personId);
              if (r?.error) setError(r.error);
            })
          }
          className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60"
        >
          {pending ? "Deleting…" : "Yes, delete"}
        </button>
        <button
          disabled={pending}
          onClick={() => setConfirming(false)}
          className="rounded-xl px-4 py-2 text-sm text-stone-700 hover:bg-black/5"
        >
          Cancel
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-800">{error}</p>}
    </div>
  );
}
