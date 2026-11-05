// Two photo-led styles for the graphic maker, rebuilt from templates Kai
// sent (5 Nov 2026):
// - "Big photo": the photo fills the page, a huge serif heading across the
//   top, a few words and the date top-right, "Follow us" + handle bottom-left.
// - "Photo + details": photo on top fading into a dark panel, a big heading
//   with the date stacked beside it, the place and the time below, and the
//   handle and website along the bottom.

import { cover, grain } from "@/components/graphic-poster";
import { fitLines, spaced, wrap } from "@/components/graphic-teaser";
import { PALETTES, type Colours } from "@/components/graphic-colours";

const SERIF = '"WTF Serif", Georgia, serif';
const THIN = '"WTF Thin", "Helvetica Neue", Arial, sans-serif';
const BODY = '"WTF Body", "Helvetica Neue", Arial, sans-serif';
const BOLD = '"WTF Bold", "Helvetica Neue", Arial, sans-serif';

let fontsReady: Promise<void> | null = null;
export function loadPhotoStyleFonts() {
  fontsReady ??= Promise.all([
    new FontFace("WTF Serif", "url(/fonts/gloock.woff2)").load(),
    new FontFace("WTF Thin", "url(/fonts/inter-tight-light.woff2)").load(),
    new FontFace("WTF Body", "url(/fonts/poppins-regular.woff2)").load(),
    new FontFace("WTF Bold", "url(/fonts/poppins-semibold.woff2)").load(),
  ])
    .then((faces) => faces.forEach((f) => document.fonts.add(f)))
    .catch(() => {
      fontsReady = null;
    });
  return fontsReady;
}

export type PhotoStyleEvent = {
  title: string;
  startsAt: string;
  endsAt: string | null;
  venue: string | null;
  address: string | null;
  typeName: string | null;
  community: string | null;
};

export const noEmoji = (s: string) =>
  s
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

const fmt = (iso: string, tz: string, o: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-AU", { timeZone: tz, ...o }).format(
    new Date(iso),
  );
const time = (iso: string, tz: string) =>
  fmt(iso, tz, { hour: "numeric", minute: "2-digit" })
    .replace(/\s/g, "")
    .replace(":00", "")
    .toUpperCase();
const timeRange = (e: PhotoStyleEvent, tz: string) =>
  e.endsAt
    ? `${time(e.startsAt, tz)} – ${time(e.endsAt, tz)}`
    : time(e.startsAt, tz);

// The place: the venue, else the first part of the address.
function place(e: PhotoStyleEvent) {
  const venue = e.venue?.trim();
  const first = e.address?.split(",")[0]?.trim();
  return venue || first || "";
}
// The rest of the address (suburb and so on), without the venue's name.
function where(e: PhotoStyleEvent) {
  const venue = e.venue?.trim().toLowerCase();
  const parts = (e.address ?? "")
    .split(",")
    .map((p) =>
      p
        .trim()
        .replace(/\s+(nsw|vic|qld|wa|sa|tas|act|nt)\b.*$/i, "")
        .replace(/\s+\d{4}$/, ""),
    )
    .filter((p) => p && !/^(australia|new zealand)$/i.test(p));
  if (!venue) parts.shift(); // the first part is already the place
  return parts
    .filter((p) => p.toLowerCase() !== venue)
    .slice(0, 2)
    .join(", ");
}

// "WTF Sydney Christmas Potluck" → "Christmas Potluck": the community is
// on the graphic already, and a shorter heading can be bigger.
export function shortTitle(title: string, community: string | null) {
  let t = noEmoji(title).replace(/^(we the free|wtf)\s+/i, "");
  const city = community
    ?.replace(/^(we the free|wtf)\s+/i, "")
    .split(",")[0]
    .trim();
  if (city && t.toLowerCase().startsWith(city.toLowerCase() + " "))
    t = t.slice(city.length + 1);
  return t || noEmoji(title);
}

// A text on a graphic that the organiser can change.
export type TextField = {
  key: string;
  label: string;
  value: string; // what it says unless they change it
  wide?: boolean; // gets a full-width input
};
export type Texts = Record<string, string>;

