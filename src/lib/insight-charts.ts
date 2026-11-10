// Numbers behind the Insights charts (Kai, 7 Nov 2026: Insights looked too
// much like People; he wanted graphs first and the per-person table lower
// down). Pure functions, like insights.ts.

import { currentTz } from "@/lib/time";
import type {
  EveryoneRow,
  InsightCheckIn,
  InsightEvent,
  InsightPerson,
} from "@/lib/insights";

const DAY = 864e5;

export type Bucket = {
  key: string;
  label: string; // "3 Nov" or "Nov"
  long: string; // "Week of 3 Nov 2026" or "November 2026"
  returning: number;
  firstTimers: number;
  events: number;
};

export type KindRow = { kind: string; events: number; average: number };
export type TopEvent = {
  id: string;
  title: string;
  date: string;
  people: number;
};
export type Segment = { key: string; label: string; hint: string; n: number };

export type InsightCharts = {
  weeks: Bucket[];
  months: Bucket[];
  segments: Segment[];
  comeBack: { back: number; of: number }; // first-timers who came again
  kinds: KindRow[];
  topEvents: TopEvent[];
  firstData: string | null; // first check-in ever (ISO)
};

const KIND_LABEL: Record<string, string> = {
  movie_challenge: "Movie Challenge",
  demonstration: "Demonstration",
  potluck: "Potluck or meal",
  sanctuary: "Sanctuary visit",
  hike: "Hike",
  coworking: "Co-working",
  workshop: "Workshop",
  outreach: "Other outreach",
  social: "Social",
  other: "Other",
};

// Same rules as the database's event_kind(type, title) (0172).
export function eventKind(type: string | null, title: string | null): string {
  const t = title ?? "";
  if (type === "Movie Challenge" || /movie challenge|3mmc/i.test(t))
    return "movie_challenge";
  if (/demonstra|demonstartion|protest|\bmarch\b|rally/i.test(t))
    return "demonstration";
  if (/potluck|pot luck|dinner|dîner|meal|picnic|brunch|lunch|bbq/i.test(t))
    return "potluck";
  if (/sanctuary|santuario|lebenshof|farm visit/i.test(t)) return "sanctuary";
  if (/\bhik(e|ing)\b|bushwalk/i.test(t)) return "hike";
  if (type === "Co-working" || /co-?working/i.test(t)) return "coworking";
  if (type === "Workshop/Training" || /workshop|training|masterclass/i.test(t))
    return "workshop";
  if (type === "Other Outreach" || /\bstall\b|kiosque|vigil|outreach/i.test(t))
    return "outreach";
  if (
    type === "Community Event" ||
    /social|party|hangout|gathering|quiz/i.test(t)
  )
    return "social";
  return "other";
}

// The event's date in the community's timezone, as YYYY-MM-DD.
const localDay = (iso: string, tz: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));

const mondayOf = (day: string) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
};

const fmt = (day: string, o: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-AU", { ...o, timeZone: "UTC" }).format(
    new Date(`${day}T00:00:00Z`),
  );

