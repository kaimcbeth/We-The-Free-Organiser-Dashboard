// Style 6 in the graphic maker, rebuilt from a Kittl poster Kai picked
// (6 Nov 2026): huge heading running up the left side, a block of rough
// diagonal stripes, the photo under it, a bold line under the photo, then a
// short list, a divider and the date and place.
//
// The photo sits in a box and is cropped to fill it, so tall and wide photos
// both work. On wide covers the parts sit side by side instead.

import { cover, grain } from "@/components/graphic-poster";
import { fitLines, spaced, wrap } from "@/components/graphic-teaser";
import { PALETTES, type Colours } from "@/components/graphic-colours";
import {
  fmt,
  place,
  shortTitle,
  timeRange,
  where,
  type PhotoStyleEvent,
  type TextField,
  type Texts,
} from "@/components/graphic-photo-styles";

const DISPLAY = '"WTF Display", "Arial Black", sans-serif';
const BODY = '"WTF Body", "Helvetica Neue", Arial, sans-serif';

let fontsReady: Promise<void> | null = null;
export function loadStripesFonts() {
  fontsReady ??= Promise.all([
    new FontFace("WTF Display", "url(/fonts/archivo-black.woff2)").load(),
    new FontFace("WTF Body", "url(/fonts/poppins-regular.woff2)").load(),
  ])
    .then((faces) => faces.forEach((f) => document.fonts.add(f)))
    .catch(() => {
      fontsReady = null;
    });
  return fontsReady;
}

export function stripesFields(
  e: PhotoStyleEvent,
  tz: string,
  recap: boolean,
  handle: string | null,
): TextField[] {
  const movie = e.typeName?.toLowerCase() === "movie challenge";
  const heading = movie ? "Movie Challenge" : shortTitle(e.title, e.community);
  const type = e.typeName?.trim();
  const tagline = recap
    ? "Thank you for coming"
    : movie
      ? "Vegan outreach"
      : type && !e.title.toLowerCase().includes(type.toLowerCase())
        ? type
        : "Everyone welcome";
  const yy = fmt(e.startsAt, tz, { year: "2-digit" });
  const date =
    `${fmt(e.startsAt, tz, { weekday: "short", day: "numeric", month: "long" })} '${yy}`.replace(
      /\./g,
      "",
    );
  return [
    {
      key: "heading",
      label: "Big words down the side",
      value: heading,
      wide: true,
    },
    {
      key: "tagline",
      label: "Line under the photo",
      value: tagline,
      wide: true,
    },
    {
      key: "list1",
      label: "List line 1",
      value: recap ? "" : timeRange(e, tz),
    },
    { key: "list2", label: "List line 2", value: where(e) },
    { key: "list3", label: "List line 3", value: handle ? `@${handle}` : "" },
    { key: "list4", label: "List line 4", value: "www.activism.wtf" },
    { key: "date", label: "Date", value: date },
    { key: "place", label: "Place", value: place(e) },
  ];
}

type Options = {
  w: number;
  h: number;
  t: Texts;
  photo: HTMLImageElement | null;
  mark: HTMLImageElement | null;
  colours: Colours;
};

const up = (s: string | undefined) => (s ?? "").trim().toUpperCase();