export function photoStyleDefaults(e: PhotoStyleEvent, recap: boolean) {
  const movie = e.typeName?.toLowerCase() === "movie challenge";
  const heading = movie
    ? "3 Minute Movie Challenge"
    : shortTitle(e.title, e.community);
  const lead = recap
    ? "Thank you for coming."
    : movie
      ? "Vegan outreach. No experience needed."
      : "Everyone welcome.";
  const p = place(e);
  return { heading, words: p && !recap ? `${lead} ${p}.` : lead };
}

const handleText = (handle: string | null) =>
  handle ? `@${handle}` : "www.activism.wtf";

export function bigPhotoFields(
  e: PhotoStyleEvent,
  tz: string,
  recap: boolean,
  handle: string | null,
): TextField[] {
  const d = photoStyleDefaults(e, recap);
  const date =
    `${fmt(e.startsAt, tz, { weekday: "long", day: "numeric", month: "short" })}, ${time(e.startsAt, tz)}`.replace(
      /\./g,
      "",
    );
  return [
    { key: "heading", label: "Heading", value: d.heading, wide: true },
    { key: "words", label: "Words at the top right", value: d.words },
    { key: "date", label: "Date and time", value: date },
    { key: "follow", label: "Bottom line 1", value: "Follow us for more!" },
    { key: "handle", label: "Bottom line 2", value: handleText(handle) },
  ];
}

export function detailsFields(
  e: PhotoStyleEvent,
  tz: string,
  recap: boolean,
  handle: string | null,
): TextField[] {
  const d = photoStyleDefaults(e, recap);
  return [
    { key: "heading", label: "Heading", value: d.heading, wide: true },
    {
      key: "year",
      label: "Year",
      value: fmt(e.startsAt, tz, { year: "numeric" }),
    },
    {
      key: "month",
      label: "Month",
      value: fmt(e.startsAt, tz, { month: "short" }).replace(".", ""),
    },
    {
      key: "day",
      label: "Day",
      value: fmt(e.startsAt, tz, { day: "numeric" }),
    },
    { key: "place", label: "Place", value: place(e) },
    { key: "suburb", label: "Address", value: where(e) },
    {
      key: "label",
      label: "Small heading",
      value: recap ? "Thank you" : "Come along",
    },
    {
      key: "when1",
      label: "Line 1",
      value: fmt(e.startsAt, tz, { weekday: "long" }),
    },
    {
      key: "when2",
      label: "Line 2",
      value: fmt(e.startsAt, tz, { day: "numeric", month: "long" }),
    },
    { key: "when3", label: "Line 3", value: timeRange(e, tz) },
    { key: "handle", label: "Bottom left", value: handle ? `@${handle}` : "" },
    { key: "site", label: "Bottom right", value: "www.activism.wtf" },
  ];
}

type Common = {
  w: number;
  h: number;
  t: Texts;
  photo: HTMLImageElement | null;
  mark: HTMLImageElement | null;
  colours: Colours;
};

const up = (s: string | undefined) => (s ?? "").trim().toUpperCase();

// ---------------------------------------------------------------- Big photo

