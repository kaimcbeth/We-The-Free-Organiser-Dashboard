"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Answer = {
  id: string;
  film: string;
  version: string | null;
  language: string | null; // null = English
  impact: number | null; // 0-10, null = skipped
  answered_at: string;
  laptop: string | null;
};

// A press of the Stop button during a film.
type Stop = {
  id: string;
  film: string;
  version: string | null;
  language: string | null;
  stopped_at: number | null; // seconds in
  duration: number | null;
  stopped_on: string;
  laptop: string | null;
};

type Stat = {
  views: number;
  n: number;
  sum: number;
  stops: number; // Stop presses
  secs: number; // sum of seconds in, for the average
  frac: number; // sum of how far through (0-1)
  fracN: number;
};
const blank = (): Stat => ({
  views: 0,
  n: 0,
  sum: 0,
  stops: 0,
  secs: 0,
  frac: 0,
  fracN: 0,
});
const addStop = (m: Map<string, Stat>, k: string, x: Stop) => {
  const s = m.get(k) ?? blank();
  s.stops++;
  s.secs += x.stopped_at ?? 0;
  if (x.stopped_at !== null && x.duration) {
    s.frac += Math.min(1, x.stopped_at / x.duration);
    s.fracN++;
  }
  m.set(k, s);
};
const mmss = (sec: number) => {
  const t = Math.max(0, Math.round(sec));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};
const tally = (s: Stat, a: Answer) => {
  s.views++;
  if (a.impact !== null) {
    s.n++;
    s.sum += a.impact;
  }
};
const add = (m: Map<string, Stat>, k: string, a: Answer) => {
  const s = m.get(k) ?? blank();
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
  const [stops, setStops] = useState<Stop[]>([]);
  const [now, setNow] = useState(0);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data }, { data: st }] = await Promise.all([
      supabase
        .from("film_survey_responses")
        .select("id, film, version, language, impact, answered_at, laptop")
        .eq("team_id", teamId)
        .order("answered_at", { ascending: false })
        .limit(20000),
      supabase
        .from("film_stops")
        .select(
          "id, film, version, language, stopped_at, duration, stopped_on, laptop",
        )
        .eq("team_id", teamId)
        .order("stopped_on", { ascending: false })
        .limit(20000),
    ]);
    setRows((data ?? []) as Answer[]);
    setStops((st ?? []) as Stop[]);
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
  const all: Stat = blank();
  const todayStat: Stat = blank();
  const todaysStops = stops.filter((x) => dayOf(x.stopped_on, tz) === today);
  const todayFilms = new Map<string, Stat>();
  const todayLaptops = new Map<string, Stat>();
  for (const a of todays) {
    tally(todayStat, a);
    add(todayFilms, a.film, a);
    add(todayLaptops, a.laptop ?? "Laptop", a);
  }
  const films = new Map<string, Stat>();
  // film -> language -> stat, and film -> language -> version -> stat
  const langs = new Map<string, Map<string, Stat>>();
  const versions = new Map<string, Map<string, Map<string, Stat>>>();
  for (const a of rows) {
    tally(all, a);
    add(films, a.film, a);
    const lang = a.language ?? "English";
    const lm = langs.get(a.film) ?? new Map<string, Stat>();
    add(lm, lang, a);
    langs.set(a.film, lm);
    if (a.version) {
      const fv = versions.get(a.film) ?? new Map<string, Map<string, Stat>>();
      const vm = fv.get(lang) ?? new Map<string, Stat>();
      add(vm, a.version, a);
      fv.set(lang, vm);
      versions.set(a.film, fv);
    }
  }
  for (const x of stops) {
    all.stops++;
    addStop(films, x.film, x);
    const lang = x.language ?? "English";
    const lm = langs.get(x.film) ?? new Map<string, Stat>();
    addStop(lm, lang, x);
    langs.set(x.film, lm);
    if (x.version) {
      const fv = versions.get(x.film) ?? new Map<string, Map<string, Stat>>();
      const vm = fv.get(lang) ?? new Map<string, Stat>();
      addStop(vm, x.version, x);
      fv.set(lang, vm);
      versions.set(x.film, fv);
    }
  }
  const byLang = (m: Map<string, unknown>) =>
    [...m.keys()].sort((x, y) =>
      x === "English" ? -1 : y === "English" ? 1 : x.localeCompare(y),
    );
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
              }${
                todaysStops.length
                  ? ` · Stop pressed ${todaysStops.length} ${todaysStops.length === 1 ? "time" : "times"}`
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
              const lm = langs.get(film) ?? new Map<string, Stat>();
              const fv = versions.get(film);
              const tests = byLang(fv ?? new Map())
                .map((lang) => ({
                  lang,
                  vs: [...(fv?.get(lang)?.entries() ?? [])].sort((x, y) =>
                    x[0].localeCompare(y[0], undefined, { numeric: true }),
                  ),
                }))
                .filter((t) => t.vs.length > 1);
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
                  {lm.size > 1 && (
                    <div className="mt-3 space-y-2 border-t border-stone-100 pt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                        By language
                      </p>
                      {byLang(lm).map((lang) => (
                        <Row key={lang} label={lang} s={lm.get(lang)!} />
                      ))}
                    </div>
                  )}
                  {tests.map((t) => (
                    <div
                      key={t.lang}
                      className="mt-3 space-y-2 border-t border-stone-100 pt-3"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                        A/B test{lm.size > 1 ? ` · ${t.lang}` : ""}
                      </p>
                      {t.vs.map(([v, vs2]) => (
                        <Row key={v} label={versionName(v)} s={vs2} />
                      ))}
                      {t.vs.some(([, x]) => x.n < ENOUGH) && (
                        <p className="text-xs text-stone-500">
                          Too early to call: aim for about {ENOUGH} answers for
                          each version before comparing.
                        </p>
                      )}
                    </div>
                  ))}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {rows.length + stops.length > 0 && (
        <AllAnswers rows={rows} stops={stops} tz={tz} onChange={load} />
      )}
    </>
  );
}

