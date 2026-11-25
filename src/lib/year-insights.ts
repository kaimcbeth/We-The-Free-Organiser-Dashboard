// The year so far on Insights (Kai, 25 Nov 2026: "a better overview of
// insight from the total year (or year so far)"). Pure, like insights.ts.

import { currentTz } from "@/lib/time";
import { eventKind, KIND_LABEL } from "@/lib/insight-charts";
import type {
  InsightCheckIn,
  InsightEvent,
  InsightPerson,
} from "@/lib/insights";

export type YearMonth = {
  key: string; // "2026-03"
  label: string; // "Mar"
  outreach: number;
  community: number;
  checkIns: number;
  future: boolean;
};

export type YearInsights = {
  year: number;
  events: number;
  outreachEvents: number;
  checkIns: number;
  people: number;
  firstTimers: number;
  months: YearMonth[];
  kinds: { kind: string; events: number }[];
  busiest: YearMonth | null; // most events
  biggest: { id: string; title: string; date: string; people: number } | null;
  checkInsFrom: string | null; // first check-in this year (ISO), if not January
};

const ymd = (iso: string, tz: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));

export function computeYear(
  people: InsightPerson[],
  checkIns: InsightCheckIn[],
  events: InsightEvent[],
  now = Date.now(),
): YearInsights {
  const tz = currentTz();
  const nowDay = ymd(new Date(now).toISOString(), tz);
  const year = Number(nowDay.slice(0, 4));
  const thisMonth = nowDay.slice(0, 7);
  const inYear = (iso: string) =>
    Date.parse(iso) <= now && ymd(iso, tz).startsWith(`${year}-`);

  const months: YearMonth[] = Array.from({ length: 12 }, (_, i) => {
    const key = `${year}-${String(i + 1).padStart(2, "0")}`;
    return {
      key,
      label: new Intl.DateTimeFormat("en-AU", {
        month: "short",
        timeZone: "UTC",
      }).format(new Date(`${key}-15T00:00:00Z`)),
      outreach: 0,
      community: 0,
      checkIns: 0,
      future: key > thisMonth,
    };
  });
  const byKey = new Map(months.map((m) => [m.key, m]));

  const yearEvents = events.filter((e) => inYear(e.starts_at));
  const kinds = new Map<string, number>();
  for (const e of yearEvents) {
    const m = byKey.get(ymd(e.starts_at, tz).slice(0, 7));
    if (m) {
      if (e.outreach) m.outreach++;
      else m.community++;
    }
    const k = KIND_LABEL[eventKind(e.typeName ?? null, e.title ?? null)];
    kinds.set(k, (kinds.get(k) ?? 0) + 1);
  }

  // First-timers: whose first ever check-in (anywhere in this list) was this
  // year; people who came before the app never count.
  const before = new Set(
    people.filter((p) => p.attended_before_app).map((p) => p.id),
  );
  const first = new Map<string, string>();
  for (const c of checkIns)
    if (Date.parse(c.starts_at) <= now) {
      const was = first.get(c.person_id);
      if (!was || c.starts_at < was) first.set(c.person_id, c.starts_at);
    }

  const yearCheckIns = checkIns.filter((c) => inYear(c.starts_at));
  const perEvent = new Map<string, number>();
  for (const c of yearCheckIns) {
    const m = byKey.get(ymd(c.starts_at, tz).slice(0, 7));
    if (m) m.checkIns++;
    perEvent.set(c.event_id, (perEvent.get(c.event_id) ?? 0) + 1);
  }
  const firstTimers = [...first].filter(
    ([id, at]) => !before.has(id) && inYear(at),
  ).length;

  let biggest: YearInsights["biggest"] = null;
  for (const [id, n] of perEvent) {
    if (biggest && n <= biggest.people) continue;
    const e = yearEvents.find((x) => x.id === id);
    if (!e) continue;
    biggest = {
      id,
      title: e.title ?? "Event",
      date: new Intl.DateTimeFormat("en-AU", {
        day: "numeric",
        month: "short",
        timeZone: tz,
      }).format(new Date(e.starts_at)),
      people: n,
    };
  }

  const busiest = months
    .filter((m) => m.outreach + m.community > 0)
    .reduce<YearMonth | null>(
      (best, m) =>
        !best || m.outreach + m.community > best.outreach + best.community
          ? m
          : best,
      null,
    );

  const firstCheckIn = yearCheckIns.map((c) => c.starts_at).sort()[0] ?? null;

  return {
    year,
    events: yearEvents.length,
    outreachEvents: yearEvents.filter((e) => e.outreach).length,
    checkIns: yearCheckIns.length,
    people: new Set(yearCheckIns.map((c) => c.person_id)).size,
    firstTimers,
    months,
    kinds: [...kinds]
      .map(([kind, n]) => ({ kind, events: n }))
      .sort((a, b) => b.events - a.events),
    busiest,
    biggest,
    checkInsFrom:
      firstCheckIn && ymd(firstCheckIn, tz).slice(5, 7) !== "01"
        ? firstCheckIn
        : null,
  };
}
