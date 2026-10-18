// Minimal iCalendar (.ics) reader for the activism.wtf team feeds.
// Pure functions only, so it can be tested outside the Edge Function.

export type IcsEvent = {
  uid: string;
  summary: string;
  startsAt: string; // ISO, UTC
  endsAt: string | null;
  location: string | null;
  venueName: string | null; // from X-APPLE-STRUCTURED-LOCATION's X-TITLE, when present
  description: string | null;
  url: string | null;
};

// Lines starting with a space or tab continue the previous line.
function unfold(text: string): string[] {
  return text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
}

function unescapeText(v: string): string {
  return v
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

// Offset of a time zone from UTC, in ms, at a given instant.
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
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(instant / 1000) * 1000;
}

function zonedToUtc(y: number, mo: number, d: number, h: number, mi: number, s: number, tz: string): string {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  let instant = guess - tzOffsetMs(guess, tz);
  instant = guess - tzOffsetMs(instant, tz);
  return new Date(instant).toISOString();
}

// DTSTART;TZID=Australia/Sydney:20260822T133000 | ...:20260822T033000Z | ;VALUE=DATE:20260822
export function parseIcsDate(params: string, value: string, fallbackTz: string): string | null {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h = "00", mi = "00", s = "00", z] = m;
  if (z) return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)).toISOString();
  const tz = params.match(/TZID=("?)([^";:]+)\1/)?.[2] ?? fallbackTz;
  return zonedToUtc(+y, +mo, +d, +h, +mi, +s, tz);
}

// X-APPLE-STRUCTURED-LOCATION;VALUE=URI;X-ADDRESS=...;X-TITLE=Town Hall Square:geo:...
function venueFromStructured(params: string | undefined): string | null {
  if (!params) return null;
  const m = params.match(/X-TITLE=(?:"([^"]*)"|([^;]*))/);
  const v = m ? unescapeText(m[1] ?? m[2] ?? "") : "";
  return v || null;
}

export function parseIcs(text: string, fallbackTz = "Australia/Sydney"): IcsEvent[] {
  const events: IcsEvent[] = [];
  let cur: Record<string, { params: string; value: string }> | null = null;

  for (const line of unfold(text)) {
    if (line === "BEGIN:VEVENT") {
      cur = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (cur) {
        const startsAt = cur.DTSTART ? parseIcsDate(cur.DTSTART.params, cur.DTSTART.value, fallbackTz) : null;
        if (cur.UID && startsAt) {
          events.push({
            uid: cur.UID.value.trim(),
            summary: unescapeText(cur.SUMMARY?.value ?? "Untitled event"),
            startsAt,
            endsAt: cur.DTEND ? parseIcsDate(cur.DTEND.params, cur.DTEND.value, fallbackTz) : null,
            location: cur.LOCATION ? unescapeText(cur.LOCATION.value) || null : null,
            venueName: venueFromStructured(cur["X-APPLE-STRUCTURED-LOCATION"]?.params),
            description: cur.DESCRIPTION ? unescapeText(cur.DESCRIPTION.value) || null : null,
            url: cur.URL ? cur.URL.value.trim() || null : null,
          });
        }
      }
      cur = null;
      continue;
    }
    if (!cur) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const head = line.slice(0, colon);
    const semi = head.indexOf(";");
    const name = (semi < 0 ? head : head.slice(0, semi)).toUpperCase();
    const params = semi < 0 ? "" : head.slice(semi + 1);
    if (!(name in cur)) cur[name] = { params, value: line.slice(colon + 1) };
  }
  return events;
}

const MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December";

// "WTF: Sydney, Australia - Social, October 21st, 2026" -> "Social"
export function cleanTitle(summary: string): string {
  const t = summary
    .replace(/^WTF:\s.*?\s-\s+/, "")
    .replace(new RegExp(`,?\\s*(${MONTHS})\\s+\\d{1,2}(st|nd|rd|th)?,?\\s*\\d{4}\\s*$`, "i"), "")
    .trim();
  return t || summary.trim();
}

// Best guess at the event type from its title. null = leave for an organiser to pick.
export function guessType(summary: string): string | null {
  if (/movie challenge|3\s?mmc|minute movie/i.test(summary)) return "Movie Challenge";
  if (/\bsocial\b|lunch|dinner|picnic|potluck|gathering|new years?/i.test(summary)) return "Social";
  if (/workshop|training|introduction to|intro to|strategy/i.test(summary)) return "Workshop/Training";
  if (/outreach|cube|vigil|stall|demo\b|protest|street/i.test(summary)) return "Other Outreach";
  return null;
}

// "483 George St, Sydney 2000 (Town Hall Square)" -> venue "Town Hall Square"
// "Town Hall Square, 483 George St, Sydney 2000"   -> venue "Town Hall Square"
export function splitLocation(location: string | null): { venue: string | null; address: string | null } {
  if (!location) return { venue: null, address: null };
  const paren = location.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (paren) return { venue: paren[2].trim(), address: paren[1].trim() || null };
  const [first, ...rest] = location.split(",").map((s) => s.trim());
  if (rest.length && !/^\d/.test(first)) return { venue: first, address: rest.join(", ") };
  return { venue: null, address: location };
}
