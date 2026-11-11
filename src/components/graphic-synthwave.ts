// Style 7 in the graphic maker (Kai, 11 Nov 2026: "a very synthwave New
// Year's Eve graphic"): a neon sunset sky with stars, a striped retro sun
// sinking behind dark mountains, a glowing pink grid floor running to the
// horizon, chrome heading and year, a neon script line, and the details on
// the floor. No photo. Made for New Year's Eve but works for any event
// (the year box is only filled in by itself for New Year's events).
//
// Never fireworks (Kai, 5 Nov 2026: not in line with veganism): the sky
// only has stars.
//
// Style 8 (Kai, 11 Nov 2026: "a version of the nye template with a spot of
// photo") is the same drawing with a photo inside the sun, tinted
// sunset colours; the words move up so they don't cover faces.

import { cover, grain } from "@/components/graphic-poster";
import { fitLines, spaced, wrap } from "@/components/graphic-teaser";
import {
  fmt,
  place,
  shortTitle,
  timeRange,
  type PhotoStyleEvent,
  type TextField,
  type Texts,
} from "@/components/graphic-photo-styles";

const DISPLAY = '"WTF Display", "Arial Black", sans-serif';
const BOLD = '"WTF Bold", "Helvetica Neue", Arial, sans-serif';
const SCRIPT = '"WTF Script", "Brush Script MT", cursive';

const PINK = "#ff47b9";
const CYAN = "#2fd9df";
const YELLOW = "#ffd90f";
const DEEP = "#12002b";

let fontsReady: Promise<void> | null = null;
export function loadSynthwaveFonts() {
  fontsReady ??= Promise.all([
    new FontFace("WTF Display", "url(/fonts/archivo-black.woff2)").load(),
    new FontFace("WTF Bold", "url(/fonts/poppins-semibold.woff2)").load(),
    new FontFace("WTF Script", "url(/fonts/yellowtail.woff2)").load(),
  ])
    .then((faces) => faces.forEach((f) => document.fonts.add(f)))
    .catch(() => {
      fontsReady = null;
    });
  return fontsReady;
}

export const isNewYear = (title: string) => /new\s*year/i.test(title);

export function synthwaveFields(
  e: PhotoStyleEvent,
  tz: string,
  recap: boolean,
  handle: string | null,
): TextField[] {
  const nye = isNewYear(e.title);
  const movie = e.typeName?.toLowerCase() === "movie challenge";
  const type = e.typeName?.trim();
  const city = (e.community ?? "")
    .replace(/^(we the free|wtf)\s+/i, "")
    .split(",")[0]
    .trim();
  // The year being rung in: New Year's Eve in December → next year.
  const y = Number(fmt(e.startsAt, tz, { year: "numeric" }));
  const m = Number(fmt(e.startsAt, tz, { month: "numeric" }));
  const year = nye ? String(m === 12 ? y + 1 : y) : "";
  const heading = nye
    ? "New Year's Eve"
    : movie
      ? "Movie Challenge"
      : shortTitle(e.title, e.community);
  const tagline = recap
    ? "Thanks for coming"
    : nye
      ? "Countdown party"
      : movie
        ? "Vegan outreach"
        : type && !e.title.toLowerCase().includes(type.toLowerCase())
          ? type
          : "Everyone welcome";
  const date = fmt(e.startsAt, tz, {
    weekday: "short",
    day: "numeric",
    month: "long",
  }).replace(/,/g, "");
  return [
    {
      key: "kicker",
      label: "Small line at the top",
      value: city ? `We The Free ${city}` : "We The Free",
      wide: true,
    },
    { key: "heading", label: "Heading", value: heading, wide: true },
    { key: "year", label: "Big number", value: year },
    { key: "tagline", label: "Neon line", value: tagline },
    { key: "date", label: "Date", value: date },
    { key: "time", label: "Time", value: recap ? "" : timeRange(e, tz) },
    { key: "place", label: "Place", value: place(e), wide: true },
    { key: "handle", label: "Instagram", value: handle ? `@${handle}` : "" },
    { key: "site", label: "Website", value: "www.activism.wtf" },
  ];
}

