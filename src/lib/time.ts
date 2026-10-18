// Date and time helpers. Events are stored in UTC and shown in the team's
// time zone (Australia/Sydney for now), whatever time zone the phone is in.

export const TEAM_TZ = "Australia/Sydney";

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
  timeZone = TEAM_TZ,
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
export function todayInTz(timeZone = TEAM_TZ): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

// Start and end of a given local day, as UTC ISO strings.
export function dayBoundsUtc(date: string, timeZone = TEAM_TZ) {
  const start = zonedToUtcIso(date, "00:00", timeZone);
  const next = new Date(Date.parse(date + "T12:00:00Z") + 864e5)
    .toISOString()
    .slice(0, 10);
  const end = zonedToUtcIso(next, "00:00", timeZone);
  return { start, end };
}

export function formatEventDate(iso: string, timeZone = TEAM_TZ): string {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

export function formatTime(iso: string, timeZone = TEAM_TZ): string {
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
): string {
  return endIso
    ? `${formatTime(startIso)} – ${formatTime(endIso)}`
    : formatTime(startIso);
}

// Current time as an ISO string (kept out of components so renders stay pure).
export function nowIso(): string {
  return new Date().toISOString();
}
