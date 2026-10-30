"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Answer = {
  film: string;
  version: string | null;
  impact: number | null; // 0-10, null = skipped
  answered_at: string;
  laptop: string | null;
};

type Stat = { views: number; n: number; sum: number };
const tally = (s: Stat, a: Answer) => {
  s.views++;
  if (a.impact !== null) {
    s.n++;
    s.sum += a.impact;
  }
};
const add = (m: Map<string, Stat>, k: string, a: Answer) => {
  const s = m.get(k) ?? { views: 0, n: 0, sum: 0 };
  tally(s, a);
  m.set(k, s);
};
const avg = (s: Stat) => (s.n ? s.sum / s.n : null);
const ENOUGH = 30; // answers before a result is worth comparing

const dayOf = (iso: string, tz: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(iso));
const versionName = (v: string) => v.replace(/\.[^.]+$/, "");

function ago(iso: string, now: number) {
  const m = Math.round((now - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} hr ago` : "";
}

// Live count for the day, and which film (and A/B version) has the most impact.
export function MovieResults({ teamId, tz }: { teamId: string; tz: string }) {
  const [rows, setRows] = useState<Answer[] | null>(null);
  const [now, setNow] = useState(0);

  const load = useCallback(async () => {
    const { data } = await createClient()
      .from("film_survey_responses")
      .select("film, version, impact, answered_at, laptop")
      .eq("team_id", teamId)
      .order("answered_at", { ascending: false })
      .limit(20000);
    setRows((data ?? []) as Answer[]);
    setNow(Date.now());
  }, [teamId]);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const t = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 10000);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  if (!rows) {
    return <p className="mt-6 text-sm text-stone-500">Loading results…</p>;
  }

  const today = dayOf(new Date(now).toISOString(), tz);
  const todays = rows.filter((a) => dayOf(a.answered_at, tz) === today);
  const all: Stat = { views: 0, n: 0, sum: 0 };
  const todayStat: Stat = { views: 0, n: 0, sum: 0 };
  const todayFilms = new Map<string, Stat>();
  const todayLaptops = new Map<string, Stat>();
  for (const a of todays) {
    tally(todayStat, a);
    add(todayFilms, a.film, a);
    add(todayLaptops, a.laptop ?? "Laptop", a);
  }
  const films = new Map<string, Stat>();
  const versions = new Map<string, Map<string, Stat>>();
  for (const a of rows) {
    tally(all, a);
    add(films, a.film, a);
    if (a.version) {
      const vm = versions.get(a.film) ?? new Map<string, Stat>();
      add(vm, a.version, a);
      versions.set(a.film, vm);
    }
  }
  const ranked = [...films.entries()].sort(
    (x, y) => (avg(y[1]) ?? -1) - (avg(x[1]) ?? -1),
  );
  const top = Math.max(1, ...[...todayFilms.values()].map((s) => s.views));

  return (
    <>
      <section className="mt-6 rounded-2xl bg-navy p-5 text-white shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-cyan">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan" />
          </span>
          Live · watched today
        </div>
        <p className="mt-2 text-6xl font-bold tabular-nums">
          {todayStat.views}
        </p>
        <p className="mt-1 text-sm text-white/70">
          {todayStat.views
            ? `${todayStat.n} answered${
                todayStat.n
                  ? ` · average impact ${avg(todayStat)!.toFixed(1)} / 10`
                  : ""
              }${todays[0] ? ` · last one ${ago(todays[0].answered_at, now)}` : ""}`
            : "Nobody yet today. Counts come in as each film ends on a laptop that's online."}
        </p>
        {todayFilms.size > 0 && (
          <ul className="mt-4 space-y-2">
            {[...todayFilms.entries()]
              .sort((x, y) => y[1].views - x[1].views)
              .map(([film, s]) => (
                <li key={film} className="text-sm">
                  <div className="flex justify-between gap-3">
                    <span>{film}</span>
                    <span className="tabular-nums text-white/80">
                      {s.views}
                      {s.n ? ` · ${avg(s)!.toFixed(1)}` : ""}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-white/10">
                    <div
                      className="h-1.5 rounded-full bg-pink"
                      style={{ width: `${(s.views / top) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
          </ul>
        )}
        {todayLaptops.size > 1 && (
          <p className="mt-4 text-xs text-white/60">
            {[...todayLaptops.entries()]
              .sort((x, y) => x[0].localeCompare(y[0]))
              .map(([l, s]) => `${l}: ${s.views}`)
              .join(" · ")}
          </p>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold tracking-tight">
          Which film has the most impact
        </h2>
        <p className="mt-0.5 text-sm text-stone-600">
          Average answer to &ldquo;How much did viewing this video impact
          you?&rdquo; (0 to 10), all events so far. {all.views} viewers, {all.n}{" "}
          answered.
        </p>
        {ranked.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">
            No answers yet. They&apos;ll show here after your first Movie
            Challenge with the player.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {ranked.map(([film, s], i) => {
              const vs = [...(versions.get(film)?.entries() ?? [])].sort(
                (x, y) =>
                  x[0].localeCompare(y[0], undefined, { numeric: true }),
              );
              return (
                <li
                  key={film}
                  className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
                >
                  <Row
                    label={film}
                    s={s}
                    best={i === 0 && ranked.length > 1 && s.n >= ENOUGH}
                    bold
                  />
                  {vs.length > 1 && (
                    <div className="mt-3 space-y-2 border-t border-stone-100 pt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                        A/B test
                      </p>
                      {vs.map(([v, vs2]) => (
                        <Row key={v} label={versionName(v)} s={vs2} />
                      ))}
                      {vs.some(([, x]) => x.n < ENOUGH) && (
                        <p className="text-xs text-stone-500">
                          Too early to call: aim for about {ENOUGH} answers for
                          each version before comparing.
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}

function Row({
  label,
  s,
  best = false,
  bold = false,
}: {
  label: string;
  s: Stat;
  best?: boolean;
  bold?: boolean;
}) {
  const a = avg(s);
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className={bold ? "font-semibold" : "text-sm"}>{label}</span>
        {best && (
          <span className="rounded-full bg-pink/15 px-2 py-0.5 text-xs font-semibold text-pink-ink">
            Highest impact
          </span>
        )}
        {bold && s.n > 0 && s.n < ENOUGH && (
          <span className="text-xs text-stone-400">early days</span>
        )}
        <span
          className={`ml-auto tabular-nums ${bold ? "text-lg font-semibold" : "text-sm font-medium"}`}
        >
          {a === null ? "–" : a.toFixed(1)}
        </span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-stone-100">
        <div
          className="h-1.5 rounded-full bg-cyan"
          style={{ width: `${((a ?? 0) / 10) * 100}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-stone-500">
        {s.views} {s.views === 1 ? "viewer" : "viewers"}, {s.n} answered
      </p>
    </div>
  );
}
