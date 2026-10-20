"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { dateInTz, formatTime } from "@/lib/time";
import { DistanceSlider, type Nearby } from "./distance-slider";

export type CalTeam = { id: string; name: string; colour: string; tz: string };
export type CalEvent = {
  id: string;
  teamId: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  venue: string | null;
  type: string | null;
  here: number;
  externalUrl?: string; // another team's event (organiser view): open on activism.wtf
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// "2026-10" -> every day shown in the month grid (Monday-first, full weeks).
function gridDays(month: string) {
  const first = new Date(`${month}-01T12:00:00Z`);
  const offset = (first.getUTCDay() + 6) % 7; // days since Monday
  const start = new Date(first.getTime() - offset * 864e5);
  const days: string[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getTime() + i * 864e5).toISOString().slice(0, 10);
    if (i >= 35 && d.slice(0, 7) !== month) break; // drop an all-next-month last row
    days.push(d);
  }
  return days;
}

const monthLabel = (month: string) =>
  new Intl.DateTimeFormat("en-AU", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-15T00:00:00Z`));

const dayLabel = (day: string) =>
  new Intl.DateTimeFormat("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${day}T12:00:00Z`));

// Pick a readable text colour for a team colour.
function textOn(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 150 ? "#071130" : "#ffffff";
}

