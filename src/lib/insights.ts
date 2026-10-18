// Insights worked out from check-ins. Pure functions (no database calls),
// so they're easy to test.

import { TEAM_TZ } from "@/lib/time";

export type InsightPerson = {
  id: string;
  first_name: string;
  last_name: string | null;
  starting_outreach_count: number;
  attended_before_app?: boolean; // came to events before the app: never a first-timer
};

export type InsightCheckIn = {
  person_id: string;
  event_id: string;
  starts_at: string; // event start
  outreach: boolean; // event type counts as outreach
};

export type InsightEvent = { id: string; starts_at: string; outreach: boolean };

const DAY = 864e5;

// Starting definitions agreed in the plan.
export const RULES = {
  regularMinEvents: 3,
  regularWindowDays: 90,
  oneTimerMinAgeDays: 30,
  driftedQuietDays: 60,
  milestoneEvery: 10,
};

export const fullName = (p: { first_name: string; last_name: string | null }) =>
  [p.first_name, p.last_name].filter(Boolean).join(" ");

export function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${s}`;
}

export function isMilestone(outreachCount: number) {
  return outreachCount > 0 && outreachCount % RULES.milestoneEvery === 0;
}

// Outreach events per person (including any starting count for long-time volunteers).
export function outreachCounts(people: InsightPerson[], checkIns: InsightCheckIn[], excludeEventId?: string) {
  const counts = new Map(people.map((p) => [p.id, p.starting_outreach_count ?? 0]));
  for (const c of checkIns) {
    if (!c.outreach || c.event_id === excludeEventId) continue;
    counts.set(c.person_id, (counts.get(c.person_id) ?? 0) + 1);
  }
  return counts;
}

const monthKey = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TEAM_TZ, year: "numeric", month: "2-digit" }).format(new Date(iso)).slice(0, 7);

const monthLabel = (key: string) =>
  new Intl.DateTimeFormat("en-AU", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${key}-15T00:00:00Z`));

export type PersonInsight = {
  id: string;
  name: string;
  events: number;
  outreach: number;
  lastSeen: string | null;
  firstSeen: string | null;
  detail: string; // short reason shown in the list
};

// One row per person for the "Everyone" table.
export type EveryoneRow = {
  id: string;
  name: string;
  lastSeen: string | null;
  lastAgo: string;
  m3: number;
  m6: number;
  m12: number;
  total: number;
  outreach: number;
};

export type MonthRow = {
  key: string;
  label: string;
  events: number;
  checkIns: number;
  people: number;
  firstTimers: number;
  outreachCheckIns: number;
};