export function computeCharts(
  people: InsightPerson[],
  checkIns: InsightCheckIn[],
  events: InsightEvent[],
  everyone: EveryoneRow[],
  now = Date.now(),
): InsightCharts {
  const tz = currentTz();
  const past = checkIns
    .filter((c) => Date.parse(c.starts_at) <= now)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  // Each person's first ever event (people who came before the app never
  // count as first-timers).
  const before = new Set(
    people.filter((p) => p.attended_before_app).map((p) => p.id),
  );
  const firstEver = new Map<string, InsightCheckIn>();
  const visits = new Map<string, number>();
  for (const c of past) {
    visits.set(c.person_id, (visits.get(c.person_id) ?? 0) + 1);
    if (!firstEver.has(c.person_id)) firstEver.set(c.person_id, c);
  }
  for (const id of before) firstEver.delete(id);

  // Week and month buckets, oldest first.
  const today = localDay(new Date(now).toISOString(), tz);
  const thisMonday = mondayOf(today);
  const weekKeys: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(`${thisMonday}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 7 * i);
    weekKeys.push(d.toISOString().slice(0, 10));
  }
  const monthKeys: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(`${today.slice(0, 7)}-15T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() - i);
    monthKeys.push(d.toISOString().slice(0, 7));
  }
  const fill = (
    keys: string[],
    keyOf: (day: string) => string,
    label: (k: string) => string,
    long: (k: string) => string,
  ): Bucket[] => {
    const people = new Map(keys.map((k) => [k, new Set<string>()]));
    const fresh = new Map(keys.map((k) => [k, 0]));
    const evts = new Map(keys.map((k) => [k, new Set<string>()]));
    for (const c of past) {
      const k = keyOf(localDay(c.starts_at, tz));
      if (!people.has(k)) continue;
      people.get(k)!.add(c.person_id);
      evts.get(k)!.add(c.event_id);
      if (firstEver.get(c.person_id)?.event_id === c.event_id)
        fresh.set(k, fresh.get(k)! + 1);
    }
    return keys.map((k) => ({
      key: k,
      label: label(k),
      long: long(k),
      firstTimers: fresh.get(k)!,
      returning: people.get(k)!.size - fresh.get(k)!,
      events: evts.get(k)!.size,
    }));
  };
  const weeks = fill(
    weekKeys,
    mondayOf,
    (k) => fmt(k, { day: "numeric", month: "short" }),
    (k) =>
      `Week of ${fmt(k, { day: "numeric", month: "long", year: "numeric" })}`,
  );
  const months = fill(
    monthKeys,
    (day) => day.slice(0, 7),
    (k) => fmt(`${k}-15`, { month: "short" }),
    (k) => fmt(`${k}-15`, { month: "long", year: "numeric" }),
  );

  // Where everyone is now, most engaged first.
  const seg = (key: string, label: string, hint: string, n: number) => ({
    key,
    label,
    hint,
    n,
  });
  const count = (f: (r: EveryoneRow) => boolean) => everyone.filter(f).length;
  const segments: Segment[] = [
    seg(
      "regular",
      "Regulars",
      "3+ events in 3 months",
      count((r) => r.m3 >= 3),
    ),
    seg(
      "active",
      "Coming sometimes",
      "1 or 2 events in 3 months",
      count((r) => r.m3 > 0 && r.m3 < 3),
    ),
    seg(
      "quiet",
      "Gone quiet",
      "came before, nothing in 3 months",
      count((r) => r.m3 === 0 && r.total >= 2),
    ),
    seg(
      "once",
      "Came once",
      "one event, over 3 months ago",
      count((r) => r.m3 === 0 && r.total === 1),
    ),
    seg(
      "never",
      "Not checked in yet",
      "in People, no check-ins",
      count((r) => r.total === 0),
    ),
  ];

  // First-timers from the last year who've had 3 weeks to come back.
  const yearAgo = now - 365 * DAY;
  let back = 0;
  let of = 0;
  for (const [id, c] of firstEver) {
    const t = Date.parse(c.starts_at);
    if (t < yearAgo || t > now - 21 * DAY) continue;
    of++;
    if ((visits.get(id) ?? 0) >= 2) back++;
  }

  // Events with check-ins in the last year: by kind, and the biggest.
  const perEvent = new Map<string, number>();
  for (const c of past)
    if (Date.parse(c.starts_at) >= yearAgo)
      perEvent.set(c.event_id, (perEvent.get(c.event_id) ?? 0) + 1);
  const byKind = new Map<string, { events: number; people: number }>();
  const top: TopEvent[] = [];
  for (const e of events) {
    const n = perEvent.get(e.id);
    if (!n) continue;
    const kind = KIND_LABEL[eventKind(e.typeName ?? null, e.title ?? null)];
    const row = byKind.get(kind) ?? { events: 0, people: 0 };
    row.events++;
    row.people += n;
    byKind.set(kind, row);
    top.push({
      id: e.id,
      title: e.title ?? "Event",
      date: fmt(localDay(e.starts_at, tz), {
        day: "numeric",
        month: "short",
      }),
      people: n,
    });
  }
  const kinds = [...byKind]
    .map(([kind, r]) => ({
      kind,
      events: r.events,
      average: Math.round((r.people / r.events) * 10) / 10,
    }))
    .sort((a, b) => b.average - a.average || b.events - a.events);
  top.sort((a, b) => b.people - a.people);

  return {
    weeks,
    months,
    segments,
    comeBack: { back, of },
    kinds,
    topEvents: top.slice(0, 5),
    firstData: past[0]?.starts_at ?? null,
  };
}
