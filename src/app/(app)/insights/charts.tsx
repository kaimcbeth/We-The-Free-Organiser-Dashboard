"use client";

import Link from "next/link";
import { useState } from "react";
import type { Bucket, KindRow, Segment, TopEvent } from "@/lib/insight-charts";

// Insights charts (Kai, 7 Nov 2026). Colours checked with the dataviz
// palette validator: returning blue #3a5bd9 + first-timer pink #e8399f pass
// colour-blind separation; engagement uses one blue, light to dark.
export const RETURNING = "#3a5bd9";
export const FIRST = "#e8399f";
const RAMP: Record<string, string> = {
  regular: "#2b47c4",
  active: "#6f8be6",
  quiet: "#a9baf0",
  once: "#d3dcf7",
  never: "#e7e5e4",
};

function Card({
  title,
  hint,
  children,
  className = "",
}: {
  title: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-5 ${className}`}
    >
      <h2 className="font-semibold tracking-tight">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-stone-500">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-4 text-xs text-stone-600">
      <span className="flex items-center gap-1.5">
        <span
          aria-hidden
          className="h-2.5 w-2.5 rounded-sm"
          style={{ background: RETURNING }}
        />
        Came back
      </span>
      <span className="flex items-center gap-1.5">
        <span
          aria-hidden
          className="h-2.5 w-2.5 rounded-sm"
          style={{ background: FIRST }}
        />
        First time
      </span>
    </div>
  );
}

// People at events per week or month: came back (bottom) + first-timers.
export function GrowthChart({
  weeks,
  months,
  startWeeks,
}: {
  weeks: Bucket[];
  months: Bucket[];
  startWeeks: boolean;
}) {
  const [by, setBy] = useState<"weeks" | "months">(
    startWeeks ? "weeks" : "months",
  );
  const [hover, setHover] = useState<number | null>(null);
  const data = by === "weeks" ? weeks : months;
  const total = (b: Bucket) => b.returning + b.firstTimers;
  const peak = Math.max(...data.map(total), 1);
  // A tidy top for the gridlines: 4, 5, 10, 20, 25, 50…
  const nice = [4, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000].find(
    (n) => n >= peak,
  )!;
  const ticks = [nice, nice / 2, 0];
  const h = (n: number) => `${(n / nice) * 100}%`;
  const all = data.reduce(
    (s, b) => ({ r: s.r + b.returning, f: s.f + b.firstTimers }),
    { r: 0, f: 0 },
  );
  const chip = (v: "weeks" | "months", label: string) => (
    <button
      type="button"
      onClick={() => {
        setBy(v);
        setHover(null);
      }}
      aria-pressed={by === v}
      className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
        by === v ? "bg-white text-navy shadow-sm" : "text-stone-500"
      }`}
    >
      {label}
    </button>
  );
  const shown = hover !== null ? data[hover] : null;
  return (
    <section
      data-tour="insights-charts"
      className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold tracking-tight">People at events</h2>
          <p className="mt-0.5 text-xs text-stone-500">
            Different people each {by === "weeks" ? "week" : "month"}, last 12{" "}
            {by}. {all.f} first-timers and {all.r} who came back.
          </p>
        </div>
        <div className="inline-flex rounded-xl bg-stone-100 p-0.5">
          {chip("weeks", "Weeks")}
          {chip("months", "Months")}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <Legend />
        <p className="h-4 text-right text-xs text-stone-600" aria-live="polite">
          {shown && (
            <>
              <b className="font-semibold text-stone-800">{shown.long}</b>:{" "}
              {total(shown)} people ({shown.firstTimers} new) · {shown.events}{" "}
              {shown.events === 1 ? "event" : "events"}
            </>
          )}
        </p>
      </div>
      <div className="relative mt-3 h-44 pl-7">
        {ticks.map((t) => (
          <div
            key={t}
            aria-hidden
            className="absolute inset-x-0 flex items-center gap-1"
            style={{ bottom: h(t), transform: "translateY(50%)" }}
          >
            <span className="w-6 text-right text-[10px] tabular-nums text-stone-400">
              {t}
            </span>
            <span
              className={`h-px flex-1 ${t === 0 ? "bg-stone-300" : "bg-stone-100"}`}
            />
          </div>
        ))}
        <div
          className="relative flex h-full items-end gap-1 sm:gap-1.5"
          onMouseLeave={() => setHover(null)}
        >
          {data.map((b, n) => (
            <button
              key={b.key}
              type="button"
              onMouseEnter={() => setHover(n)}
              onFocus={() => setHover(n)}
              onClick={() => setHover(hover === n ? null : n)}
              aria-label={`${b.long}: ${b.returning} came back, ${b.firstTimers} first time, ${b.events} events`}
              className={`flex h-full flex-1 flex-col justify-end rounded-t-md ${
                hover === n ? "bg-stone-100/80" : ""
              }`}
            >
              {b.firstTimers > 0 && (
                <span
                  className="w-full rounded-t-[4px]"
                  style={{ height: h(b.firstTimers), background: FIRST }}
                />
              )}
              {b.returning > 0 && (
                <span
                  className={`w-full ${b.firstTimers > 0 ? "mt-[2px]" : "rounded-t-[4px]"}`}
                  style={{ height: h(b.returning), background: RETURNING }}
                />
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-1.5 flex gap-1 pl-7 sm:gap-1.5">
        {data.map((b, n) => (
          <span
            key={b.key}
            className={`flex-1 text-center text-[10px] text-stone-500 ${
              by === "weeks" && n % 2 === 1 ? "invisible sm:visible" : ""
            }`}
          >
            {b.label}
          </span>
        ))}
      </div>
    </section>
  );
}

// Where everyone in the community is now, as one bar.
export function EngagementBar({ segments }: { segments: Segment[] }) {
  const sum = segments.reduce((n, s) => n + s.n, 0) || 1;
  return (
    <Card
      title="Where everyone's at"
      hint={`All ${sum} people in your community, by how often they come.`}
    >
      <div className="flex h-5 gap-[2px] overflow-hidden rounded-[4px]">
        {segments
          .filter((s) => s.n > 0)
          .map((s) => (
            <span
              key={s.key}
              title={`${s.label}: ${s.n}`}
              style={{ flexGrow: s.n, background: RAMP[s.key] }}
            />
          ))}
      </div>
      <ul className="mt-3 space-y-1.5 text-sm">
        {segments.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: RAMP[s.key] }}
            />
            <span className="min-w-0 leading-tight">
              <span className="block font-medium text-stone-800">
                {s.label}
              </span>
              <span className="block text-xs text-stone-500">{s.hint}</span>
            </span>
            <span className="ml-auto tabular-nums text-stone-800">{s.n}</span>
            <span className="w-9 text-right text-xs tabular-nums text-stone-500">
              {Math.round((s.n / sum) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// Of last year's first-timers, how many came to a second event.
export function ComeBack({ back, of }: { back: number; of: number }) {
  const pct = of ? Math.round((back / of) * 100) : 0;
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <Card
      title="Do newcomers come back?"
      hint="First-timers from the last year (after 3 weeks to return)."
    >
      {of === 0 ? (
        <p className="text-sm text-stone-500">
          Not enough yet. This fills in 3 weeks after your first newcomers.
        </p>
      ) : (
        <div className="flex items-center gap-4">
          <svg viewBox="0 0 80 80" className="h-20 w-20 shrink-0" aria-hidden>
            <circle
              cx="40"
              cy="40"
              r={r}
              fill="none"
              stroke="#f5f5f4"
              strokeWidth="9"
            />
            <circle
              cx="40"
              cy="40"
              r={r}
              fill="none"
              stroke={FIRST}
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={`${(pct / 100) * c} ${c}`}
              transform="rotate(-90 40 40)"
            />
            <text
              x="40"
              y="45"
              textAnchor="middle"
              className="fill-navy text-[17px] font-semibold"
            >
              {pct}%
            </text>
          </svg>
          <p className="text-sm text-stone-600">
            <b className="text-stone-800">{back}</b> of {of} came to another
            event. A message after someone&apos;s first event makes a big
            difference.
          </p>
        </div>
      )}
    </Card>
  );
}

// Average people per event, by kind of event.
export function KindChart({ kinds }: { kinds: KindRow[] }) {
  const peak = Math.max(...kinds.map((k) => k.average), 1);
  return (
    <Card
      title="What brings people in"
      hint="Average people checked in per event, last 12 months."
    >
      {kinds.length === 0 ? (
        <p className="text-sm text-stone-500">No check-ins yet.</p>
      ) : (
        <ul className="space-y-2.5">
          {kinds.map((k) => (
            <li key={k.kind} title={`${k.events} events`}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate text-stone-800">{k.kind}</span>
                <span className="shrink-0 tabular-nums">
                  <b className="font-semibold">{k.average}</b>{" "}
                  <span className="text-xs text-stone-500">
                    · {k.events} {k.events === 1 ? "event" : "events"}
                  </span>
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-stone-100">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(k.average / peak) * 100}%`,
                    background: RETURNING,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function TopEvents({ events }: { events: TopEvent[] }) {
  const peak = Math.max(...events.map((e) => e.people), 1);
  return (
    <Card title="Biggest events" hint="Most check-ins, last 12 months.">
      {events.length === 0 ? (
        <p className="text-sm text-stone-500">No check-ins yet.</p>
      ) : (
        <ol className="space-y-2">
          {events.map((e, n) => (
            <li key={e.id}>
              <Link
                href={`/events/${e.id}`}
                className="group flex items-center gap-3"
              >
                <span className="w-4 text-xs tabular-nums text-stone-400">
                  {n + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate text-stone-800 group-hover:underline">
                      {e.title}
                    </span>
                    <span className="shrink-0 text-xs text-stone-500">
                      {e.date} ·{" "}
                      <b className="font-semibold text-stone-800">{e.people}</b>
                    </span>
                  </span>
                  <span className="mt-1 block h-1.5 rounded-full bg-stone-100">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${(e.people / peak) * 100}%`,
                        background: FIRST,
                      }}
                    />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
