"use client";

import { useState, useTransition } from "react";
import { resolveCheckInWait } from "@/app/actions";

// Communities whose organisers haven't replied to a check-in. No more
// reminders for them until they reply or you decide to try again.
export function WaitingList({
  teams,
}: {
  teams: { id: string; name: string; since: string; weeks: number }[];
}) {
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const shown = teams.filter((t) => !gone.has(t.id));
  if (shown.length === 0) return null;

  const act = (id: string, action: "replied" | "try_again") =>
    start(async () => {
      const r = await resolveCheckInWait(id, action);
      if (r.error) setError(r.error);
      else setGone(new Set([...gone, id]));
    });

  return (
    <section>
      <h2 className="font-semibold">Waiting to hear back</h2>
      <p className="mb-3 text-sm text-stone-500">
        No monthly check-ins for these until they reply, so nobody gets messaged
        over and over.
      </p>
      <ul className="divide-y divide-black/5 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        {shown.map((t) => (
          <li
            key={t.id}
            className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
          >
            <span>
              <span className="font-medium">{t.name}</span>
              <span className="ml-2 text-sm text-stone-500">
                {t.weeks < 1
                  ? "messaged this week"
                  : `messaged ${t.weeks} week${t.weeks === 1 ? "" : "s"} ago`}
              </span>
            </span>
            <span className="flex gap-2">
              <button
                disabled={pending}
                onClick={() => act(t.id, "replied")}
                className="rounded-xl bg-navy px-3 py-1.5 text-sm font-semibold text-white"
              >
                They replied
              </button>
              <button
                disabled={pending}
                onClick={() => act(t.id, "try_again")}
                className="rounded-xl px-3 py-1.5 text-sm font-semibold text-navy ring-1 ring-stone-300 hover:bg-stone-50"
              >
                Try again
              </button>
            </span>
          </li>
        ))}
      </ul>
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
    </section>
  );
}
