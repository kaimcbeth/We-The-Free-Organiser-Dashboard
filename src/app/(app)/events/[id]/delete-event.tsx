"use client";

import { useState, useTransition } from "react";
import { deleteEvent } from "@/app/actions";

// For events added by hand (e.g. old ones from Facebook): a quiet link at the
// bottom of the event page, with a confirm step.
export function DeleteEvent({
  eventId,
  checkedIn,
  photos,
}: {
  eventId: string;
  checkedIn: number;
  photos: number;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <div className="mt-10 text-center">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="text-xs font-medium text-stone-400 hover:text-red-700 hover:underline"
        >
          Delete this event
        </button>
      </div>
    );
  }

  return (
    <div className="mt-10 rounded-2xl bg-red-50 p-4 ring-1 ring-red-200">
      <p className="font-semibold text-red-900">Delete this event?</p>
      <p className="mt-1 text-sm text-red-800">
        {checkedIn > 0
          ? `The ${checkedIn} ${checkedIn === 1 ? "check-in" : "check-ins"} go with it. `
          : ""}
        {photos > 0
          ? `Its ${photos === 1 ? "photo stays" : `${photos} photos stay`} in the Photo Hub. `
          : ""}
        It can&apos;t be undone.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await deleteEvent(eventId);
              if (r?.error) setError(r.error);
            })
          }
          className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60"
        >
          {pending ? "Deleting…" : "Yes, delete"}
        </button>
        <button
          type="button"
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
