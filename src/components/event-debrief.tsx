"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatEventDate, formatTimeRange } from "@/lib/time";

// Movie Challenge debrief (Kai, 14 Nov 2026): what to say in the circle at
// the end of the day. Shout-outs for first-timers and milestones, everyone's
// event count so far (this one included), the day's film numbers and what's
// coming up. Refreshes as people are checked in.

type Person = {
  id: string;
  first_name: string;
  last_name: string | null;
  events: number;
  before_app: boolean;
  first_time: boolean;
};
type Upcoming = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  venue: string | null;
  address: string | null;
};
type Debrief = {
  people: Person[];
  upcoming: Upcoming[];
  watched: number;
  impact: number | null;
};

const MILESTONES = [5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200];

export function ordinal(n: number) {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

// First names, with a last initial only where two first names match.
function shortNames(people: Person[]) {
  const count = new Map<string, number>();
  for (const p of people)
    count.set(p.first_name.trim(), (count.get(p.first_name.trim()) ?? 0) + 1);
  return (p: Person) => {
    const first = p.first_name.trim();
    const initial = p.last_name?.trim()[0];
    return (count.get(first) ?? 0) > 1 && initial
      ? `${first} ${initial}.`
      : first;
  };
}

export function EventDebrief({
  eventId,
  tz,
  live = false,
  linkBase = "/events/",
}: {
  eventId: string;
  tz: string;
  live?: boolean; // on the day: refresh every 30 s for new check-ins
  linkBase?: string; // where the Coming up rows go: "/events/" or "/attendance/"
}) {
  const [data, setData] = useState<Debrief | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let on = true;
    const load = () =>
      createClient()
        .rpc("event_debrief", { p_event_id: eventId })
        .then(({ data }) => on && data && setData(data as Debrief));
    load();
    const timer = live
      ? setInterval(() => {
          if (document.visibilityState === "visible") load();
        }, 30_000)
      : null;
    return () => {
      on = false;
      if (timer) clearInterval(timer);
    };
  }, [eventId, live]);

  if (!data) return null;
  const name = shortNames(data.people);
  const firsts = data.people.filter((p) => p.first_time);
  const milestones = data.people.filter(
    (p) => !p.first_time && !p.before_app && MILESTONES.includes(p.events),
  );
  const everyone = [...data.people].sort(
    (a, b) => b.events - a.events || a.first_name.localeCompare(b.first_name),
  );
  const count = (p: Person) =>
    p.first_time
      ? "First time"
      : `${p.events}${p.before_app ? "+" : ""} event${p.events === 1 && !p.before_app ? "" : "s"}`;

  const text = [
    "🎬 Movie Challenge debrief",
    data.watched > 0
      ? `${data.watched} films watched today${data.impact != null ? ` · ${data.impact} average impact` : ""}`
      : "",
    data.people.length ? `${data.people.length} of us here today` : "",
    "",
    firsts.length
      ? `🎉 First time with us: ${firsts.map(name).join(", ")}`
      : "",
    ...milestones.map((p) => `🏅 ${name(p)}: ${ordinal(p.events)} event`),
    data.upcoming.length ? "\n📅 Coming up:" : "",
    ...data.upcoming.map(
      (u) =>
        `• ${formatEventDate(u.starts_at, tz)} · ${formatTimeRange(u.starts_at, u.ends_at, tz)} · ${u.title}${u.venue ? ` (${u.venue})` : ""}`,
    ),
  ]
    .filter((l, i, a) => l !== "" || (i > 0 && a[i - 1] !== ""))
    .join("\n")
    .trim();

  async function copy() {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section
      id="debrief"
      aria-labelledby="debrief-heading"
      className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 bg-navy px-4 py-3 text-white">
        <h2 id="debrief-heading" className="text-base font-semibold">
          Debrief
        </h2>
        <p className="text-sm text-white/70">
          {data.people.length} here
          {data.watched > 0 && ` · ${data.watched} films watched`}
          {data.watched > 0 &&
            data.impact != null &&
            ` · ${data.impact} average impact`}
        </p>
        <button
          type="button"
          onClick={copy}
          className="ml-auto text-xs font-medium text-white/70 hover:text-white hover:underline"
        >
          {copied ? "Copied" : "Copy as text"}
        </button>
      </div>

      <div className="space-y-5 p-4">
        <div>
          <h3 className="text-sm font-semibold text-navy">Shout-outs</h3>
          {firsts.length === 0 && milestones.length === 0 ? (
            <p className="mt-1 text-sm text-stone-500">
              No first-timers or milestones yet. They show up here as people are
              checked in.
            </p>
          ) : (
            <div className="mt-2 space-y-2">
              {firsts.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-stone-500">
                    First time with us
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {firsts.map((p) => (
                      <span
                        key={p.id}
                        className="rounded-full bg-pink/15 px-3 py-1 text-sm font-semibold text-pink-ink"
                      >
                        {name(p)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {milestones.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-stone-500">
                    Milestones
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {milestones.map((p) => (
                      <span
                        key={p.id}
                        className="rounded-full bg-yellow/40 px-3 py-1 text-sm font-semibold text-navy"
                      >
                        {name(p)} · {ordinal(p.events)} event
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {everyone.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-navy">
              Everyone here today
            </h3>
            <p className="text-xs text-stone-500">
              Events with us so far, this one included. A + means they came
              before we started using the Hub, so it&apos;s likely more.
            </p>
            <ul className="mt-2 grid gap-x-4 sm:grid-cols-2">
              {everyone.map((p) => (
                <li
                  key={p.id}
                  className="flex items-baseline justify-between gap-2 border-b border-stone-100 py-1.5 text-sm"
                >
                  <span className="truncate">
                    {p.first_name} {p.last_name ?? ""}
                  </span>
                  <span
                    className={`shrink-0 tabular-nums ${
                      p.first_time
                        ? "font-semibold text-pink-ink"
                        : "text-stone-500"
                    }`}
                  >
                    {count(p)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold text-navy">Coming up</h3>
          {data.upcoming.length === 0 ? (
            <p className="mt-1 text-sm text-stone-500">
              Nothing on the calendar yet.
            </p>
          ) : (
            <ul className="mt-1 divide-y divide-stone-100">
              {data.upcoming.map((u) => {
                const body = (
                  <>
                    <span className="w-24 shrink-0 text-xs font-medium text-stone-500 sm:w-28 sm:text-sm">
                      {formatEventDate(u.starts_at, tz)}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium leading-snug">
                        {u.title}
                      </span>
                      <span className="block truncate text-xs text-stone-500">
                        {formatTimeRange(u.starts_at, u.ends_at, tz)}
                        {u.venue || u.address
                          ? ` · ${u.venue ?? u.address}`
                          : ""}
                      </span>
                    </span>
                  </>
                );
                return (
                  <li key={u.id}>
                    <Link
                      href={`${linkBase}${u.id}`}
                      className="flex gap-3 py-2 text-sm hover:bg-stone-50"
                    >
                      {body}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
