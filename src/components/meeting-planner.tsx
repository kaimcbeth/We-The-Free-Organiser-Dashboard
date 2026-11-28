"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { grain, loadPosterFonts } from "@/components/graphic-poster";
import {
  DISPLAY,
  H,
  NAVY,
  PINK,
  W,
  YELLOW,
  bodyFont,
  loadImage,
  logo,
  wrap,
} from "@/components/recap-maker";

// Meeting planner for Community Managers (Kai, 26 Nov 2026: "a resource on
// the community manager view for scheduling and promoting meetings"). Pick a
// time in one place, see it everywhere, then copy a message, add it to a
// calendar or make a graphic. Kept on this device only (localStorage).

type Place = { label: string; tz: string; flag: string };

// Places to pick from. Labels say the city where a country has several zones.
export const ZONES: Place[] = [
  { label: "Sydney", tz: "Australia/Sydney", flag: "🇦🇺" },
  { label: "Melbourne", tz: "Australia/Melbourne", flag: "🇦🇺" },
  { label: "Brisbane", tz: "Australia/Brisbane", flag: "🇦🇺" },
  { label: "Adelaide", tz: "Australia/Adelaide", flag: "🇦🇺" },
  { label: "Perth", tz: "Australia/Perth", flag: "🇦🇺" },
  { label: "New Zealand", tz: "Pacific/Auckland", flag: "🇳🇿" },
  { label: "Japan", tz: "Asia/Tokyo", flag: "🇯🇵" },
  { label: "Bali", tz: "Asia/Makassar", flag: "🇮🇩" },
  { label: "Jakarta", tz: "Asia/Jakarta", flag: "🇮🇩" },
  { label: "Singapore", tz: "Asia/Singapore", flag: "🇸🇬" },
  { label: "Hong Kong", tz: "Asia/Hong_Kong", flag: "🇭🇰" },
  { label: "Philippines", tz: "Asia/Manila", flag: "🇵🇭" },
  { label: "Thailand", tz: "Asia/Bangkok", flag: "🇹🇭" },
  { label: "Nepal", tz: "Asia/Kathmandu", flag: "🇳🇵" },
  { label: "India", tz: "Asia/Kolkata", flag: "🇮🇳" },
  { label: "Dubai", tz: "Asia/Dubai", flag: "🇦🇪" },
  { label: "Israel", tz: "Asia/Jerusalem", flag: "🇮🇱" },
  { label: "South Africa", tz: "Africa/Johannesburg", flag: "🇿🇦" },
  { label: "Kenya", tz: "Africa/Nairobi", flag: "🇰🇪" },
  { label: "Nigeria", tz: "Africa/Lagos", flag: "🇳🇬" },
  { label: "Europe (Berlin, Paris)", tz: "Europe/Berlin", flag: "🇪🇺" },
  { label: "Finland", tz: "Europe/Helsinki", flag: "🇫🇮" },
  { label: "Portugal", tz: "Europe/Lisbon", flag: "🇵🇹" },
  { label: "UK", tz: "Europe/London", flag: "🇬🇧" },
  { label: "Ireland", tz: "Europe/Dublin", flag: "🇮🇪" },
  { label: "Brazil (São Paulo)", tz: "America/Sao_Paulo", flag: "🇧🇷" },
  { label: "Argentina", tz: "America/Argentina/Buenos_Aires", flag: "🇦🇷" },
  { label: "Montreal", tz: "America/Toronto", flag: "🇨🇦" },
  { label: "Toronto", tz: "America/Toronto", flag: "🇨🇦" },
  { label: "Vancouver", tz: "America/Vancouver", flag: "🇨🇦" },
  { label: "Calgary", tz: "America/Edmonton", flag: "🇨🇦" },
  { label: "New York", tz: "America/New_York", flag: "🇺🇸" },
  { label: "Tennessee (Nashville)", tz: "America/Chicago", flag: "🇺🇸" },
  { label: "Tennessee (Knoxville)", tz: "America/New_York", flag: "🇺🇸" },
  { label: "Chicago", tz: "America/Chicago", flag: "🇺🇸" },
  { label: "Denver", tz: "America/Denver", flag: "🇺🇸" },
  { label: "Los Angeles", tz: "America/Los_Angeles", flag: "🇺🇸" },
  { label: "Mexico City", tz: "America/Mexico_City", flag: "🇲🇽" },
];