type Options = {
  w: number;
  h: number;
  t: Texts;
  mark: HTMLImageElement | null;
  photo?: HTMLImageElement | null;
};

const val = (s: string | undefined) => (s ?? "").trim();

function seeded(seed: number) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}

// Biggest size (start → min) at which one line fits maxW.
function fitOne(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: (s: number) => string,
  start: number,
  min: number,
  maxW: number,
) {
  for (let s = start; s > min; s -= 2) {
    ctx.font = font(s);
    if (ctx.measureText(text).width <= maxW) return s;
  }
  return min;
}

function sky(ctx: CanvasRenderingContext2D, w: number, horizon: number) {
  const g = ctx.createLinearGradient(0, 0, 0, horizon);
  g.addColorStop(0, "#07021c");
  g.addColorStop(0.35, "#1d0749");
  g.addColorStop(0.62, "#5a0f6e");
  g.addColorStop(0.84, "#b51f7c");
  g.addColorStop(1, "#ff6a5c");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, horizon);
}

function stars(
  ctx: CanvasRenderingContext2D,
  w: number,
  bottom: number,
  u: number,
) {
  const rnd = seeded(29);
  const n = Math.round((w * bottom) / (5200 * u * u));
  ctx.save();
  for (let i = 0; i < n; i++) {
    const x = rnd() * w;
    const y = Math.pow(rnd(), 1.5) * bottom;
    const r = (0.6 + rnd() * rnd() * 2.2) * u;
    ctx.globalAlpha = (0.35 + rnd() * 0.65) * (1 - (y / bottom) * 0.7);
    ctx.fillStyle = rnd() < 0.2 ? "#bff8ff" : "#ffffff";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // A few bright twinkles with a little cross.
  for (let i = 0; i < 9; i++) {
    const x = rnd() * w;
    const y = rnd() * bottom * 0.55;
    const s = (7 + rnd() * 9) * u;
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = Math.max(1, 1.6 * u);
    ctx.shadowColor = CYAN;
    ctx.shadowBlur = 10 * u;
    ctx.beginPath();
    ctx.moveTo(x - s, y);
    ctx.lineTo(x + s, y);
    ctx.moveTo(x, y - s);
    ctx.lineTo(x, y + s);
    ctx.stroke();
  }
  ctx.restore();
}

// The retro sun: yellow to pink, with gaps that get wider towards the bottom.
function sun(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  visible: number,
  photo: HTMLImageElement | null = null,
) {
  // Soft glow behind it.
  const glow = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 2.1);
  glow.addColorStop(0, "rgba(255,71,185,0.55)");
  glow.addColorStop(0.5, "rgba(255,71,185,0.18)");
  glow.addColorStop(1, "rgba(255,71,185,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(cx - r * 2.2, cy - r * 2.2, r * 4.4, r * 4.4);

  const size = Math.ceil(r * 2 + 4);
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const s = c.getContext("2d")!;
  const g = s.createLinearGradient(0, 0, 0, size);
  g.addColorStop(0, "#fff3a0");
  g.addColorStop(0.28, YELLOW);
  g.addColorStop(0.58, "#ff8a3d");
  g.addColorStop(0.85, PINK);
  g.addColorStop(1, "#d6249f");
  s.fillStyle = g;
  s.beginPath();
  s.arc(size / 2, size / 2, r, 0, Math.PI * 2);
  s.fill();
  if (photo) {
    // The photo in black and white, then the sunset colours laid over it
    // (keeps the photo's light and shade, takes the sun's colours).
    s.save();
    s.beginPath();
    s.arc(size / 2, size / 2, r, 0, Math.PI * 2);
    s.clip();
    // Fill only the part above the horizon, so the middle of the photo
    // (usually the faces) is what shows.
    s.filter = "grayscale(1) contrast(1.1) brightness(1.08)";
    cover(s, photo, size / 2 - r, size / 2 - r, r * 2, r + visible);
    s.filter = "none";
    s.globalCompositeOperation = "color";
    s.globalAlpha = 0.72;
    s.fillStyle = g;
    s.fillRect(0, 0, size, size);
    s.globalAlpha = 0.35;
    s.globalCompositeOperation = "soft-light";
    s.fillRect(0, 0, size, size);
    s.restore();
    // A thin glowing rim so it still reads as a sun.
    s.strokeStyle = "rgba(255,230,160,0.9)";
    s.lineWidth = Math.max(2, r * 0.012);
    s.beginPath();
    s.arc(size / 2, size / 2, r - s.lineWidth / 2, 0, Math.PI * 2);
    s.stroke();
  }
  // Cut the stripes out of the part above the horizon (`visible` = how far
  // below the sun's middle the horizon is), each gap wider than the last.
  s.globalCompositeOperation = "destination-out";
  // With a photo: three thin stripes in the bottom fifth only.
  const end = size / 2 + visible;
  const start = photo ? end - (r + visible) * 0.2 : size / 2 - r * 0.5;
  const n = photo ? 3 : 6;
  for (let i = 0; i < n; i++) {
    const at = start + (end - start) * Math.pow(i / n, 0.8);
    const gap = Math.max(2, r * ((photo ? 0.008 : 0.014) + 0.01 * i));
    s.fillRect(0, at, size, gap);
  }
  ctx.drawImage(c, cx - size / 2, cy - size / 2);
}

// Dark mountains along the horizon, lower in the middle so the sun shows,
// with a thin pink rim and a few wireframe ridges.
function mountains(
  ctx: CanvasRenderingContext2D,
  w: number,
  horizon: number,
  cx: number,
  maxH: number,
  u: number,
  clear = 0, // keep this far either side of cx flat (the photo sun)
) {
  const rnd = seeded(5);
  const pts: [number, number][] = [[0, horizon]];
  const step = 46 * u;
  for (let x = 0; x <= w + step; x += step * (0.6 + rnd() * 0.8)) {
    const away = Math.min(1, Math.abs(x - cx) / (w * 0.42));
    const flat = clear && Math.abs(x - cx) < clear ? 0.04 : 1;
    const peak = maxH * flat * (0.08 + 0.92 * Math.pow(away, 1.4));
    const hgt = peak * (0.45 + rnd() * 0.55);
    pts.push([x, horizon - hgt]);
  }
  pts.push([w, horizon]);
  ctx.save();
  const g = ctx.createLinearGradient(0, horizon - maxH, 0, horizon);
  g.addColorStop(0, "#2a0a52");
  g.addColorStop(1, "#0d0322");
  ctx.fillStyle = g;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
  // Wireframe: lines from each peak down to the horizon.
  ctx.strokeStyle = "rgba(47,217,223,0.22)";
  ctx.lineWidth = Math.max(1, 1.2 * u);
  ctx.beginPath();
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    if (horizon - y < 14 * u) continue;
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rnd() - 0.5) * 40 * u, horizon);
  }
  ctx.stroke();
  // Rim.
  ctx.strokeStyle = PINK;
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = Math.max(1.5, 2.4 * u);
  ctx.shadowColor = PINK;
  ctx.shadowBlur = 12 * u;
  ctx.beginPath();
  pts
    .slice(1, -1)
    .forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.restore();
}

