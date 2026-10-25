// A volunteer's own impact: outreach hours, milestones and how long they've
// kept coming. Used on their page (/me).

export const MILESTONES = [1, 5, 10, 25, 50, 75, 100, 150, 200, 300, 500];

export type ImpactEvent = {
  starts_at: string;
  ends_at: string | null;
  outreach: boolean;
};

export function impact(
  events: ImpactEvent[],
  startingOutreach: number,
  startedOn: string | null,
  now: number,
) {
  const past = events.filter((e) => Date.parse(e.starts_at) <= now);
  const outreachEvents = past.filter((e) => e.outreach);
  const outreach = outreachEvents.length + startingOutreach;
  // Hours at outreach (2 hours when an event has no end time).
  const hours = Math.round(
    outreachEvents.reduce((h, e) => {
      const len = e.ends_at
        ? (Date.parse(e.ends_at) - Date.parse(e.starts_at)) / 36e5
        : 2;
      return h + Math.min(Math.max(len, 0), 12);
    }, 0),
  );
  const next = MILESTONES.find((m) => m > outreach) ?? null;
  const last = [...MILESTONES].reverse().find((m) => m <= outreach) ?? null;

  // Months in a row with at least one event, up to this month (or last).
  const months = new Set(past.map((e) => e.starts_at.slice(0, 7)));
  const d = new Date(now);
  const key = (y: number, m: number) =>
    `${y}-${String(m + 1).padStart(2, "0")}`;
  let y = d.getUTCFullYear();
  let m = d.getUTCMonth();
  if (!months.has(key(y, m))) {
    m -= 1;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
  }
  let streak = 0;
  while (months.has(key(y, m))) {
    streak++;
    m -= 1;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
  }
  const first = past.length
    ? past
        .map((e) => e.starts_at)
        .sort()[0]
        .slice(0, 10)
    : null;
  const since = startedOn ?? first;
  return { outreach, hours, next, last, streak, since, events: past.length };
}