const byLabel = (l: string) => ZONES.find((z) => z.label === l)!;
// Kai's list for the Global Support Team meeting (26 Nov 2026; Calgary 28 Nov;
// Tennessee = Eastern, Arabella is on New York time).
const USUAL = [
  "UK",
  "Europe (Berlin, Paris)",
  "Nepal",
  "Bali",
  "Sydney",
  "Montreal",
  "Tennessee (Knoxville)",
  "Calgary",
].map(byLabel);

type Saved = {
  title: string;
  date: string; // YYYY-MM-DD in the host's time zone
  time: string; // HH:MM
  hostTz: string;
  minutes: number;
  link: string;
  places: Place[];
  placesV?: number; // bump PLACES_V to move saved planners onto USUAL
};

// Bumped when the usual places change (28 Nov 2026: Calgary, Eastern
// Tennessee), so a planner saved on a device picks the new list up once.
const PLACES_V = 2;
const DEFAULT: Saved = {
  title: "Global Support Team meeting",
  date: "2026-12-16",
  time: "00:00",
  hostTz: "Australia/Sydney",
  minutes: 60,
  link: "",
  places: USUAL,
  placesV: PLACES_V,
};
const KEY = "wtf-meeting-planner";

// Wall-clock time in a time zone → the real instant.
function offsetMs(instant: number, tz: string) {
  const p = new Intl.DateTimeFormat("en-AU", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const g = (t: string) => Number(p.find((x) => x.type === t)?.value);
  return (
    Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute")) -
    Math.floor(instant / 60000) * 60000
  );
}
export function zonedToUtc(date: string, time: string, tz: string): number {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  let t = guess - offsetMs(guess, tz);
  t = guess - offsetMs(t, tz);
  return t;
}

export type Row = Place & {
  day: string; // "Tue 15 Dec"
  clock: string; // "1:00 pm"
  hour: number;
  dayKey: string; // YYYY-MM-DD there
  zone: string; // "Central Standard Time" (for that date)
  abbr: string; // "CST"
  offset: string; // "UTC−6"
};

// Official names where the browser's long name or initials aren't the usual
// ones (Kai, 28 Nov 2026: the graphic shows time zones, not place names).
const ZONE_FIX: Record<string, [string, string]> = {
  "Central European Standard Time": ["Central European Time", "CET"],
  "Central European Summer Time": ["Central European Summer Time", "CEST"],
  "Eastern European Standard Time": ["Eastern European Time", "EET"],
  "Eastern European Summer Time": ["Eastern European Summer Time", "EEST"],
  "Western European Standard Time": ["Western European Time", "WET"],
  "Western European Summer Time": ["Western European Summer Time", "WEST"],
  "Nepal Time": ["Nepal Time", "NPT"],
  "Central Indonesia Time": ["Central Indonesia Time", "WITA"],
  "Western Indonesia Time": ["Western Indonesia Time", "WIB"],
  "Eastern Indonesia Time": ["Eastern Indonesia Time", "WIT"],
  "Brasilia Standard Time": ["Brasília Time", "BRT"],
  "Argentina Standard Time": ["Argentina Time", "ART"],
  "Singapore Standard Time": ["Singapore Time", "SGT"],
  "Hong Kong Standard Time": ["Hong Kong Time", "HKT"],
  "Philippine Standard Time": ["Philippine Time", "PHT"],
  "Greenwich Mean Time": ["Greenwich Mean Time", "GMT"],
};

// The time zone in force at that moment: name, abbreviation, UTC offset.
export function zoneInfo(tz: string, at: number) {
  const part = (timeZoneName: "long" | "short" | "shortOffset") =>
    new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName })
      .formatToParts(new Date(at))
      .find((p) => p.type === "timeZoneName")?.value ?? "";
  const long = part("long");
  const short = part("short");
  const off = part("shortOffset").replace("GMT", "") || "+0";
  const offset = `UTC${off.replace("-", "−")}`;
  // Alberta stays on UTC−6 all year since 1 Nov 2026 and calls it Alberta
  // Time (ABT); browsers still call it Mountain Daylight Time.
  if (tz === "America/Edmonton" && off === "-6")
    return { zone: "Alberta Time", abbr: "ABT", offset };
  const fix = ZONE_FIX[long];
  if (fix) return { zone: fix[0], abbr: fix[1], offset };
  const abbr = /^[A-Z]{2,5}$/.test(short)
    ? short
    : long
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .toUpperCase();
  return { zone: long || tz, abbr, offset };
}

