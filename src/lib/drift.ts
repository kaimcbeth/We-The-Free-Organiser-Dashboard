// "Not seen in a while": measured against each person's own rhythm, so an
// occasional attendee keeping their usual pace isn't flagged, but a weekly
// regular who goes quiet is.
//  - 3+ events: overdue when it's been more than 2× their usual gap (the
//    median of their recent gaps), and at least 3 weeks.
//  - 1–2 events: no rhythm yet, so overdue after 4 weeks.

const DAY = 864e5;
const FLOOR_DAYS = 21;
const EARLY_DAYS = 28;

export type Drift = { usualDays: number | null; sinceDays: number };

export function notSeenInAWhile(
  eventDates: string[],
  now: number,
): Drift | null {
  const past = eventDates
    .map((d) => Date.parse(d))
    .filter((t) => t <= now)
    .sort((a, b) => b - a);
  if (past.length === 0) return null;
  const sinceDays = Math.floor((now - past[0]) / DAY);
  if (past.length < 3)
    return sinceDays > EARLY_DAYS ? { usualDays: null, sinceDays } : null;
  const gaps = past
    .slice(0, 6)
    .slice(1)
    .map((t, i) => (past[i] - t) / DAY)
    .sort((a, b) => a - b);
  const usual = gaps[Math.floor(gaps.length / 2)];
  const limit = Math.max(2 * usual, FLOOR_DAYS);
  return sinceDays > limit ? { usualDays: Math.round(usual), sinceDays } : null;
}

const span = (days: number) =>
  days < 10
    ? "week"
    : days < 21
      ? "2 weeks"
      : days < 45
        ? "month"
        : `${Math.round(days / 30)} months`;

// "Usually every 2 weeks · last seen 6 weeks ago"
export function driftText(d: Drift) {
  const ago =
    d.sinceDays < 60
      ? `${Math.round(d.sinceDays / 7)} weeks ago`
      : `${Math.round(d.sinceDays / 30)} months ago`;
  return d.usualDays
    ? `Usually every ${span(d.usualDays)} · last seen ${ago}`
    : `Last seen ${ago}`;
}
