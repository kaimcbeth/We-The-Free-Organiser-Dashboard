"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { dismissEventTasks } from "@/app/actions";

// The × next to an event's heading: removes all its tasks (e.g. it was cancelled).
export function RemoveEventTasks({
  eventId,
  count,
}: {
  eventId: string;
  count: number;
}) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  if (asking) {
    return (
      <span className="flex shrink-0 items-center gap-1 text-xs">
        <span className="text-stone-600">Remove all {count}?</span>
        <button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await dismissEventTasks(eventId);
              if (r.error) setError(r.error);
              else router.refresh();
            })
          }
          className="rounded-lg bg-navy px-2 py-1 font-semibold text-white disabled:opacity-60"
        >
          {pending ? "…" : "Yes"}
        </button>
        <button
          onClick={() => setAsking(false)}
          className="rounded-lg px-2 py-1 text-stone-600 hover:bg-black/5"
        >
          No
        </button>
        {error && <span className="text-red-700">{error}</span>}
      </span>
    );
  }

  return (
    <button
      onClick={() => setAsking(true)}
      aria-label="Remove all tasks for this event"
      title="Remove all tasks for this event (e.g. it was cancelled)"
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-stone-300 hover:bg-stone-200/60 hover:text-stone-600"
    >
      <svg
        viewBox="0 0 20 20"
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        aria-hidden
      >
        <path d="M6 6l8 8M14 6l-8 8" strokeLinecap="round" />
      </svg>
    </button>
  );
}