export function drawBigPhoto(canvas: HTMLCanvasElement, o: Common) {
  const { w, h, t } = o;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const wide = w > h;
  const u = Math.min(w, h * 0.8) / 1080;
  const pad = Math.round(26 * u);

  if (o.photo) cover(ctx, o.photo, 0, 0, w, h);
  else {
    ctx.fillStyle = o.colours === "warm" ? "#1d211d" : PALETTES[o.colours].bg;
    ctx.fillRect(0, 0, w, h);
    grain(ctx, w, h);
  }
  // Shade the top and bottom so the words read on any photo.
  const top = ctx.createLinearGradient(0, 0, 0, h * (wide ? 0.7 : 0.45));
  top.addColorStop(0, "rgba(0,0,0,0.55)");
  top.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, w, h);
  const bot = ctx.createLinearGradient(0, h * 0.78, 0, h);
  bot.addColorStop(0, "rgba(0,0,0,0)");
  bot.addColorStop(1, "rgba(0,0,0,0.5)");
  ctx.fillStyle = bot;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "alphabetic";

  // Top-right words and date.
  const words = up(t.words);
  const dateText = up(t.date);
  const boxW = words || dateText ? w * (wide ? 0.26 : 0.38) : 0;
  const thin = (s: number) => `${s}px ${THIN}`;
  const wordsFit = fitLines(
    ctx,
    words || dateText || "X",
    thin,
    Math.round(38 * u),
    Math.round(24 * u),
    Math.max(boxW, 1),
    4,
    1,
  );
  ctx.font = thin(wordsFit.size);
  ctx.textAlign = "right";
  const wcap = ctx.measureText("H").actualBoundingBoxAscent;
  let y = pad + wcap + 4 * u;
  if (words) {
    for (const l of wordsFit.lines) {
      spaced(ctx, l, w - pad, y, -0.8 * u);
      y += wordsFit.size * 1.02;
    }
    y += wordsFit.size * 0.75;
  }
  if (dateText)
    for (const l of wrap(ctx, dateText, boxW)) {
      spaced(ctx, l, w - pad, y, -0.8 * u);
      y += wordsFit.size * 1.02;
    }
  const boxBottom = boxW
    ? y - wordsFit.size * 1.02 + 30 * u // below the last line
    : pad;

  // Heading: either the first line shares the top with the words box and
  // the rest run full width underneath, or every line runs full width below
  // the box. Whichever lets the heading be bigger.
  const heading = up(t.heading);
  const full = w - pad * 2;
  const first = full - boxW - (boxW ? 30 * u : 0);
  const serif = (s: number) => `${s}px ${SERIF}`;
  const maxH = h * (wide ? 0.62 : 0.4);
  const layout = (shared: boolean) => {
    for (let size = Math.round(290 * u); size >= 60 * u; size -= 4) {
      ctx.font = serif(size);
      const lines: string[] = [];
      let line = "";
      const maxFor = (i: number) => (shared && i === 0 ? first : full);
      for (const word of heading.split(/\s+/)) {
        const next = line ? `${line} ${word}` : word;
        if (ctx.measureText(next).width > maxFor(lines.length) && line) {
          lines.push(line);
          line = word;
        } else line = next;
      }
      if (line) lines.push(line);
      const cap = ctx.measureText("H").actualBoundingBoxAscent;
      const firstBase = shared ? pad + 6 * u + cap : boxBottom + cap;
      const rest = shared
        ? Math.max(firstBase + cap * 1.12, boxBottom + cap)
        : firstBase + cap * 1.12;
      const bottom =
        lines.length > 1 ? rest + (lines.length - 2) * cap * 1.12 : firstBase;
      if (
        lines.length <= 4 &&
        lines.every((l, i) => ctx.measureText(l).width <= maxFor(i)) &&
        bottom - pad <= maxH
      )
        return { size, lines, firstBase, rest, cap };
    }
    return null;
  };
  if (heading) {
    const a = layout(true);
    const b = layout(false);
    const best = !a ? b : !b ? a : b.size > a.size * 1.15 ? b : a;
    if (best) {
      ctx.fillStyle = PALETTES[o.colours].head;
      ctx.font = serif(best.size);
      ctx.textAlign = "left";
      best.lines.forEach((l, i) =>
        ctx.fillText(
          l,
          pad - 4 * u,
          i === 0 ? best.firstBase : best.rest + (i - 1) * best.cap * 1.12,
        ),
      );
    }
  }

  // Bottom-left: two lines (follow us + handle); logo bottom-right.
  ctx.fillStyle = "#ffffff";
  const fs = Math.round(36 * u);
  ctx.font = thin(fs);
  ctx.textAlign = "left";
  const bottomLines = [up(t.follow), up(t.handle)].filter(Boolean);
  bottomLines
    .slice()
    .reverse()
    .forEach((l, i) =>
      spaced(ctx, l, pad, h - pad - 4 * u - i * fs * 1.05, -0.8 * u),
    );
  if (o.mark) {
    const m = Math.round(78 * u);
    ctx.drawImage(o.mark, w - pad - m, h - pad - m, m, m);
  }
}

// ---------------------------------------------------------- Photo + details

