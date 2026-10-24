"use client";

import { useState, useTransition } from "react";
import { startActionEarly } from "@/app/actions";
import { useSearchOpen } from "./action-search";
import type { UpcomingAction } from "@/lib/upcoming-actions";

// Actions on their way: thin cards that open up to say more, with the option
// to start one early or say it's already done.
export function ComingUp({
  items,
  whenLabel,
  alwaysOpen = false,
}: {
  items: UpcomingAction[];
  whenLabel: Record<string, string>; // appearsAt -> "in 4 days"
  alwaysOpen?: boolean; // the event page: no toggle
}) {
  // Hidden until asked for, so the list stays calm.
  const [show, setShow] = useState(alwaysOpen);
  const searching = useSearchOpen();
  return (
    <div className="mt-3">
      {!alwaysOpen && (
        <button
          type="button"
          onClick={() => setShow(!show)}
          aria-expanded={show}
          className="rounded-full px-2 py-1 text-xs font-medium text-stone-500 ring-1 ring-stone-200 hover:bg-white hover:text-navy"
        >
          {show ? "Hide" : "Show"} {items.length} coming up {show ? "▴" : "▾"}
        </button>
      )}
      {(show || searching) && (
        <ul className="mt-2 grid items-start gap-2 sm:grid-cols-2">
          {items.map((u) => (
            <Card
              key={`${u.eventId}|${u.kind}`}
              u={u}
              when={whenLabel[u.appearsAt]}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function Card({ u, when }: { u: UpcomingAction; when: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const go = (done: boolean | "skip") =>
    start(async () => {
      const r = await startActionEarly(u.eventId, u.kind, done);
      setError(r.error ?? "");
    });
  return (
    <li
      data-search={`${u.title} ${u.description ?? ""} ${u.eventTitle}`}
      className={`rounded-xl border border-dashed bg-white/60 transition-colors ${open ? "border-stone-400 bg-white sm:col-span-2" : "border-stone-300 hover:border-stone-400"}`}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <span className="min-w-0 truncate text-sm font-medium text-stone-600">
          {u.title}
        </span>
        <span className="shrink-0 text-xs text-stone-400">
          {when} {open ? "▴" : "▾"}
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3 text-sm">
          {u.description && <p className="text-stone-600">{u.description}</p>}
          <p className="mt-1 text-xs text-stone-500">
            About {u.minutes} min · it&apos;ll show up as an action {when}.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => go(false)}
              className="rounded-lg bg-navy px-3 py-1.5 text-sm font-semibold text-white hover:bg-navy-2 disabled:opacity-60"
            >
              Start it now
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => go(true)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50 disabled:opacity-60"
            >
              Already done ✓
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => go("skip")}
              className="ml-auto rounded px-1 py-0.5 text-xs text-stone-400 hover:text-stone-700 hover:underline disabled:opacity-60"
            >
              Remove
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
        </div>
      )}
    </li>
  );
}