// Rough diagonal stripes ("/"), with specks rubbed out like worn print.
function stripes(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  u: number,
  ink: string,
  bg: string,
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  const period = 52 * u;
  const band = period * 0.5;
  ctx.fillStyle = ink;
  for (let k = -h; k < w + period; k += period) {
    ctx.beginPath();
    ctx.moveTo(x + k, y + h);
    ctx.lineTo(x + k + band, y + h);
    ctx.lineTo(x + k + band + h, y);
    ctx.lineTo(x + k + h, y);
    ctx.closePath();
    ctx.fill();
  }
  // The same specks every time, so the preview doesn't flicker.
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  ctx.fillStyle = bg;
  const n = Math.round((w * h) / (90 * u * u));
  for (let i = 0; i < n; i++) {
    const r = (0.6 + rnd() * rnd() * 3.4) * u;
    ctx.beginPath();
    ctx.ellipse(
      x + rnd() * w,
      y + rnd() * h,
      r * (1 + rnd() * 1.5),
      r,
      rnd() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.restore();
}

// Black and white, a touch more contrast (the poster's look).
function greyscale(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  try {
    const d = ctx.getImageData(
      Math.round(x),
      Math.round(y),
      Math.round(w),
      Math.round(h),
    );
    const p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      const g = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
      const v = Math.max(0, Math.min(255, (g - 128) * 1.08 + 128));
      p[i] = p[i + 1] = p[i + 2] = v;
    }
    ctx.putImageData(d, Math.round(x), Math.round(y));
  } catch {
    // A photo without CORS headers: leave it in colour.
  }
}

// The heading, rotated to read bottom to top, as big as fits the column.
// Returns the column's width (the heading's real width, so no gap is left).
function sideHeading(
  ctx: CanvasRenderingContext2D,
  text: string,
  left: number,
  top: number,
  bottom: number,
  maxW: number,
  u: number,
  colour: string,
) {
  if (!text) return 0;
  const length = bottom - top;
  const font = (s: number) => `${s}px ${DISPLAY}`;
  const words = text.split(/\s+/);
  // The poster's heading runs the full height, so prefer splits whose
  // longest line fills most of it; among those, the biggest.
  type Fit = { size: number; lines: string[]; cap: number; fill: number };
  const fits: Fit[] = [];
  for (let n = 1; n <= Math.min(3, words.length); n++) {
    // Split into n lines as evenly as the words allow.
    ctx.font = font(100);
    const lines = wrapEven(ctx, words, n);
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    const cap100 = ctx.measureText("H").actualBoundingBoxAscent;
    const byLength = (100 * length) / widest;
    const byWidth = (100 * maxW) / (cap100 * (n + (n - 1) * 0.16));
    const size = Math.floor(Math.min(byLength, byWidth));
    fits.push({
      size,
      lines,
      cap: (cap100 * size) / 100,
      fill: (widest * size) / 100 / length,
    });
  }
  const full = fits.filter((f) => f.fill >= 0.8);
  const best = (full.length ? full : fits).reduce<Fit | null>(
    (a, f) => (!a || f.size > a.size ? f : a),
    null,
  );
  if (!best) return 0;
  ctx.save();
  ctx.font = font(best.size);
  ctx.fillStyle = colour;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const gap = best.cap * 0.16;
  const colW = best.lines.length * best.cap + (best.lines.length - 1) * gap;
  best.lines.forEach((l, i) => {
    ctx.save();
    // Line 1 is on the left (its tops face left), the rest to its right.
    ctx.translate(left + best.cap + i * (best.cap + gap), bottom);
    ctx.rotate(-Math.PI / 2);
    spaced(ctx, l, 0, 0, -1.5 * u);
    ctx.restore();
  });
  ctx.restore();
  return colW;
}

function wrapEven(ctx: CanvasRenderingContext2D, words: string[], n: number) {
  if (n === 1) return [words.join(" ")];
  const total = ctx.measureText(words.join(" ")).width;
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (
      line &&
      lines.length < n - 1 &&
      ctx.measureText(next).width > total / n
    ) {
      // Break before or after this word, whichever is closer to even.
      const without = ctx.measureText(line).width;
      const withIt = ctx.measureText(next).width;
      if (withIt - total / n < total / n - without) {
        lines.push(next);
        line = "";
      } else {
        lines.push(line);
        line = word;
      }
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export function drawStripes(canvas: HTMLCanvasElement, o: Options) {
  const { w, h, t } = o;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const wide = w > h;
  const u = Math.min(w, h * 0.8) / 1080;
  const m = Math.round(26 * u);
  const gap = Math.round(14 * u);
  const mono = o.colours === "mono" || o.colours === "warm";
  const pal = PALETTES[o.colours === "warm" ? "mono" : o.colours];
  const bg = pal.bg;
  const ink = pal.head;
  const text = pal.text;

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Left: the heading up the side.
  const colW = sideHeading(
    ctx,
    up(t.heading),
    m,
    m,
    h - m,
    (wide ? 0.15 : 0.26) * w,
    u,
    ink,
  );
  const x0 = colW ? m + colW + gap * 1.6 : m;
  const right = w - m;

  // The words at the bottom: bold line, list | date + place.
  const list = [t.list1, t.list2, t.list3, t.list4]
    .map((s) => (s ?? "").trim())
    .filter(Boolean);
  const side = [t.date, t.place].map((s) => (s ?? "").trim()).filter(Boolean);
  const fs = Math.round(31 * u);
  const pitch = fs * 1.22;
  const rows = Math.max(list.length, side.length);

  const panelX = wide ? x0 + (right - x0) * 0.58 + gap : x0;
  const panelW = right - panelX;
  const tagline = up(t.tagline);
  const display = (s: number) => `${s}px ${DISPLAY}`;
  const tag = tagline
    ? fitLines(
        ctx,
        tagline,
        display,
        Math.round(80 * u),
        Math.round(40 * u),
        panelW,
        wide ? 3 : 2,
        1.02,
      )
    : null;
  ctx.font = display(tag?.size ?? 10);
  const tagCap = ctx.measureText("H").actualBoundingBoxAscent;
  const tagH = tag ? tagCap + (tag.lines.length - 1) * tag.size * 1.02 : 0;
  const listH = rows ? (rows - 1) * pitch + fs * 0.75 : 0;
  const blockH = tagH + (tag && rows ? 44 * u : 0) + listH;

  // Stripes and photo.
  if (wide) {
    const photoX = x0;
    const photoW = panelX - gap - x0;
    if (o.photo) {
      cover(ctx, o.photo, photoX, m, photoW, h - 2 * m);
      if (mono) greyscale(ctx, photoX, m, photoW, h - 2 * m);
    } else stripes(ctx, photoX, m, photoW, h - 2 * m, u, ink, bg);
    const stripeH = Math.max(40 * u, h - 2 * m - blockH - 50 * u);
    stripes(ctx, panelX, m, panelW, stripeH, u, ink, bg);
  } else {
    const stripeH = Math.round(h * (h > w * 1.5 ? 0.19 : 0.215));
    const photoTop = m + stripeH + gap;
    const photoBottom = h - m - blockH - 46 * u;
    if (o.photo) {
      stripes(ctx, x0, m, right - x0, stripeH, u, ink, bg);
      cover(ctx, o.photo, x0, photoTop, right - x0, photoBottom - photoTop);
      if (mono)
        greyscale(ctx, x0, photoTop, right - x0, photoBottom - photoTop);
    } else stripes(ctx, x0, m, right - x0, photoBottom - m, u, ink, bg);
  }
  grain(ctx, w, h);

  // Logo in a small notch at the top right of the stripes.
  if (o.mark) {
    const s = Math.round(64 * u);
    const pad = Math.round(10 * u);
    ctx.fillStyle = bg;
    ctx.fillRect(right - s - pad * 2, m, s + pad * 2, s + pad * 2);
    ctx.drawImage(o.mark, right - s - pad, m + pad, s, s);
  }

  // Bold line, then the list and the date/place, all sitting on the bottom.
  let y = h - m - blockH;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  if (tag) {
    ctx.font = display(tag.size);
    ctx.fillStyle = ink;
    tag.lines.forEach((l, i) =>
      spaced(ctx, l, panelX - 2 * u, y + tagCap + i * tag.size * 1.02, -1 * u),
    );
    y += tagH + 44 * u;
  }
  if (rows) {
    const body = `${fs}px ${BODY}`;
    ctx.font = body;
    ctx.fillStyle = text;
    const bottom = h - m;
    // Right column starts a little past the middle; long lines wrap short.
    const split = panelX + panelW * (wide ? 0.5 : 0.48);
    const listW = split - panelX - 24 * u;
    list.forEach((l, i) => {
      const line = wrap(ctx, l, listW)[0];
      spaced(ctx, line, panelX, y + fs * 0.75 + i * pitch, 0);
    });
    if (side.length) {
      if (list.length) {
        ctx.fillStyle = ink;
        ctx.fillRect(
          split,
          y + fs * 0.05,
          Math.max(2, 3 * u),
          bottom - y - fs * 0.15,
        );
      }
      ctx.fillStyle = text;
      const sx = list.length ? split + 70 * u : panelX;
      side.forEach((l, i) => {
        const line = wrap(ctx, l, right - sx)[0];
        spaced(ctx, line, sx, bottom - (side.length - 1 - i) * pitch, 0);
      });
    }
  }
}