export function computeInsights(
  people: InsightPerson[],
  checkIns: InsightCheckIn[],
  events: InsightEvent[],
  now = Date.now(),
) {
  // Only count events that have happened.
  const past = checkIns.filter((c) => Date.parse(c.starts_at) <= now);
  const byPerson = new Map<string, InsightCheckIn[]>();
  for (const c of past) {
    const list = byPerson.get(c.person_id) ?? [];
    list.push(c);
    byPerson.set(c.person_id, list);
  }
  for (const list of byPerson.values()) list.sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  const outreach = outreachCounts(people, past);

  const base = (p: InsightPerson): Omit<PersonInsight, "detail"> => {
    const list = byPerson.get(p.id) ?? [];
    return {
      id: p.id,
      name: fullName(p),
      events: list.length,
      outreach: outreach.get(p.id) ?? 0,
      lastSeen: list.at(-1)?.starts_at ?? null,
      firstSeen: list[0]?.starts_at ?? null,
    };
  };
  const daysAgo = (iso: string) => Math.floor((now - Date.parse(iso)) / DAY);
  const ago = (iso: string) => {
    const d = daysAgo(iso);
    if (d < 1) return "today";
    if (d < 14) return `${d} day${d === 1 ? "" : "s"} ago`;
    if (d < 60) return `${Math.round(d / 7)} weeks ago`;
    return `${Math.round(d / 30)} months ago`;
  };
  const inWindow = (list: InsightCheckIn[], fromDaysAgo: number, toDaysAgo: number) =>
    list.filter((c) => {
      const d = daysAgo(c.starts_at);
      return d < fromDaysAgo && d >= toDaysAgo;
    }).length;

  const everyone: EveryoneRow[] = people.map((p) => {
    const b = base(p);
    const list = byPerson.get(p.id) ?? [];
    return {
      id: p.id,
      name: b.name,
      lastSeen: b.lastSeen,
      lastAgo: b.lastSeen ? ago(b.lastSeen) : "Never",
      m3: inWindow(list, 91, 0),
      m6: inWindow(list, 183, 0),
      m12: inWindow(list, 366, 0),
      total: list.length,
      outreach: b.outreach,
    };
  });
  // Most recently seen first; never-seen at the bottom.
  everyone.sort((a, b) => (b.lastSeen ?? "").localeCompare(a.lastSeen ?? "") || a.name.localeCompare(b.name));

  const regulars: PersonInsight[] = [];
  const oneTimers: PersonInsight[] = [];
  const drifted: PersonInsight[] = [];
  const milestoneSoon: PersonInsight[] = [];
  const milestoneRecent: PersonInsight[] = [];

  for (const p of people) {
    const b = base(p);
    const list = byPerson.get(p.id) ?? [];

    const recent = inWindow(list, RULES.regularWindowDays, 0);
    const quiet = inWindow(list, RULES.driftedQuietDays, 0) === 0;
    // Someone who hasn't come in 2 months isn't a regular, even with earlier events.
    if (recent >= RULES.regularMinEvents && !quiet) {
      regulars.push({ ...b, detail: `${recent} events in the last 3 months` });
    }

    if (!p.attended_before_app && list.length === 1 && b.lastSeen && daysAgo(b.lastSeen) > RULES.oneTimerMinAgeDays) {
      oneTimers.push({ ...b, detail: `Came once, ${ago(b.lastSeen)}` });
    }

    // Was a regular in the 3 months before going quiet, and nothing since.
    const before = inWindow(list, RULES.driftedQuietDays + RULES.regularWindowDays, RULES.driftedQuietDays);
    if (quiet && before >= RULES.regularMinEvents && b.lastSeen) {
      drifted.push({ ...b, detail: `Last came ${ago(b.lastSeen)}, after ${before} events` });
    }

    const next = b.outreach + 1;
    if (isMilestone(next)) {
      milestoneSoon.push({ ...b, detail: `On ${b.outreach}: next outreach is their ${ordinal(next)}` });
    }

    // Milestones reached in the last 30 days.
    const outreachList = list.filter((c) => c.outreach);
    const start = p.starting_outreach_count ?? 0;
    outreachList.forEach((c, i) => {
      const n = start + i + 1;
      if (isMilestone(n) && daysAgo(c.starts_at) <= 30) {
        milestoneRecent.push({ ...b, detail: `${ordinal(n)} outreach event, ${ago(c.starts_at)}` });
      }
    });
  }

  const byLastSeen = (a: PersonInsight, b: PersonInsight) => (b.lastSeen ?? "").localeCompare(a.lastSeen ?? "");
  regulars.sort((a, b) => b.events - a.events || a.name.localeCompare(b.name));
  oneTimers.sort(byLastSeen);
  drifted.sort(byLastSeen);
  milestoneSoon.sort((a, b) => b.outreach - a.outreach);

  // Monthly totals, last 6 months, newest first.
  const firstEver = new Map<string, string>();
  const beenBefore = new Set(people.filter((p) => p.attended_before_app).map((p) => p.id));
  for (const [id, list] of byPerson) if (list[0] && !beenBefore.has(id)) firstEver.set(id, list[0].event_id);

  const months = new Map<string, MonthRow>();
  const nowKey = monthKey(new Date(now).toISOString());
  const keys: string[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(`${nowKey}-15T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() - i);
    keys.push(d.toISOString().slice(0, 7));
  }
  for (const k of keys) {
    months.set(k, { key: k, label: monthLabel(k), events: 0, checkIns: 0, people: 0, firstTimers: 0, outreachCheckIns: 0 });
  }
  const peopleByMonth = new Map<string, Set<string>>();
  for (const e of events) {
    if (Date.parse(e.starts_at) > now) continue;
    const row = months.get(monthKey(e.starts_at));
    if (row) row.events++;
  }
  for (const c of past) {
    const k = monthKey(c.starts_at);
    const row = months.get(k);
    if (!row) continue;
    row.checkIns++;
    if (c.outreach) row.outreachCheckIns++;
    if (firstEver.get(c.person_id) === c.event_id) row.firstTimers++;
    const set = peopleByMonth.get(k) ?? new Set();
    set.add(c.person_id);
    peopleByMonth.set(k, set);
  }
  for (const [k, set] of peopleByMonth) {
    const row = months.get(k);
    if (row) row.people = set.size;
  }

  return {
    everyone,
    regulars,
    oneTimers,
    drifted,
    milestoneSoon,
    milestoneRecent,
    months: keys.map((k) => months.get(k)!),
    totals: {
      people: people.length,
      everAttended: byPerson.size,
    },
  };
}

export type Insights = ReturnType<typeof computeInsights>;
