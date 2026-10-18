"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { EveryoneRow } from "@/lib/insights";
import { inputClass } from "@/components/form";

type SortKey = "name" | "lastSeen" | "m3" | "m6" | "m12" | "outreach";

const COLS: { key: SortKey; label: string; title: string }[] = [
  { key: "lastSeen", label: "Last event", title: "Most recent event" },
  { key: "m3", label: "3 mo", title: "Events in the last 3 months" },
  { key: "m6", label: "6 mo", title: "Events in the last 6 months" },
  { key: "m12", label: "12 mo", title: "Events in the last 12 months" },
  { key: "outreach", label: "Outreach", title: "Outreach events, all time" },
];

const shortDate = (iso: string) =>
  new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));

// Everyone in the team: last event and how many events in the last 3/6/12 months.
// Tap a column heading to sort by it.
export function EveryoneTable({ rows }: { rows: EveryoneRow[] }) {
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
      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-black/5 text-left text-stone-500">
              <th className="sticky left-0 bg-white px-4 py-2.5 font-medium">
                <button
                  onClick={() => sortBy("name")}
                  className="hover:text-navy"
                >
                  Name{arrow("name")}
                </button>
              </th>
              {COLS.map((c) => (
                <th
                  key={c.key}
                  className="px-3 py-2.5 text-right font-medium"
                  title={c.title}
                >
                  <button
                    onClick={() => sortBy(c.key)}
                    className={`hover:text-navy ${sort === c.key ? "text-navy" : ""}`}
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
                className="border-b border-black/5 last:border-0 hover:bg-stone-50"
              >
                <td className="sticky left-0 bg-white px-4 py-2.5">
                  <Link
                    href={`/people/${r.id}`}
                    className="font-medium hover:text-pink-ink"
                  >
                    {r.name}
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-right text-stone-600">
                  {r.lastSeen ? (
                    <>
                      <span className="text-stone-900">
                        {shortDate(r.lastSeen)}
                      </span>
                      <span className="block text-xs text-stone-500">
                        {r.lastAgo}
                      </span>
                    </>
                  ) : (
                    <span className="text-stone-400">Never</span>
                  )}
                </td>
                <Count n={r.m3} />
                <Count n={r.m6} />
                <Count n={r.m12} />
                <Count n={r.outreach} />
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

function Count({ n }: { n: number }) {
  return (
    <td
      className={`px-3 py-2.5 text-right ${n === 0 ? "text-stone-300" : "font-medium"}`}
    >
      {n}
    </td>
  );
}