// Every answer, newest first, with checkboxes to delete test ones.
type Item = {
  id: string;
  kind: "answer" | "stop";
  film: string;
  version: string | null;
  language: string | null;
  at: string;
  laptop: string | null;
  impact: number | null;
  stopped_at: number | null;
  duration: number | null;
};

function AllAnswers({
  rows,
  stops,
  tz,
  onChange,
}: {
  rows: Answer[];
  stops: Stop[];
  tz: string;
  onChange: () => Promise<void>;
}) {
  const items: Item[] = [
    ...rows.map((a) => ({
      ...a,
      kind: "answer" as const,
      at: a.answered_at,
      stopped_at: null,
      duration: null,
    })),
    ...stops.map((x) => ({
      ...x,
      kind: "stop" as const,
      at: x.stopped_on,
      impact: null,
    })),
  ].sort((x, y) => y.at.localeCompare(x.at));
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(50);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const chosen = items.filter((a) => picked.has(a.id));
  const toggle = (id: string) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const when = (iso: string) =>
    new Intl.DateTimeFormat("en-AU", {
      timeZone: tz,
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));

  async function remove() {
    setBusy(true);
    setError("");
    const supabase = createClient();
    const answerIds = chosen
      .filter((a) => a.kind === "answer")
      .map((a) => a.id);
    const stopIds = chosen.filter((a) => a.kind === "stop").map((a) => a.id);
    const results = await Promise.all([
      answerIds.length
        ? supabase.from("film_survey_responses").delete().in("id", answerIds)
        : { error: null },
      stopIds.length
        ? supabase.from("film_stops").delete().in("id", stopIds)
        : { error: null },
    ]);
    if (results.some((r) => r.error))
      setError("Couldn't delete them. Try again.");
    else {
      setPicked(new Set());
      setConfirming(false);
      await onChange();
    }
    setBusy(false);
  }

  return (
    <section className="mt-8">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-sm font-medium text-stone-500 hover:text-stone-800 hover:underline"
      >
        {open ? "Hide" : "See"} all {rows.length} answers
        {stops.length > 0 &&
          ` and ${stops.length} Stop ${stops.length === 1 ? "press" : "presses"}`}
      </button>
      {open && (
        <div className="mt-3 rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <div className="flex flex-wrap items-center gap-3 border-b border-stone-100 px-4 py-3 text-sm">
            <span className="text-stone-600">
              {chosen.length
                ? `${chosen.length} selected`
                : "Tick answers made while testing to delete them."}
            </span>
            {chosen.length > 0 && !confirming && (
              <>
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
                >
                  Delete {chosen.length}
                </button>
                <button
                  type="button"
                  onClick={() => setPicked(new Set())}
                  className="text-xs text-stone-500 hover:underline"
                >
                  Clear
                </button>
              </>
            )}
            {confirming && (
              <span className="flex items-center gap-2">
                <span className="font-medium text-stone-800">
                  Delete {chosen.length} for good?
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={remove}
                  className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {busy ? "Deleting…" : "Yes, delete"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="text-xs text-stone-500 hover:underline"
                >
                  Cancel
                </button>
              </span>
            )}
            {error && <span className="text-xs text-red-600">{error}</span>}
          </div>
          <ul className="divide-y divide-stone-100">
            {items.slice(0, shown).map((a) => (
              <li key={a.id}>
                <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm hover:bg-stone-50">
                  <input
                    type="checkbox"
                    checked={picked.has(a.id)}
                    onChange={() => toggle(a.id)}
                    className="h-4 w-4 accent-pink"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="font-medium text-stone-800">{a.film}</span>
                    {a.version && (
                      <span className="ml-1.5 text-xs text-stone-400">
                        {versionName(a.version)}
                      </span>
                    )}
                    {a.language && a.language !== "English" && (
                      <span className="ml-1.5 rounded-full bg-cyan/20 px-1.5 py-0.5 text-[11px] font-medium text-navy">
                        {a.language}
                      </span>
                    )}
                    <span className="block text-xs text-stone-500">
                      {when(a.at)}
                      {a.laptop ? ` · ${a.laptop}` : ""}
                    </span>
                  </span>
                  <span className="w-28 text-right tabular-nums font-semibold text-navy">
                    {a.kind === "stop" ? (
                      <span className="text-xs font-semibold text-red-700">
                        Stopped at {mmss(a.stopped_at ?? 0)}
                        {a.duration && a.stopped_at !== null
                          ? ` (${Math.round(Math.min(1, a.stopped_at / a.duration) * 100)}%)`
                          : ""}
                      </span>
                    ) : a.impact === null ? (
                      <span className="text-xs font-normal text-stone-400">
                        skipped
                      </span>
                    ) : (
                      `${a.impact}/10`
                    )}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {items.length > shown && (
            <button
              type="button"
              onClick={() => setShown((n) => n + 100)}
              className="w-full border-t border-stone-100 px-4 py-2.5 text-sm font-medium text-stone-500 hover:text-stone-800"
            >
              Show more
            </button>
          )}
        </div>
      )}
    </section>
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
        {s.stops > 0 && (
          <span className="text-red-700">
            {" "}
            · Stop pressed {s.stops}
            {s.stops === 1 ? " time" : " times"}, on average at{" "}
            {mmss(s.secs / s.stops)}
            {s.fracN
              ? ` (${Math.round((s.frac / s.fracN) * 100)}% through)`
              : ""}
          </span>
        )}
      </p>
    </div>
  );
}