// The date most people are on: label "Tuesday 15 December" + its day key.
export function mainDate(rows: Row[], at: number) {
  if (!rows.length) return { label: "", key: "" };
  const count = new Map<string, number>();
  for (const r of rows) count.set(r.dayKey, (count.get(r.dayKey) ?? 0) + 1);
  const best = [...count.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  )[0][0];
  const r = rows.find((x) => x.dayKey === best)!;
  const label = new Intl.DateTimeFormat("en-AU", {
    timeZone: r.tz,
    weekday: "long",
    day: "numeric",
    month: "long",
  })
    .format(new Date(at))
    .replace(",", "");
  return { label, key: best };
}

// One row per clock time: places with the same UTC offset on the same day
// share a row (Kai, 28 Nov 2026: Central Standard Time and Alberta Time are
// both UTC−6), keeping the first zone's name, all the flags and every
// abbreviation ("CST / ABT").
export function byZone(rows: Row[]): Row[] {
  const out: Row[] = [];
  for (const r of rows) {
    const same = out.find(
      (o) => o.offset === r.offset && o.dayKey === r.dayKey,
    );
    if (!same) {
      out.push({ ...r });
      continue;
    }
    if (!same.flag.includes(r.flag)) same.flag += r.flag;
    if (!same.abbr.split(" / ").includes(r.abbr)) same.abbr += ` / ${r.abbr}`;
  }
  return out;
}

export function timesFor(at: number, places: Place[]): Row[] {
  return places.map((p) => {
    const d = new Date(at);
    const day = new Intl.DateTimeFormat("en-AU", {
      timeZone: p.tz,
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(d);
    const clock = new Intl.DateTimeFormat("en-AU", {
      timeZone: p.tz,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
      .format(d)
      .replace(/\s/g, " ")
      .toLowerCase();
    const hour = Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: p.tz,
        hour: "2-digit",
        hourCycle: "h23",
      }).format(d),
    );
    const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: p.tz }).format(
      d,
    );
    return {
      ...p,
      day,
      clock: clock === "12:00 am" ? "12:00 am (midnight)" : clock,
      hour,
      dayKey,
      ...zoneInfo(p.tz, at),
    };
  });
}

// From 10 pm to 2 am is late, 2–7 am early, so a better slot can be found.
const odd = (h: number) => (h >= 22 || h < 2 ? "Late" : h < 7 ? "Early" : null);

function messageText(s: Saved, rows: Row[], at: number) {
  const zones = byZone(rows);
  const main = mainDate(zones, at);
  return [
    `🌏 ${s.title}`,
    `📅 ${main.label}`,
    "",
    ...zones.map(
      (r) =>
        `${flagOrder(splitFlags(r.flag)).join("")} ${r.zone} (${r.abbr}): ${r.clock}${r.dayKey === main.key ? "" : `, ${r.day}`}`,
    ),
    ...(s.link ? ["", `Join here: ${s.link}`] : []),
  ].join("\n");
}

const pad = (n: number) => String(n).padStart(2, "0");
function icsDate(t: number) {
  const d = new Date(t);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
}
const esc = (s: string) => s.replace(/([\\,;])/g, "\\$1").replace(/\n/g, "\\n");

