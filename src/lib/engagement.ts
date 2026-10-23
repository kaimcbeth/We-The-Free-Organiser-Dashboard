import type { SupabaseClient } from "@supabase/supabase-js";

// How engaged someone is, in two parts:
//  - a status label (what to do about them), and
//  - an engagement score 0–10 with a trend (how much, and which way).
// Dates are event start times (ISO). "now" is passed in so server pages can
// compute it once per request.

const DAY = 864e5;
export const WINDOW_DAYS = 90; // "the last 3 months"
export const REGULAR_EVENTS = 5; // a Regular: 5+ events in the last 3 months
const LAPSED_DAYS = 365; // no event in a year: no labels at all

export type Status = "first_timer" | "newcomer" | "regular" | "occasional";

export const STATUS_LABEL: Record<Status, string> = {
  first_timer: "First-timer",
  newcomer: "Newcomer",
  regular: "Regular",
  occasional: "Occasional",
};

const past = (dates: string[], now: number) =>
  dates
    .map((d) => Date.parse(d))
    .filter((t) => t <= now)
    .sort((a, b) => a - b);

// Has there been a run of REGULAR_EVENTS within WINDOW_DAYS?
function everRegular(times: number[]) {
  for (let i = REGULAR_EVENTS - 1; i < times.length; i++)
    if (times[i] - times[i - REGULAR_EVENTS + 1] <= WINDOW_DAYS * DAY)
      return true;
  return false;
}

export const isLapsed = (dates: string[], now: number) => {
  const t = past(dates, now);
  return t.length > 0 && now - t[t.length - 1] > LAPSED_DAYS * DAY;
};

// What we know about the community's record: events where attendance was
// actually taken, and when the Hub started keeping it.
export type Tracking = { tracked: string[]; since: number | null };

// One main status, checked in order (first match wins). null = none (never
// came, came once long ago, or lapsed).
// While a community has under 3 months of check-ins, "5 in 3 months" isn't
// fair yet: Regular is then anyone who came to at least half the tracked
// events (2+), and nobody is called Occasional.
export function engagementStatus(
  dates: string[],
  attendedBefore: boolean,
  now: number,
  tracking?: Tracking,
): Status | null {
  const t = past(dates, now);
  if (t.length === 0) return null;
  if (now - t[t.length - 1] > LAPSED_DAYS * DAY) return null;
  const recent = t.filter((x) => now - x <= WINDOW_DAYS * DAY).length;
  const early = !!tracking?.since && now - tracking.since < WINDOW_DAYS * DAY;
  const newToUs = !attendedBefore && now - t[0] <= WINDOW_DAYS * DAY;
  if (newToUs && t.length === 1) return "first_timer";
  if (newToUs && !everRegular(t)) return "newcomer";
  if (early) {
    // (Mostly people marked "came before the app".)
    const tracked = past(tracking!.tracked, now).filter((x) => x >= t[0]);
    if (t.length >= 2 && tracked.length > 0 && t.length / tracked.length >= 0.5)
      return "regular";
    return null;
  }
  if (recent >= REGULAR_EVENTS) return "regular";
  if (t.length >= 2) return "occasional";
  return null;
}

export const isNewcomerStatus = (s: Status | null) =>
  s === "first_timer" || s === "newcomer";

// Events in the last 3 months (how far along a newcomer is).
export const recentEvents = (dates: string[], now: number) =>
  past(dates, now).filter((x) => now - x <= WINDOW_DAYS * DAY).length;

// Engagement 0–10 as of a moment: the share of their community's events in
// the 3 months before it (only since their first event, and only events
// where attendance was taken) that they came to, with the last 30 days ×3,
// 31–60 ×2, 61–90 ×1. null = nothing to go on.
export function engagementScore(
  dates: string[],
  communityEvents: string[],
  asOf: number,
): number | null {
  const mine = past(dates, asOf);
  if (mine.length === 0) return null;
  const first = mine[0];
  const went = new Set(mine);
  let all = 0;
  let got = 0;
  for (const t of past(communityEvents, asOf)) {
    const age = (asOf - t) / DAY;
    if (age > WINDOW_DAYS || t < first) continue;
    const w = age <= 30 ? 3 : age <= 60 ? 2 : 1;
    all += w;
    if (went.has(t)) got += w;
  }
  if (all === 0) return null;
  return Math.round((10 * got) / all);
}

export type Engagement = {
  score: number;
  trend: "up" | "down" | null;
  was: number | null;
};

export function engagement(
  dates: string[],
  communityEvents: string[],
  now: number,
): Engagement | null {
  const score = engagementScore(dates, communityEvents, now);
  if (score === null) return null;
  const was = engagementScore(dates, communityEvents, now - 60 * DAY);
  const trend =
    was === null
      ? null
      : score - was >= 2
        ? "up"
        : was - score >= 2
          ? "down"
          : null;
  return { score, trend, was };
}

// 0 = red … 10 = bright green, a step of colour for every point.
export const engagementColour = (score: number) =>
  `hsl(${Math.round(score * 13)} 85% ${score >= 8 ? 42 : 48}%)`;

// Loads a community's tracking record (events with check-ins, last ~5 months,
// and when check-ins began).
export async function loadTracking(
  supabase: SupabaseClient,
  teamId: string,
  now: number,
): Promise<Tracking> {
  const [{ data: recent }, { data: first }] = await Promise.all([
    supabase
      .from("events")
      .select("starts_at, attendance!inner(event_id)")
      .eq("team_id", teamId)
      .gte("starts_at", new Date(now - 155 * DAY).toISOString()),
    supabase
      .from("events")
      .select("starts_at, attendance!inner(event_id)")
      .eq("team_id", teamId)
      .order("starts_at")
      .limit(1),
  ]);
  const tracked = [
    ...new Set(
      ((recent ?? []) as { starts_at: string }[]).map((e) => e.starts_at),
    ),
  ];
  const since = (first as { starts_at: string }[] | null)?.[0]?.starts_at;
  return { tracked, since: since ? Date.parse(since) : null };
}