// The glowing grid floor, running to a vanishing point on the horizon.
function floor(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  horizon: number,
  cx: number,
  u: number,
) {
  const g = ctx.createLinearGradient(0, horizon, 0, h);
  g.addColorStop(0, "#3a0a5c");
  g.addColorStop(0.4, "#1a0538");
  g.addColorStop(1, "#08021a");
  ctx.fillStyle = g;
  ctx.fillRect(0, horizon, w, h - horizon);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, horizon, w, h - horizon);
  ctx.clip();
  ctx.strokeStyle = PINK;
  ctx.shadowColor = PINK;
  ctx.shadowBlur = 14 * u;
  const depth = h - horizon;
  // Lines running away from us.
  const spread = 150 * u;
  const n = Math.ceil(w / spread) + 6;
  ctx.lineWidth = Math.max(1.5, 2.6 * u);
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  for (let i = -n; i <= n; i++) {
    const bottomX = cx + i * spread * 1.9;
    ctx.moveTo(cx + i * spread * 0.06, horizon);
    ctx.lineTo(bottomX, h);
  }
  ctx.stroke();
  // Lines across, closer together near the horizon.
  const rows = 13;
  for (let k = 1; k <= rows; k++) {
    const t = k / rows;
    const y = horizon + depth * Math.pow(t, 2.1);
    ctx.globalAlpha = 0.35 + 0.6 * t;
    ctx.lineWidth = Math.max(1, (1 + 2.4 * t) * u);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.restore();

  // A haze along the horizon so the far grid melts into the glow.
  const haze = ctx.createLinearGradient(0, horizon, 0, horizon + depth * 0.22);
  haze.addColorStop(0, "rgba(255,106,92,0.55)");
  haze.addColorStop(1, "rgba(255,106,92,0)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, horizon, w, depth * 0.22);

  // The horizon itself: a bright line.
  ctx.save();
  ctx.fillStyle = "#ffd6f0";
  ctx.shadowColor = PINK;
  ctx.shadowBlur = 22 * u;
  ctx.fillRect(0, horizon - 1.5 * u, w, 3 * u);
  ctx.restore();
}

// Chrome lettering: a deep purple drop for depth, a sky-to-sunset chrome
// fill split by a dark band, a fine white edge and a pink glow.
function chrome(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  u: number,
  track: number,
) {
  ctx.font = `${size}px ${DISPLAY}`;
  const cap = ctx.measureText("H").actualBoundingBoxAscent;
  const top = y - cap;
  // Glow.
  ctx.save();
  ctx.shadowColor = "rgba(255,71,185,0.9)";
  ctx.shadowBlur = size * 0.22;
  ctx.fillStyle = DEEP;
  spaced(ctx, text, x, y, track);
  ctx.restore();
  // Depth.
  const d = Math.max(2, size * 0.045);
  ctx.fillStyle = "#3b0a6b";
  for (let i = d; i > 0; i -= Math.max(1, u)) {
    spaced(ctx, text, x + i * 0.35, y + i, track);
  }
  // Chrome.
  const g = ctx.createLinearGradient(0, top, 0, y);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.2, "#c9fbff");
  g.addColorStop(0.47, "#4fc8f0");
  g.addColorStop(0.5, "#1a1050");
  g.addColorStop(0.56, "#3b1670");
  g.addColorStop(0.78, PINK);
  g.addColorStop(1, "#ffd0a0");
  ctx.fillStyle = g;
  spaced(ctx, text, x, y, track);
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = Math.max(1, size * 0.012);
  ctx.lineJoin = "round";
  const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  if ("letterSpacing" in c) c.letterSpacing = `${track}px`;
  ctx.strokeText(text, x, y);
  if ("letterSpacing" in c) c.letterSpacing = "0px";
  ctx.restore();
  return cap;
}