export function CalendarView({
  month,
  prev,
  next,
  teams,
  events,
  regions,
  regionId,
  regionName,
  today,
  nearby = null,
}: {
  month: string;
  prev: string;
  next: string;
  teams: CalTeam[];
  events: CalEvent[];
  regions: { id: string; name: string }[]; // only for God Mode
  regionId: string;
  regionName: string;
  today: string;
  nearby?: Nearby | null; // organisers: the distance slider
}) {
  const router = useRouter();
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [openDay, setOpenDay] = useState<string | null>(null);
  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  // Events by their local date in their own team's time zone.
  const byDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const e of events) {
      if (hidden.has(e.teamId)) continue;
      const tz = teamById.get(e.teamId)?.tz ?? "Australia/Sydney";
      const day = dateInTz(e.startsAt, tz);
      map.set(day, [...(map.get(day) ?? []), e]);
    }
    return map;
  }, [events, hidden, teamById]);

  const days = gridDays(month);
  const inMonth = [...byDay.entries()]
    .filter(([d]) => d.slice(0, 7) === month)
    .sort(([a], [b]) => a.localeCompare(b));
  const total = inMonth.reduce((n, [, list]) => n + list.length, 0);
  const query = (m: string) =>
    `/calendar?m=${m}${regionId && regions.length ? `&region=${regionId}` : ""}${nearby ? `&near=${nearby.mode === "km" ? nearby.km : nearby.mode}` : ""}`;

  // Tap a team: show only that team (tap it again to show everyone).
  function solo(id: string) {
    const onlyThis = hidden.size === teams.length - 1 && !hidden.has(id);
    setHidden(
      onlyThis
        ? new Set()
        : new Set(teams.filter((t) => t.id !== id).map((t) => t.id)),
    );
  }

  // The small × / + on a team: hide or show just that one.
  function toggle(id: string) {
    setHidden((h) => {
      const n = new Set(h);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  // Your own team's events open the attendance page; other teams' events
  // (organiser view) open on activism.wtf.
  const eventHref = (e: CalEvent) =>
    e.externalUrl !== undefined
      ? e.externalUrl || "https://activism.wtf/events"
      : `/calendar/go?event=${e.id}&team=${e.teamId}`;

  return (
    <div className="relative left-1/2 w-screen max-w-6xl -translate-x-1/2 px-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-pink-ink">
            {nearby
              ? nearby.mode === "team"
                ? "Your team"
                : "Your team and nearby"
              : regionName}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {monthLabel(month)}
          </h1>
          <p className="text-sm text-stone-500">
            {total} {total === 1 ? "event" : "events"} across{" "}
            {teams.length - hidden.size} of {teams.length} teams
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {regions.length > 0 && (
            <select
              value={regionId}
              onChange={(e) =>
                router.push(
                  `/calendar?m=${month}${e.target.value ? `&region=${e.target.value}` : ""}`,
                )
              }
              aria-label="Region"
              className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">All regions</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          )}
          <div className="flex overflow-hidden rounded-xl bg-white text-sm ring-1 ring-stone-300">
            <Link
              href={query(prev)}
              className="px-3 py-2 hover:bg-stone-50"
              aria-label="Previous month"
            >
              ←
            </Link>
            <Link
              href={query(today.slice(0, 7))}
              className="border-x border-stone-300 px-3 py-2 hover:bg-stone-50"
            >
              Today
            </Link>
            <Link
              href={query(next)}
              className="px-3 py-2 hover:bg-stone-50"
              aria-label="Next month"
            >
              →
            </Link>
          </div>
        </div>
      </div>

      {nearby && (
        <DistanceSlider
          key={`${nearby.mode}-${nearby.km}`}
          nearby={nearby}
          month={month}
        />
      )}

      {/* Team key: tap a team to see only it; the small × hides just that team */}
      <div className="mt-4 flex flex-wrap gap-2">
        {teams.map((t) => {
          const off = hidden.has(t.id);
          const only = !off && hidden.size === teams.length - 1;
          return (
            <span
              key={t.id}
              className={`flex items-center rounded-full ring-1 transition ${
                only
                  ? "bg-navy text-white ring-navy"
                  : off
                    ? "bg-white text-stone-400 ring-stone-200"
                    : "bg-white text-navy ring-stone-300"
              }`}
            >
              <button
                onClick={() => solo(t.id)}
                aria-pressed={only}
                title={only ? "Show all teams" : `Show only ${t.name}`}
                className="flex items-center gap-1.5 py-1 pl-3 pr-1 text-sm font-medium"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: off ? "#cfd3df" : t.colour }}
                />
                <span className={off ? "line-through" : ""}>{t.name}</span>
              </button>
              <button
                onClick={() => toggle(t.id)}
                aria-label={off ? `Show ${t.name}` : `Hide ${t.name}`}
                title={off ? `Show ${t.name}` : `Hide ${t.name}`}
                className={`mr-1 flex h-5 w-5 items-center justify-center rounded-full text-xs leading-none ${
                  only
                    ? "text-white/50 hover:bg-white/15 hover:text-white"
                    : "text-stone-300 hover:bg-stone-100 hover:text-stone-600"
                }`}
              >
                {off ? "+" : "×"}
              </button>
            </span>
          );
        })}
        {hidden.size > 0 && (
          <button
            onClick={() => setHidden(new Set())}
            className="px-2 text-sm font-medium text-pink-ink"
          >
            Show all
          </button>
        )}
      </div>

      {/* Month grid */}
      <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="grid grid-cols-7 bg-navy text-center text-xs font-semibold uppercase tracking-wide text-white/75">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d) => {
            const list = byDay.get(d) ?? [];
            const other = d.slice(0, 7) !== month;
            const isToday = d === today;
            return (
              <button
                key={d}
                onClick={() => setOpenDay(list.length ? d : null)}
                className={`flex min-h-20 flex-col items-start justify-start border-b border-r border-black/5 p-1 text-left sm:min-h-28 sm:p-1.5 ${
                  other ? "bg-stone-50/70" : "bg-white"
                } ${openDay === d ? "ring-2 ring-inset ring-pink" : ""}`}
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    isToday
                      ? "bg-pink text-navy"
                      : other
                        ? "text-stone-400"
                        : "text-stone-700"
                  }`}
                >
                  {Number(d.slice(8))}
                </span>
                {/* Phones: coloured dots. Bigger screens: little event chips. */}
                <span className="mt-1 flex flex-wrap gap-0.5 sm:hidden">
                  {list.map((e) => (
                    <span
                      key={e.id}
                      className="h-2 w-2 rounded-full"
                      style={{ background: teamById.get(e.teamId)?.colour }}
                    />
                  ))}
                </span>
                <span className="mt-1 hidden w-full space-y-0.5 sm:block">
                  {list.slice(0, 3).map((e) => {
                    const team = teamById.get(e.teamId);
                    return (
                      <span
                        key={e.id}
                        className="block truncate rounded px-1.5 py-0.5 text-[11px] font-semibold leading-tight"
                        style={{
                          background: team?.colour,
                          color: textOn(team?.colour ?? "#ffffff"),
                        }}
                        title={`${team?.name}: ${e.title}`}
                      >
                        {e.type ?? e.title}
                      </span>
                    );
                  })}
                  {list.length > 3 && (
                    <span className="block px-1 text-[11px] font-medium text-stone-500">
                      +{list.length - 3} more
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* The day you tapped, or the whole month as a list */}
      <section className="mt-6">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            {openDay ? dayLabel(openDay) : `All events in ${monthLabel(month)}`}
          </h2>
          {openDay && (
            <button
              onClick={() => setOpenDay(null)}
              className="text-sm font-medium text-pink-ink"
            >
              Show whole month
            </button>
          )}
        </div>
        {(openDay ? [[openDay, byDay.get(openDay) ?? []] as const] : inMonth)
          .length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-500">
            No events this month yet. Teams&apos; events appear here once
            they&apos;re on activism.wtf.
          </p>
        ) : (
          <div className="space-y-4">
            {(openDay
              ? [[openDay, byDay.get(openDay) ?? []] as const]
              : inMonth
            ).map(([day, list]) => (
              <div key={day}>
                {!openDay && (
                  <p className="mb-1.5 text-sm font-semibold text-stone-700">
                    {dayLabel(day)}
                  </p>
                )}
                <ul className="divide-y divide-black/5 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                  {list.map((e) => {
                    const team = teamById.get(e.teamId);
                    return (
                      <li key={e.id}>
                        <a
                          href={eventHref(e)}
                          {...(e.externalUrl !== undefined
                            ? { target: "_blank", rel: "noopener noreferrer" }
                            : {})}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50"
                        >
                          <span
                            className="h-10 w-1.5 shrink-0 rounded-full"
                            style={{ background: team?.colour }}
                          />
                          <span className="w-16 shrink-0 text-sm font-medium text-stone-600">
                            {formatTime(e.startsAt, team?.tz)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">
                              {e.title}
                            </span>
                            <span className="block truncate text-sm text-stone-500">
                              {[team?.name, e.type, e.venue]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </span>
                          {e.here > 0 && (
                            <span className="shrink-0 text-right text-sm text-stone-500">
                              <span className="font-semibold text-stone-800">
                                {e.here}
                              </span>{" "}
                              here
                            </span>
                          )}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-stone-500">
          Times are each team&apos;s local time.
        </p>
      </section>
    </div>
  );
}
