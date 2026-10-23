"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { EveryoneRow } from "@/lib/insights";
import { inputClass } from "@/components/form";
import { Avatar } from "@/components/avatar";

type SortKey = "name" | "lastSeen" | "m3" | "m6" | "m12" | "outreach";

const COLS: { key: SortKey; label: string; title: string }[] = [
  { key: "lastSeen", label: "Last event", title: "Most recent event" },
  { key: "m3", label: "3 mo", title: "Events in the last 3 months" },
  { key: "m6", label: "6 mo", title: "Events in the last 6 months" },
  { key: "m12", label: "12 mo", title: "Events in the last 12 months" },
  { key: "outreach", label: "Outreach", title: "Outreach events, all time" },
];

const shortDate = (iso: string, tz: string) =>
  new Intl.DateTimeFormat("en-AU", {
    timeZone: tz,
    day: "numeric",
    month: "short",
  }).format(new Date(iso));

// Everyone in the team: last event and how many events in the last 3/6/12 months.
// Tap a column heading to sort by it.
export function EveryoneTable({
  rows,
  tz,
}: {
  rows: EveryoneRow[];
  tz: string;
}) {
  const [sort, setSort] = useState<SortKey>("lastSeen");
  const [asc, setAsc] = useState(false);
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? rows.filter((r) => r.name.toLowerCase().includes(q))
      : [...rows];
    list.sort((a, b) => {
      let c: number;
      if (sort === "name") c = a.name.localeCompare(b.name);
      else if (sort === "lastSeen")
        c = (a.lastSeen ?? "").localeCompare(b.lastSeen ?? "");
      else c = a[sort] - b[sort];
      if (c === 0) c = a.name.localeCompare(b.name) * (asc ? 1 : -1);
      return asc ? c : -c;
    });
    return list;
  }, [rows, sort, asc, query]);

  function sortBy(key: SortKey) {
    if (key === sort) setAsc(!asc);
    else {
      setSort(key);
      setAsc(key === "name");
    }
  }

  const arrow = (key: SortKey) => (sort === key ? (asc ? " ↑" : " ↓") : "");

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name"
        aria-label="Search everyone"
        className={`${inputClass} mb-3`}
      />
      <div
        data-tour="insights-table"
        className="scroll-mt-24 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5"
      >
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="bg-navy text-left text-white/70">
              <th className="sticky left-0 bg-navy px-4 py-3 font-medium">
                <button
                  onClick={() => sortBy("name")}
                  className={`hover:text-white ${sort === "name" ? "text-white" : ""}`}
                >
                  Name{arrow("name")}
                </button>
              </th>
              {COLS.map((c) => (
                <th
                  key={c.key}
                  className="px-2 py-3 text-center font-medium"
                  title={c.title}
                >
                  <button
                    onClick={() => sortBy(c.key)}
                    className={`hover:text-white ${sort === c.key ? "font-semibold text-white" : ""}`}
                  >
                    {c.label}
                    {arrow(c.key)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {shown.map((r) => (
              <tr
                key={r.id}
                className="group border-b border-black/5 last:border-0 odd:bg-white even:bg-stone-50"
              >
                <td className="sticky left-0 bg-inherit px-4 py-2.5">
                  <Link
                    href={`/people/${r.id}`}
                    className="flex items-center gap-2.5 font-medium group-hover:text-pink-ink"
                  >
                    <Avatar name={r.name} url={null} size={28} />
                    <span className="truncate">{r.name}</span>
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <LastSeen
                    tz={tz}
                    iso={r.lastSeen}
                    ago={r.lastAgo}
                    days={r.daysAgo}
                  />
                </td>
                <Count n={r.m3} />
                <Count n={r.m6} />
                <Count n={r.m12} />
                <Count n={r.outreach} pink />
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-stone-500">
            No one matches.
          </p>
        )}
      </div>
    </div>
  );
}

// Recency at a glance: cyan = came in the last 2 weeks, yellow = last 2 months,
// pink = quiet for longer, grey = never.
function LastSeen({
  iso,
  ago,
  days,
  tz,
}: {
  tz: string;
  iso: string | null;
  ago: string;
  days: number | null;
}) {
  if (!iso || days === null) {
    return <span className="text-stone-400">Never</span>;
  }
  const tone =
    days <= 14
      ? "bg-cyan/25 text-navy"
      : days <= 60
        ? "bg-yellow/40 text-navy"
        : "bg-pink/20 text-pink-ink";
  return (
    <span
      className={`inline-block rounded-lg px-2 py-1 text-right leading-tight ${tone}`}
    >
      <span className="block font-semibold">
        {ago.charAt(0).toUpperCase() + ago.slice(1)}
      </span>
      <span className="block text-xs opacity-75">{shortDate(iso, tz)}</span>
    </span>
  );
}

// A count as a coloured pill: darker = more events.
function Count({ n, pink }: { n: number; pink?: boolean }) {
  const tone =
    n === 0
      ? "text-stone-300"
      : pink
        ? n >= 10
          ? "bg-pink text-navy"
          : n >= 3
            ? "bg-pink/50 text-navy"
            : "bg-pink/20 text-navy"
        : n >= 6
          ? "bg-navy text-white"
          : n >= 3
            ? "bg-cyan text-navy"
            : "bg-cyan/30 text-navy";
  return (
    <td className="px-2 py-2.5 text-center">
      <span
        className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 font-semibold ${tone}`}
      >
        {n === 0 ? "–" : n}
      </span>
    </td>
  );
}