// Neon script: a glowing tube, slightly tilted.
function neon(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  u: number,
  align: CanvasTextAlign,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.07);
  ctx.font = `${size}px ${SCRIPT}`;
  ctx.textAlign = align;
  ctx.lineJoin = "round";
  // Outer glow, twice for strength.
  ctx.shadowColor = CYAN;
  ctx.shadowBlur = 30 * u;
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = Math.max(2, size * 0.05);
  ctx.strokeText(text, 0, 0);
  ctx.shadowBlur = 12 * u;
  ctx.strokeText(text, 0, 0);
  // Hot white core.
  ctx.shadowBlur = 6 * u;
  ctx.shadowColor = "#ffffff";
  ctx.fillStyle = "#eaffff";
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function scanlines(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  u: number,
) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  const step = Math.max(3, Math.round(4 * u));
  for (let y = 0; y < h; y += step) ctx.fillRect(0, y, w, Math.max(1, u));
  ctx.restore();
}

export function drawSynthwave(canvas: HTMLCanvasElement, o: Options) {
  const { w, h, t } = o;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const wide = w > h;
  const tall = h > w * 1.5;
  const u = Math.min(w, h * 0.8) / 1080;
  const m = Math.round((wide ? 60 : 64) * u);

  const kicker = val(t.kicker).toUpperCase();
  const heading = val(t.heading).toUpperCase();
  const year = val(t.year).toUpperCase();
  const tagline = val(t.tagline);
  const date = val(t.date).toUpperCase();
  const info = [val(t.time), val(t.place)].filter(Boolean).join("  ·  ");
  const foot = [val(t.handle), val(t.site)].filter(Boolean).join("  ·  ");

  const horizon = Math.round(h * (wide ? 0.66 : tall ? 0.58 : 0.62));
  const cx = wide ? w * 0.73 : w / 2;
  const photo = o.photo ?? null;
  const r = wide
    ? h * 0.34
    : w * (tall ? (photo ? 0.38 : 0.42) : photo ? 0.31 : 0.32);
  // With a photo the sun sits higher so more of the photo shows.
  const sunY = horizon - r * (photo && !wide ? 0.05 : 0.18);
  const sunTop = sunY - r;

  sky(ctx, w, horizon);
  stars(ctx, w, horizon - r * 0.4, u);
  sun(ctx, cx, sunY, r, horizon - sunY, photo);
  mountains(
    ctx,
    w,
    horizon,
    cx,
    (wide ? 0.11 : 0.1) * h,
    u,
    photo ? r * 1.04 : 0,
  );
  floor(ctx, w, h, horizon, cx, u);

  // Darken the bottom so the details read over the grid.
  const shadeTop = horizon + (h - horizon) * 0.3;
  const shade = ctx.createLinearGradient(0, shadeTop, 0, h);
  shade.addColorStop(0, "rgba(8,2,26,0)");
  shade.addColorStop(0.55, "rgba(8,2,26,0.72)");
  shade.addColorStop(1, "rgba(8,2,26,0.9)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, shadeTop, w, h - shadeTop);

  scanlines(ctx, w, horizon, u);
  grain(ctx, w, h);

  // Logo, top right.
  if (o.mark) {
    const s = Math.round(78 * u);
    ctx.save();
    ctx.shadowColor = "rgba(255,71,185,0.7)";
    ctx.shadowBlur = 18 * u;
    ctx.drawImage(o.mark, w - m - s, m - 8 * u, s, s);
    ctx.restore();
  }

  ctx.textBaseline = "alphabetic";
  const align: CanvasTextAlign = wide ? "left" : "center";
  ctx.textAlign = align;
  const tx = wide ? m * 1.4 : w / 2;
  const textW = wide ? w * 0.5 : w - 2 * m;

  // The top stack: kicker, heading, big number. The number sits low, across
  // the top of the sun; the heading above it.
  const kickSize = Math.round(30 * u);
  const kickY = m + kickSize * 0.8;
  if (kicker) {
    ctx.font = `${kickSize}px ${BOLD}`;
    ctx.save();
    ctx.fillStyle = CYAN;
    ctx.shadowColor = CYAN;
    ctx.shadowBlur = 12 * u;
    spaced(ctx, wrap(ctx, kicker, textW - 100 * u)[0], tx, kickY, 7 * u);
    ctx.restore();
  }
  const stackTop = kicker ? kickY + 40 * u : m;
  const display = (s: number) => `${s}px ${DISPLAY}`;

  // Bottom of the big number: across the sun in portrait, above the
  // horizon on wide covers.
  // With a photo (portrait) the words sit above the sun, clear of faces.
  const yearBase = wide
    ? horizon - r * 0.78
    : photo
      ? sunTop - 34 * u
      : Math.min(sunY - r * 0.28, horizon - 120 * u);
  const room = yearBase - stackTop;
  let yearCap = 0;
  let yearSize = 0;
  if (year) {
    yearSize = fitOne(
      ctx,
      year,
      display,
      Math.round(
        Math.min(
          (wide ? 300 : tall ? 360 : 330) * u,
          // Leave room for the heading above it.
          photo && !wide ? room * 0.62 : Infinity,
        ),
      ),
      60,
      textW * (wide ? 0.95 : 0.92),
    );
    ctx.font = display(yearSize);
    yearCap = ctx.measureText("H").actualBoundingBoxAscent;
  }
  const headBottom = year ? yearBase - yearCap - 50 * u : yearBase;
  const headRoom = headBottom - stackTop;
  const head = heading
    ? fitLines(
        ctx,
        heading,
        display,
        Math.round((year ? 120 : 190) * u),
        Math.round(44 * u),
        textW,
        year ? 2 : 3,
        1.02,
        headRoom,
      )
    : null;
  if (head) {
    ctx.font = display(head.size);
    const cap = ctx.measureText("H").actualBoundingBoxAscent;
    const pitch = head.size * 1.02;
    const first = headBottom - (head.lines.length - 1) * pitch;
    head.lines.forEach((l, i) =>
      chrome(
        ctx,
        l,
        tx,
        Math.max(stackTop + cap, first + i * pitch),
        head.size,
        u,
        1 * u,
      ),
    );
  }
  if (year) chrome(ctx, year, tx, yearBase, yearSize, u, 4 * u);

  // Neon line: on wide covers under the number; in portrait on the floor
  // just below the horizon.
  const bodyX = wide ? m * 1.4 : w / 2;
  const dateSize = Math.round(58 * u);
  const infoSize = Math.round(32 * u);
  const footSize = Math.round(28 * u);
  const lines: {
    text: string;
    size: number;
    font: string;
    colour: string;
    glow: string;
    track: number;
  }[] = [];
  if (date)
    lines.push({
      text: date,
      size: dateSize,
      font: DISPLAY,
      colour: YELLOW,
      glow: "rgba(255,217,15,0.6)",
      track: 2 * u,
    });
  if (info)
    lines.push({
      text: info.toUpperCase(),
      size: infoSize,
      font: BOLD,
      colour: "#ffffff",
      glow: "rgba(255,255,255,0.25)",
      track: 3 * u,
    });
  if (foot)
    lines.push({
      text: foot,
      size: footSize,
      font: BOLD,
      colour: CYAN,
      glow: "rgba(47,217,223,0.55)",
      track: 2 * u,
    });
  const gaps = lines.map((l, i) => (i === 0 ? 0 : l.size * 0.65 + 6 * u));
  const blockH = lines.reduce((a, l, i) => a + l.size * 0.78 + gaps[i], 0);

  if (tagline) {
    const tagSize = fitOne(
      ctx,
      tagline,
      (s) => `${s}px ${SCRIPT}`,
      Math.round((wide ? 120 : 132) * u),
      40,
      textW * 0.92,
    );
    const tagY = wide
      ? Math.min(yearBase + tagSize * 1.05, horizon - 24 * u)
      : horizon + (h - horizon - blockH - m) * 0.42 + tagSize * 0.35;
    neon(ctx, tagline, wide ? tx + 10 * u : tx, tagY, tagSize, u, align);
  }

  // Details on the floor, sitting on the bottom margin.
  let y = h - m - blockH;
  lines.forEach((l, i) => {
    y += gaps[i] + l.size * 0.78;
    ctx.font = `${l.size}px ${l.font}`;
    ctx.save();
    ctx.fillStyle = l.colour;
    ctx.shadowColor = l.glow;
    ctx.shadowBlur = 14 * u;
    ctx.textAlign = align;
    spaced(ctx, wrap(ctx, l.text, textW)[0], bodyX, y, l.track);
    ctx.restore();
  });
}