export function drawPhotoDetails(canvas: HTMLCanvasElement, o: Common) {
  const { w, h, t } = o;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const wide = w > h;
  const u = Math.min(w, h * 0.8) / 1080;
  const pad = Math.round(88 * u);
  const pal = PALETTES[o.colours];
  const bg = o.colours === "warm" ? "#1c1c1c" : pal.bg;
  const accent = pal.accent;

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  // Photo: top 73% (left 58% on wide covers), fading into the panel.
  if (wide) {
    const pw = w * 0.58;
    if (o.photo) cover(ctx, o.photo, 0, 0, pw, h);
    const g = ctx.createLinearGradient(pw * 0.6, 0, pw, 0);
    g.addColorStop(0, bg + "00");
    g.addColorStop(1, bg);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, pw, h);
  } else {
    const ph = h * 0.73;
    if (o.photo) cover(ctx, o.photo, 0, 0, w, ph);
    const g = ctx.createLinearGradient(0, ph * 0.72, 0, ph);
    g.addColorStop(0, bg + "00");
    g.addColorStop(1, bg);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, ph + 1);
  }
  grain(ctx, w, h);

  if (o.mark) {
    const m = Math.round(84 * u);
    ctx.drawImage(o.mark, w - pad - m, 80 * u, m, m);
  }

  ctx.textBaseline = "alphabetic";
  const left = wide ? w * 0.6 : pad;
  const right = w - pad;
  const colW = right - left;

  // Date stacked at the right: year / month / day.
  const ds = Math.round(44 * u);
  const bold = (s: number) => `${s}px ${BOLD}`;
  ctx.font = bold(ds);
  ctx.textAlign = "right";
  const date = [up(t.year), up(t.month), up(t.day)];
  const shown = date.filter(Boolean);
  const dateW = shown.length
    ? Math.max(...shown.map((d) => ctx.measureText(d).width))
    : 0;
  const headBase = wide ? h * 0.42 : h * 0.69;
  ctx.fillStyle = pal.text;
  shown.forEach((d, i) =>
    spaced(
      ctx,
      d,
      right,
      headBase - (shown.length - 1 - i) * ds * 0.98,
      -1 * u,
    ),
  );

  // Heading beside it, as big as fits (two lines at most).
  const heading = up(t.heading);
  const headMax = colW - dateW - (dateW ? 50 * u : 0);
  const body = (s: number) => `${s}px ${BODY}`;
  if (heading) {
    const head = fitLines(
      ctx,
      heading,
      body,
      Math.round(150 * u),
      Math.round(56 * u),
      headMax,
      2,
      0.95,
    );
    ctx.font = body(head.size);
    ctx.textAlign = "left";
    head.lines
      .slice()
      .reverse()
      .forEach((l, i) =>
        spaced(ctx, l, left - 4 * u, headBase - i * head.size * 0.95, -3 * u),
      );
  }

  // Under it: the place (white) and address (accent) on the left, the time
  // on the right; on wide covers they stack.
  ctx.textAlign = "left";
  let y = headBase + 112 * u;
  const p = up(t.place);
  const half = wide ? colW : colW * 0.55;
  if (p) {
    const pf = fitLines(
      ctx,
      p,
      body,
      Math.round(56 * u),
      Math.round(32 * u),
      half,
      2,
      1.05,
    );
    ctx.font = body(pf.size);
    ctx.fillStyle = pal.text;
    pf.lines.forEach((l, i) =>
      spaced(ctx, l, left, y + i * pf.size * 1.05, -1.5 * u),
    );
    y += (pf.lines.length - 1) * pf.size * 1.05 + 62 * u;
  }
  const suburb = up(t.suburb);
  if (suburb) {
    ctx.font = body(Math.round(32 * u));
    ctx.fillStyle = accent;
    const sl = wrap(ctx, suburb, half)[0];
    spaced(ctx, sl, left, y - 8 * u, 0.5 * u);
  }

  let ty = wide ? y + 80 * u : headBase + 100 * u;
  ctx.textAlign = wide ? "left" : "right";
  const tx = wide ? left : right;
  const label = up(t.label);
  if (label) {
    ctx.font = body(Math.round(34 * u));
    ctx.fillStyle = accent;
    spaced(ctx, label, tx, ty, 1 * u);
    ty += 52 * u;
  }
  ctx.font = bold(Math.round(22 * u));
  ctx.fillStyle = pal.text;
  for (const r of [up(t.when1), up(t.when2), up(t.when3)].filter(Boolean)) {
    spaced(ctx, r, tx, ty, 2 * u);
    ty += 30 * u;
  }

  // Words along the bottom: handle left, website right.
  const fy = h - 66 * u;
  ctx.font = body(Math.round(19 * u));
  ctx.fillStyle = accent;
  ctx.textAlign = "left";
  if (t.handle?.trim())
    spaced(ctx, t.handle.trim(), wide ? left : pad, fy, 1.5 * u);
  ctx.textAlign = "right";
  if (t.site?.trim()) spaced(ctx, t.site.trim(), right, fy, 1.5 * u);
}
