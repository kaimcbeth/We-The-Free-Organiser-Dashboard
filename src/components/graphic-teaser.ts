// The "Coming soon" style for the graphic maker: a huge condensed heading
// top-left, the site name running down the right edge, three loose rings
// bottom-left and the event name, a small line and the date bottom-right,
// on a dark grainy background with a warm glow round the edges.
// Rebuilt from a template Kai sent (5 Nov 2026).

import { grain } from "@/components/graphic-poster";
import {
  shortTitle,
  type TextField,
  type Texts,
} from "@/components/graphic-photo-styles";
import { PALETTES, type Colours } from "@/components/graphic-colours";

const TALL = '"WTF Tall", Impact, "Arial Narrow", sans-serif';
const BODY = '"WTF Body", "Helvetica Neue", Arial, sans-serif';

let fontsReady: Promise<void> | null = null;
// Anton (headings) and Poppins (small lines), from /public/fonts.
export function loadTeaserFonts() {
  fontsReady ??= Promise.all([
    new FontFace("WTF Tall", "url(/fonts/anton.woff2)").load(),
    new FontFace("WTF Body", "url(/fonts/poppins-regular.woff2)").load(),
  ])
    .then((faces) => faces.forEach((f) => document.fonts.add(f)))
    .catch(() => {
      fontsReady = null;
    });
  return fontsReady;
}

export type TeaserEvent = {
  title: string;
  startsAt: string;
  typeName: string | null;
  community: string | null;
};

export function teaserFields(
  e: TeaserEvent,
  tz: string,
  recap: boolean,
): TextField[] {
  const movie = e.typeName?.toLowerCase() === "movie challenge";
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: tz,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(new Date(e.startsAt));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return [
    {
      key: "heading",
      label: "Heading",
      value: recap ? "Thank you" : "Coming soon",
    },
    {
      key: "name",
      label: "Event name",
      value: movie
        ? "3 Minute Movie Challenge"
        : shortTitle(e.title, e.community),
    },
    {
      key: "small",
      label: "Small line above the date",
      value: recap ? "For coming on" : "Save the date",
    },
    {
      key: "date",
      label: "Date",
      value: `${get("day")}.${get("month")}.${get("year")}`,
    },
    { key: "site", label: "Down the side", value: "www.activism.wtf" },
  ];
}

export function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > max && line) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

// Biggest size (start → min) where the words wrap into at most `lines`
// lines no wider than max and no taller than maxH (when given).
export function fitLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: (s: number) => string,
  start: number,
  min: number,
  max: number,
  lines: number,
  pitch: number,
  maxH = Infinity,
) {
  let s = start;
  let out: string[] = [];
  for (; s >= min; s -= 2) {
    ctx.font = font(s);
    out = wrap(ctx, text, max);
    const fits =
      out.length <= lines &&
      out.every((l) => ctx.measureText(l).width <= max) &&
      out.length * s * pitch <= maxH;
    if (fits) return { size: s, lines: out };
  }
  ctx.font = font(min);
  return { size: min, lines: wrap(ctx, text, max).slice(0, lines) };
}

export function spaced(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  em: number,
) {
  // Letter spacing, where the browser supports it.
  const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  if ("letterSpacing" in c) c.letterSpacing = `${em}px`;
  ctx.fillText(text, x, y);
  if ("letterSpacing" in c) c.letterSpacing = "0px";
}

export function drawTeaser(
  canvas: HTMLCanvasElement,
  o: {
    w: number;
    h: number;
    t: Texts;
    colours: Colours;
    mark: HTMLImageElement | null;
  },
) {
  const { w, h, t } = o;
  const up = (k: string) => (t[k] ?? "").trim().toUpperCase();
  const pal = PALETTES[o.colours];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const wide = w > h;
  const u = Math.min(w, h * 0.8) / 1080;
  const pad = Math.round(88 * u);

  // Background and glow.
  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, w, h);
  for (const [gx, gy, r, colour] of pal.glows) {
    const cx = gx * w;
    const cy = gy * h;
    const rad = r * (wide ? h * 1.2 : w);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    g.addColorStop(0, colour);
    g.addColorStop(1, colour.replace(/[\d.]+\)$/, "0)"));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  grain(ctx, w, h);
  grain(ctx, w, h);

  ctx.fillStyle = pal.ink;
  ctx.textBaseline = "alphabetic";

  // Site name down the right edge (with the logo mark above it).
  const siteSize = Math.round(21 * u);
  const sx = w - pad - siteSize * 0.2;
  let sy = pad;
  if (o.mark) {
    const m = Math.round(64 * u);
    ctx.drawImage(o.mark, sx - m / 2, sy, m, m);
    sy += m + 22 * u;
  }
  ctx.save();
  ctx.translate(sx - siteSize * 0.36, sy);
  ctx.rotate(Math.PI / 2);
  ctx.font = `${siteSize}px ${BODY}`;
  ctx.textAlign = "left";
  spaced(ctx, up("site"), 0, 0, siteSize * 0.22);
  ctx.restore();

  // Heading: as big as fits, top-left.
  const tall = (s: number) => `${s}px ${TALL}`;
  const headMax = w * (wide ? 0.55 : 0.68);
  const head = fitLines(
    ctx,
    up("heading"),
    tall,
    Math.round(300 * u),
    Math.round(90 * u),
    headMax,
    4,
    0.78,
    h * (wide ? 0.62 : 0.4),
  );
  ctx.font = tall(head.size);
  ctx.textAlign = "left";
  const cap = ctx.measureText("H").actualBoundingBoxAscent;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.28)";
  ctx.shadowBlur = 14 * u;
  ctx.shadowOffsetY = 4 * u;
  if (up("heading"))
    head.lines.forEach((l, i) =>
      ctx.fillText(l, pad, pad + cap + i * cap * 1.05),
    );
  ctx.restore();

  // Bottom-right block, built upwards from the date.
  const right = w - pad;
  ctx.textAlign = "right";
  let base = h - pad; // baseline of the lowest line still to place
  if (up("date")) {
    ctx.font = `${Math.round(50 * u)}px ${BODY}`;
    spaced(ctx, up("date"), right, base, 2 * u);
    base -= 66 * u;
  }
  if (up("small")) {
    ctx.font = `${Math.round(26 * u)}px ${BODY}`;
    spaced(ctx, up("small"), right, base, 26 * u * 0.16);
    base -= 58 * u;
  }
  const nameText = (t.name ?? "").trim();

  const name = fitLines(
    ctx,
    nameText || "X",
    tall,
    Math.round(104 * u),
    Math.round(60 * u),
    w * (wide ? 0.42 : 0.62),
    3,
    1,
  );
  ctx.font = tall(name.size);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 10 * u;
  ctx.shadowOffsetY = 3 * u;
  const nameBase = base;
  const pitch = name.size * 1.02;
  if (nameText)
    name.lines
      .slice()
      .reverse()
      .forEach((l, i) => ctx.fillText(l, right, nameBase - i * pitch));
  ctx.restore();

  // Three loose rings, bottom-left.
  ctx.strokeStyle = pal.ink;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = Math.max(1.2, 1.6 * u);
  const rx = 76 * u;
  const ry = 38 * u;
  const cx = pad + rx;
  const bottom = h - pad;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(cx, bottom - ry - i * 40 * u, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