function icsFile(s: Saved, at: number) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//We The Free//Movement Hub//EN",
    "BEGIN:VEVENT",
    `UID:${at}-${s.title.replace(/\W+/g, "-")}@activism.wtf`,
    `DTSTAMP:${icsDate(at)}`,
    `DTSTART:${icsDate(at)}`,
    `DTEND:${icsDate(at + s.minutes * 60000)}`,
    `SUMMARY:${esc(s.title)}`,
    ...(s.link ? [`DESCRIPTION:${esc(`Join here: ${s.link}`)}`] : []),
    ...(s.link ? [`URL:${s.link}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function googleLink(s: Saved, at: number) {
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: s.title,
    dates: `${icsDate(at)}/${icsDate(at + s.minutes * 60000)}`,
    ...(s.link ? { details: `Join here: ${s.link}` } : {}),
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

// "🇺🇸🇨🇦" → ["🇺🇸", "🇨🇦"] (flags are pairs of regional indicator letters).
export function splitFlags(flags: string): string[] {
  return (
    flags.match(/\p{Regional_Indicator}{2}|\p{Extended_Pictographic}/gu) ?? []
  );
}

// On a split flag the first one gets the top-left half, so flags whose
// corner says who they are (stars, Union Jack) go first.
const CORNER_FLAGS = ["🇺🇸", "🇬🇧", "🇦🇺", "🇳🇿", "🇲🇾", "🇱🇷"];
export function flagOrder(flags: string[]): string[] {
  const rank = (f: string) => {
    const i = CORNER_FLAGS.indexOf(f);
    return i < 0 ? CORNER_FLAGS.length : i;
  };
  return [...flags].sort((a, b) => rank(a) - rank(b));
}

// A flag emoji as a picture with the empty space around the glyph cut off.
const flagCache = new Map<string, HTMLCanvasElement | null>();
function flagPicture(flag: string, font: string) {
  if (flagCache.has(flag)) return flagCache.get(flag)!;
  const c = document.createElement("canvas");
  c.width = c.height = 160;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.font = `110px ${font}`;
  g.textBaseline = "middle";
  g.textAlign = "center";
  g.fillText(flag, 80, 84);
  const d = g.getImageData(0, 0, 160, 160).data;
  let x0 = 160,
    y0 = 160,
    x1 = -1,
    y1 = -1;
  for (let y = 0; y < 160; y++)
    for (let x = 0; x < 160; x++)
      if (d[(y * 160 + x) * 4 + 3] > 40) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 < 0) {
    flagCache.set(flag, null);
    return null;
  }
  const out = document.createElement("canvas");
  out.width = x1 - x0 + 1;
  out.height = y1 - y0 + 1;
  out
    .getContext("2d")!
    .drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  flagCache.set(flag, out);
  return out;
}

// One flag fills the box; two share it split corner to corner (first flag
// top-left, second bottom-right); three or more as even upright strips.
function drawFlags(
  ctx: CanvasRenderingContext2D,
  flags: string[],
  x: number,
  y: number,
  w: number,
  h: number,
  font: string,
) {
  if (!flags.length) return;
  const pics = flags.map((f) => flagPicture(f, font));
  if (pics.some((p) => !p)) {
    // No colour emoji font: fall back to the plain characters.
    ctx.font = `${h}px ${font}`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(flags.join(""), x, y + h * 0.85);
    return;
  }
  const r = Math.max(3, h * 0.14);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.clip();
  const n = pics.length;
  pics.forEach((p, i) => {
    ctx.save();
    ctx.beginPath();
    if (n === 2) {
      if (i === 0) {
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x, y + h);
      } else {
        ctx.moveTo(x + w, y);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x, y + h);
      }
      ctx.closePath();
    } else {
      ctx.rect(x + (w * i) / n, y, w / n, h);
    }
    ctx.clip();
    ctx.drawImage(p!, x, y, w, h);
    ctx.restore();
  });
  if (n === 2) {
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = Math.max(2, h * 0.08);
    ctx.beginPath();
    ctx.moveTo(x + w, y);
    ctx.lineTo(x, y + h);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, r);
  ctx.stroke();
}

// 4:5 graphic: kicker, meeting title, the main date (big, Kai 28 Nov 2026),
// then one row per time zone with its official name and the local time.
export function drawMeeting(
  ctx: CanvasRenderingContext2D,
  d: {
    kicker: string;
    title: string;
    rows: Row[];
    at: number;
    foot: string;
    mark: HTMLImageElement | null;
  },
) {
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, W, H);
  grain(ctx, W, H);
  logo(ctx, d.mark);
  const x = 72;
  const width = W - 2 * x;
  const font = bodyFont();
  const rows = byZone(d.rows);
  const main = mainDate(rows, d.at);
  ctx.textBaseline = "alphabetic";
  ctx.font = `800 30px ${font}`;
  ctx.letterSpacing = "6px";
  ctx.fillStyle = PINK;
  ctx.fillText(d.kicker.toUpperCase(), x, 170);
  ctx.letterSpacing = "0px";

  // Title: up to 3 lines, as big as fits (a little smaller than before, to
  // make room for the date).
  const title = d.title.toUpperCase();
  let size = 88;
  let lines: string[] = [];
  for (; size >= 52; size -= 4) {
    ctx.font = `${size}px ${DISPLAY}`;
    lines = wrap(ctx, title, width - 120, 3);
    if (!lines.some((l) => l.endsWith("…"))) break;
  }
  ctx.fillStyle = "#ffffff";
  let y = 170 + 20;
  for (const l of lines) {
    y += size * 1.02;
    ctx.fillText(l, x - 3, y);
  }

  // Main date: weekday small and spaced, then the day + month big in yellow.
  if (main.label) {
    const [weekday, ...rest] = main.label.split(" ");
    y += 70;
    ctx.font = `700 30px ${font}`;
    ctx.letterSpacing = "5px";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(weekday.toUpperCase(), x, y);
    ctx.letterSpacing = "0px";
    const date = rest.join(" ").toUpperCase();
    let ds = 84;
    ctx.font = `${ds}px ${DISPLAY}`;
    while (ds > 48 && ctx.measureText(date).width > width) {
      ds -= 4;
      ctx.font = `${ds}px ${DISPLAY}`;
    }
    y += ds * 1.02;
    ctx.fillStyle = YELLOW;
    ctx.fillText(date, x - 2, y);
  }

  // Rows share the space down to the footer line.
  const top = y + 44;
  const bottom = H - 150;
  const n = Math.max(1, rows.length);
  const rowH = Math.min(104, (bottom - top) / n);
  const timeSize = Math.min(42, rowH * 0.46);
  const subSize = Math.round(Math.min(22, rowH * 0.26));
  const flagSize = Math.min(30, rowH * 0.34);
  // Zone names: one size for every row, the biggest that fits.
  ctx.font = `${timeSize}px ${DISPLAY}`;
  const timeW = Math.max(
    ...rows.map(
      (r) =>
        ctx.measureText(r.clock.replace(" (midnight)", "").toUpperCase()).width,
    ),
  );
  // Flags are drawn as pictures: one per row, or one split diagonally when a
  // row covers two countries (Kai, 28 Nov 2026: "half half flag").
  const flagH = Math.round(flagSize * 1.05);
  const flagW = Math.round(flagH * 1.45);
  const fx = x + flagW + 18;
  const nameMax = x + width - timeW - 36 - fx;
  let nameSize = Math.min(32, rowH * 0.36);
  for (; nameSize > 18; nameSize -= 1) {
    ctx.font = `700 ${nameSize}px ${font}`;
    if (rows.every((r) => ctx.measureText(r.zone).width <= nameMax)) break;
  }
  rows.forEach((r, i) => {
    const ry = top + i * rowH;
    if (i) {
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(x, ry - 4, width, 2);
    }
    const mid = ry + rowH / 2;
    const base = mid + 2;
    const sub = base + subSize * 1.3;
    ctx.fillStyle = "#ffffff";
    drawFlags(
      ctx,
      flagOrder(splitFlags(r.flag)),
      x,
      base - flagH * 0.82,
      flagW,
      flagH,
      font,
    );
    ctx.font = `700 ${nameSize}px ${font}`;
    ctx.fillText(wrap(ctx, r.zone, nameMax, 1)[0], fx, base);
    ctx.font = `600 ${subSize}px ${font}`;
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText(`${r.abbr} · ${r.offset}`, fx, sub);
    // Right side: time (yellow); the day only when it isn't the main date.
    ctx.textAlign = "right";
    ctx.font = `${timeSize}px ${DISPLAY}`;
    ctx.fillStyle = YELLOW;
    const clock = r.clock.replace(" (midnight)", "").toUpperCase();
    ctx.fillText(clock, x + width, base);
    if (r.dayKey !== main.key) {
      ctx.font = `700 ${subSize}px ${font}`;
      ctx.fillStyle = PINK;
      ctx.fillText(r.day, x + width, sub);
    }
    ctx.textAlign = "left";
  });

  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(x, H - 130, width, 2);
  ctx.font = `700 30px ${font}`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(wrap(ctx, d.foot, width, 1)[0], x, H - 76);
}

export function MeetingPlanner() {
  const [s, setS] = useState<Saved>(() => {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
      if (!v) return DEFAULT;
      const saved: Saved = { ...DEFAULT, ...v };
      return saved.placesV === PLACES_V
        ? saved
        : { ...saved, places: USUAL, placesV: PLACES_V };
    } catch {
      return DEFAULT;
    }
  });
  const [kicker, setKicker] = useState("We The Free");
  const [adding, setAdding] = useState("");
  const [msg, setMsg] = useState("");
  const [mark, setMark] = useState<HTMLImageElement | null>(null);
  const [fonts, setFonts] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);

  function update(change: Partial<Saved>) {
    const next = { ...s, ...change };
    setS(next);
    setMsg("");
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  }

  const at = useMemo(
    () =>
      s.date && s.time ? zonedToUtc(s.date, s.time, s.hostTz) : Number.NaN,
    [s.date, s.time, s.hostTz],
  );
  const ok = Number.isFinite(at);
  // Earliest local time first, so the list reads round the world.
  const rows = useMemo(
    () =>
      ok
        ? timesFor(at, s.places).sort(
            (a, b) =>
              a.dayKey.localeCompare(b.dayKey) ||
              a.hour - b.hour ||
              a.clock.localeCompare(b.clock),
          )
        : [],
    [at, ok, s.places],
  );
  const host = ZONES.find((z) => z.tz === s.hostTz);
  const foot = s.link || "www.activism.wtf";

  useEffect(() => {
    let live = true;
    loadPosterFonts()?.then(() => live && setFonts(true));
    loadImage("/brand/wtf-mark.png")
      .then((img) => live && setMark(img))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx || !rows.length) return;
    drawMeeting(ctx, { kicker, title: s.title, rows, at, foot, mark });
  }, [kicker, s.title, rows, at, foot, mark, fonts]);

  async function copy(text: string, done: string) {
    await navigator.clipboard
      .writeText(text)
      .then(() => setMsg(done))
      .catch(() => setMsg("Couldn't copy. Select the text and copy it."));
  }
  function downloadIcs() {
    const b = new Blob([icsFile(s, at)], { type: "text/calendar" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = `${s.title.replace(/[^\w ]+/g, "").trim() || "meeting"}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 20_000);
  }
  async function blob() {
    return new Promise<Blob | null>((r) =>
      canvas.current?.toBlob(r, "image/png"),
    );
  }
  async function share() {
    const b = await blob();
    if (!b) return;
    const file = new File([b], "meeting-times.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
      } catch {}
      return;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = file.name;
    a.click();
  }
  async function copyImage() {
    const b = await blob();
    if (!b) return;
    await navigator.clipboard
      .write([new ClipboardItem({ "image/png": b })])
      .then(() => setMsg("Copied the image."))
      .catch(() => setMsg("Couldn't copy the image. Use Share or download."));
  }

  const input =
    "w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm";
  const button =
    "rounded-lg px-3 py-1.5 text-sm font-semibold ring-1 ring-black/10 hover:bg-stone-50";
  const unused = ZONES.filter(
    (z) => !s.places.some((p) => p.label === z.label),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Meeting planner
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Pick a time in one place and see it everywhere. Then copy a message,
          add it to your calendar or make a graphic.
        </p>
      </div>

      <section className="grid gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/5 sm:grid-cols-2">
        <label className="text-sm sm:col-span-2">
          <span className="font-medium text-navy">Meeting</span>
          <input
            className={`${input} mt-1`}
            value={s.title}
            onChange={(e) => update({ title: e.target.value })}
          />
        </label>
        <label className="text-sm">
          <span className="font-medium text-navy">Date</span>
          <input
            type="date"
            className={`${input} mt-1`}
            value={s.date}
            onChange={(e) => update({ date: e.target.value })}
          />
        </label>
        <label className="text-sm">
          <span className="font-medium text-navy">Time</span>
          <input
            type="time"
            className={`${input} mt-1`}
            value={s.time}
            onChange={(e) => update({ time: e.target.value })}
          />
        </label>
        <label className="text-sm">
          <span className="font-medium text-navy">In</span>
          <select
            className={`${input} mt-1`}
            value={s.hostTz}
            onChange={(e) => update({ hostTz: e.target.value })}
          >
            {[...new Map(ZONES.map((z) => [z.tz, z])).values()].map((z) => (
              <option key={z.tz} value={z.tz}>
                {z.label} time
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="font-medium text-navy">How long</span>
          <select
            className={`${input} mt-1`}
            value={s.minutes}
            onChange={(e) => update({ minutes: Number(e.target.value) })}
          >
            {[30, 45, 60, 90, 120].map((m) => (
              <option key={m} value={m}>
                {m < 60 ? `${m} minutes` : `${m / 60} hour${m > 60 ? "s" : ""}`}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="font-medium text-navy">
            Meeting link <span className="text-stone-400">(optional)</span>
          </span>
          <input
            className={`${input} mt-1`}
            placeholder="https://zoom.us/j/…"
            value={s.link}
            onChange={(e) => update({ link: e.target.value.trim() })}
          />
        </label>
      </section>

      <section className="rounded-2xl bg-white ring-1 ring-black/5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pt-4">
          <h2 className="font-semibold text-navy">Around the world</h2>
          {host && ok && (
            <p className="text-xs text-stone-500">
              Set for {s.time} on {s.date} in {host.label}
            </p>
          )}
        </div>
        {!ok ? (
          <p className="p-4 text-sm text-stone-500">Pick a date and time.</p>
        ) : (
          <ul className="mt-2 divide-y divide-stone-100">
            {rows.map((r) => {
              const flag = odd(r.hour);
              return (
                <li
                  key={r.label}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm"
                >
                  <span className="text-lg">{r.flag}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-navy">
                      {r.label}
                    </span>
                    <span className="block text-xs text-stone-500">
                      {r.zone} ({r.abbr})
                    </span>
                  </span>
                  {flag && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                      {flag}
                    </span>
                  )}
                  <span className="text-right">
                    <span className="block font-semibold text-navy">
                      {r.clock}
                    </span>
                    <span className="block text-xs text-stone-500">
                      {r.day}
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${r.label}`}
                    onClick={() =>
                      update({
                        places: s.places.filter((p) => p.label !== r.label),
                      })
                    }
                    className="rounded-full px-2 text-stone-400 hover:bg-stone-100 hover:text-navy"
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 px-4 py-3 text-sm">
          <select
            className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm"
            value={adding}
            onChange={(e) => {
              const z = ZONES.find((x) => x.label === e.target.value);
              if (z) update({ places: [...s.places, z] });
              setAdding("");
            }}
          >
            <option value="">+ Add a place…</option>
            {unused.map((z) => (
              <option key={z.label} value={z.label}>
                {z.flag} {z.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => update({ places: USUAL })}
            className="text-xs text-stone-500 hover:text-navy hover:underline"
          >
            Back to the usual places
          </button>
        </div>
      </section>

      {ok && rows.length > 0 && (
        <>
          <section className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-black/5">
            <h2 className="font-semibold text-navy">Message</h2>
            <pre className="whitespace-pre-wrap rounded-xl bg-stone-50 p-3 font-sans text-sm text-navy">
              {messageText(s, rows, at)}
            </pre>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`${button} bg-pink text-white ring-0 hover:bg-pink/90`}
                onClick={() =>
                  copy(messageText(s, rows, at), "Copied the message.")
                }
              >
                Copy message
              </button>
              <a
                href={googleLink(s, at)}
                target="_blank"
                rel="noopener noreferrer"
                className={button}
              >
                Add to Google Calendar ↗
              </a>
              <button type="button" className={button} onClick={downloadIcs}>
                Calendar file (.ics)
              </button>
            </div>
          </section>

          <section className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-black/5">
            <h2 className="font-semibold text-navy">Graphic</h2>
            <label className="block text-sm">
              <span className="font-medium text-navy">
                Small line at the top
              </span>
              <input
                className={`${input} mt-1`}
                value={kicker}
                onChange={(e) => setKicker(e.target.value)}
              />
            </label>
            <canvas
              ref={canvas}
              width={W}
              height={H}
              className="w-full max-w-sm rounded-xl shadow"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`${button} bg-pink text-white ring-0 hover:bg-pink/90`}
                onClick={share}
              >
                Share or download
              </button>
              <button type="button" className={button} onClick={copyImage}>
                Copy image
              </button>
            </div>
          </section>
        </>
      )}
      {msg && <p className="text-sm text-stone-600">{msg}</p>}
    </div>
  );
}
