// Date and time helpers. Events are stored in UTC and shown in the team's
// own time zone (Perth, Brisbane, Auckland…), whatever time zone the phone is in.
//
// On the server, the page sets the team's time zone once per request
// (setRequestTz, done in getStaff) and every helper below uses it by default.
// Browser components pass the team's time zone in explicitly.

import { cache } from "react";

export const DEFAULT_TZ = "Australia/Sydney";

// One small box per request (React's cache is scoped to a single server request).
const requestTz = cache(() => ({ tz: DEFAULT_TZ }));

export function setRequestTz(tz: string | null | undefined) {
  if (tz) requestTz().tz = tz;
}

// The time zone of the team being looked at on this request.
export function currentTz(): string {
  try {
    return requestTz().tz;
  } catch {
    return DEFAULT_TZ;
  }
}

/** @deprecated use currentTz() */
export const TEAM_TZ = DEFAULT_TZ;

// Offset of a time zone from UTC, in milliseconds, at a given instant.
function tzOffsetMs(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return asUtc - Math.floor(instant / 1000) * 1000;
}

// "2026-10-17" + "13:30" in Sydney -> ISO string in UTC.
export function zonedToUtcIso(
  date: string,
  time: string,
  timeZone = currentTz(),
): string {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let instant = guess - tzOffsetMs(guess, timeZone);
  // Second pass handles the hour around daylight-saving changes.
  instant = guess - tzOffsetMs(instant, timeZone);
  return new Date(instant).toISOString();
}

// Today's date in the team's time zone, as "YYYY-MM-DD".
export function todayInTz(timeZone = currentTz()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

// Start and end of a given local day, as UTC ISO strings.
export function dayBoundsUtc(date: string, timeZone = currentTz()) {
  const start = zonedToUtcIso(date, "00:00", timeZone);
  const next = new Date(Date.parse(date + "T12:00:00Z") + 864e5)
    .toISOString()
    .slice(0, 10);
  const end = zonedToUtcIso(next, "00:00", timeZone);
  return { start, end };
}

export function formatEventDate(iso: string, timeZone = currentTz()): string {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

export function formatTime(iso: string, timeZone = currentTz()): string {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  })
    .format(new Date(iso))
    .replace(" ", "")
    .toLowerCase();
}

export function formatTimeRange(
  startIso: string,
  endIso: string | null,
  timeZone = currentTz(),
): string {
  return endIso
    ? `${formatTime(startIso, timeZone)} – ${formatTime(endIso, timeZone)}`
    : formatTime(startIso, timeZone);
}

// Current time as an ISO string (kept out of components so renders stay pure).
export function nowIso(): string {
  return new Date().toISOString();
}

// An instant's date in the team's time zone, as "YYYY-MM-DD".
export function dateInTz(iso: string, timeZone = currentTz()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(iso));
}

// "Tomorrow", "In 3 days", "Next Wednesday"-style countdown to an event.
export function daysUntilLabel(iso: string, timeZone = currentTz()): string {
  const days = Math.round(
    (Date.parse(dateInTz(iso, timeZone) + "T12:00:00Z") -
      Date.parse(todayInTz(timeZone) + "T12:00:00Z")) /
      864e5,
  );
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}
