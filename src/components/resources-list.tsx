"use client";

import { useState } from "react";
import { RESOURCE_SECTIONS, RESOURCES_COMING_SOON } from "@/lib/resources";
import { GearTracker } from "@/components/gear-tracker";

const has = (q: string, ...text: (string | undefined)[]) =>
  !q || text.some((t) => t?.toLowerCase().includes(q));

// The Resources & Training page (organisers and the Core Team).
export function ResourcesList({ teamId }: { teamId: string | null }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const sections = RESOURCE_SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((r) =>
      has(q, r.title, r.about, r.area, r.tip, s.title),
    ),
  })).filter((s) => s.items.length);
  const soon = RESOURCES_COMING_SOON.filter((r) => has(q, r.title, r.about));

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        Resources &amp; Training
      </h1>
      <p className="mt-1 text-sm text-stone-600">
        Guides and documents for running events, and your gear. More coming
        soon.
      </p>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search resources"
        aria-label="Search resources"
        className="mt-4 w-full rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-cyan"
      />
      {sections.map((s) => (
        <section key={s.title} className="mt-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
            {s.title}
          </h2>
          <ul className="space-y-3">
            {s.items.map((r) => (
              <li
                key={r.file}
                className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{r.title}</h3>
                  {r.area && (
                    <span className="rounded-full bg-cyan/25 px-2 py-0.5 text-xs font-semibold text-navy">
                      {r.area}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-stone-600">{r.about}</p>
                {r.tip && (
                  <p className="mt-1 text-xs text-stone-500">{r.tip}</p>
                )}
                <div className="mt-3 flex gap-2">
                  <a
                    href={r.file}
                    target="_blank"
                    rel="noopener"
                    className="rounded-xl bg-navy px-3 py-1.5 text-sm font-semibold text-white hover:bg-navy-2"
                  >
                    Open
                  </a>
                  <a
                    href={r.file}
                    download
                    className="rounded-xl px-3 py-1.5 text-sm font-semibold text-navy ring-1 ring-black/10 hover:bg-white"
                  >
                    Download
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {teamId && !q && <GearTracker teamId={teamId} />}
      {soon.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
            Coming soon
          </h2>
          <ul className="space-y-2">
            {soon.map((r) => (
              <li
                key={r.title}
                className="rounded-2xl border border-dashed border-stone-300 px-4 py-3"
              >
                <p className="font-medium text-stone-700">{r.title}</p>
                <p className="text-sm text-stone-500">{r.about}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="mt-10 text-xs text-stone-400">
        The Movement Hub is open source.{" "}
        <a
          href="https://github.com/kaimcbeth/We-The-Free-Organiser-Dashboard"
          target="_blank"
          rel="noopener"
          className="underline hover:text-stone-700"
        >
          Source code
        </a>
      </p>
      {q && !sections.length && !soon.length && (
        <p className="mt-6 text-sm text-stone-500">
          Nothing matches &ldquo;{query}&rdquo;.
        </p>
      )}
    </div>
  );
}
