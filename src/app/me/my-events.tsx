"use client";

import { Countdown } from "@/components/countdown";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

export type MyEvent = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  venue: string | null;
  address: string | null;
  type: string | null;
  source_url: string | null;
  my_status: "going" | "maybe" | "no" | null;
  going: number;
};

const CHOICES = [
  { value: "going", label: "Going" },
  { value: "maybe", label: "Maybe" },
  { value: "no", label: "Can't" },
] as const;

// Upcoming events in their community, with Going / Maybe / Can't.
const SHOW = 3; // events shown before "Show more"

export function MyEvents({ events, tz }: { events: MyEvent[]; tz: string }) {
  const [list, setList] = useState(events);
  const [all, setAll] = useState(false); // the next few, unless they ask for more
  const [error, setError] = useState("");
  const [, start] = useTransition();
  const fmt = (iso: string, o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-AU", { timeZone: tz, ...o }).format(
      new Date(iso),
    );

  function answer(e: MyEvent, value: MyEvent["my_status"]) {
    const next = e.my_status === value ? null : value; // tap again to clear
    const going =
      e.going + (next === "going" ? 1 : 0) - (e.my_status === "going" ? 1 : 0);
    setList((l) =>
      l.map((x) => (x.id === e.id ? { ...x, my_status: next, going } : x)),
    );
    start(async () => {
      const { data, error: err } = await createClient().rpc("set_my_rsvp", {
        p_event_id: e.id,
        p_status: next ?? "",
      });
      if (err || data !== "ok") {
        setError("Couldn't save that. Please try again.");
        setList((l) => l.map((x) => (x.id === e.id ? e : x)));
      } else setError("");
    });
  }

  if (!list.length)
    return (
      <p className="rounded-2xl border border-dashed border-stone-300 px-4 py-4 text-sm text-stone-500">
        No events in the next few weeks yet. Check back soon.
      </p>
    );

  return (
    <div>
      {error && <p className="mb-2 text-sm text-red-700">{error}</p>}
      <ul className="space-y-3">
        {(all ? list : list.slice(0, SHOW)).map((e) => (
          <li
            key={e.id}
            className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
          >
            <p className="text-sm font-medium text-pink-ink">
              {fmt(e.starts_at, {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}{" "}
              · {fmt(e.starts_at, { hour: "numeric", minute: "2-digit" })}
              {e.ends_at &&
                ` – ${fmt(e.ends_at, { hour: "numeric", minute: "2-digit" })}`}
            </p>
            <p className="mt-0.5 font-semibold text-navy">{e.title}</p>
            <Countdown
              start={e.starts_at}
              end={e.ends_at}
              tz={tz}
              className="mt-1"
            />
            <p className="text-sm text-stone-500">
              {[e.type, e.venue ?? e.address].filter(Boolean).join(" · ")}
              {e.going > 0 && ` · ${e.going} going`}
            </p>
            <div
              className="mt-3 flex flex-wrap items-center gap-2"
              role="radiogroup"
              aria-label={`Are you coming to ${e.title}?`}
            >
              {CHOICES.map((c) => {
                const on = e.my_status === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => answer(e, c.value)}
                    className={`rounded-xl px-3.5 py-1.5 text-sm font-semibold ring-1 ${
                      on
                        ? c.value === "going"
                          ? "bg-pink text-navy ring-pink"
                          : "bg-navy text-white ring-navy"
                        : "bg-white text-navy ring-stone-300 hover:bg-stone-50"
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
              {e.source_url && (
                <a
                  href={e.source_url}
                  target="_blank"
                  rel="noopener"
                  className="ml-auto text-xs text-stone-400 hover:text-stone-700"
                >
                  Details ↗
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
      {list.length > SHOW && (
        <button
          type="button"
          onClick={() => setAll(!all)}
          className="mt-3 text-sm font-medium text-stone-500 hover:text-stone-800 hover:underline"
        >
          {all ? "Show fewer" : `Show ${list.length - SHOW} more`}
        </button>
      )}
    </div>
  );
}
