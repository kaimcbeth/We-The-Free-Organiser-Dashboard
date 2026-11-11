// Style 9 in the graphic maker (Kai, 11 Nov 2026: a retro "Christmas Party"
// poster he liked, "should be able to use a photo inside", then "make an
// option for landscape photo, portrait photo or no photo"): flat Christmas
// red, a chunky cream heading with a script word over it, snowflakes, the
// date on the left and the time on the right, checkered bands behind the
// middle, a framed photo (or hanging baubles when there's no photo) on a
// ground shadow, a cream line of what's on, and the place in a cream box.
// The characters on Kai's example aren't copied: our own baubles stand in.

import { cover, grain } from "@/components/graphic-poster";
import {
  fmt,
  place,
  shortTitle,
  type PhotoStyleEvent,
  type TextField,
  type Texts,
} from "@/components/graphic-photo-styles";

export type XmasPhoto = "landscape" | "portrait" | "none";
export const XMAS_PHOTO: Record<XmasPhoto, string> = {
  landscape: "Landscape photo",
  portrait: "Portrait photo",
  none: "No photo",
};

const CHUNKY = '"WTF Chunky", "Arial Black", sans-serif';
const SCRIPT = '"WTF Party", "Brush Script MT", cursive';

const RED = "#d85b55";
const CREAM = "#f7e8cf";
const SAGE = "#7f9b78";
const BROWN = "#5a3424";
const MUSTARD = "#e3b04b";

let fontsReady: Promise<void> | null = null;
export function loadChristmasFonts() {
  fontsReady ??= Promise.all([
    new FontFace("WTF Chunky", "url(/fonts/lilita-one.woff2)").load(),
    new FontFace("WTF Party", "url(/fonts/pacifico.woff2)").load(),
  ])
    .then((faces) => faces.forEach((f) => document.fonts.add(f)))
    .catch(() => {
      fontsReady = null;
    });
  return fontsReady;
}

export const isChristmas = (title: string) => /christmas|xmas/i.test(title);

export function christmasFields(
  e: PhotoStyleEvent,
  tz: string,
  recap: boolean,
  handle: string | null,
): TextField[] {
  const t = e.title.toLowerCase();
  const xmas = isChristmas(e.title);
  const kind = /potluck/.test(t)
    ? "Potluck"
    : /social/.test(t)
      ? "Social"
      : /movie/.test(t)
        ? "Movie Challenge"
        : "Party";
  const start = fmt(e.startsAt, tz, { hour: "numeric", minute: "2-digit" })
    .replace(/\s/g, "")
    .replace(":00", "")
    .toLowerCase();
  return [
    {
      key: "heading",
      label: "Heading",
      value: xmas ? "Christmas" : shortTitle(e.title, e.community),
    },
    { key: "script", label: "Script word", value: xmas ? kind : "" },
    {
      key: "date",
      label: "Date",
      value: fmt(e.startsAt, tz, { day: "numeric", month: "short" }),
    },
    { key: "time", label: "Time", value: recap ? "" : `At ${start}` },
    {
      key: "tagline",
      label: "What's on",
      value: recap ? "Thanks for coming" : "Vegan food | Good company",
      wide: true,
    },
    { key: "place", label: "Place", value: place(e), wide: true },
    {
      key: "footer",
      label: "Bottom line",
      value: [handle ? `@${handle}` : "", "www.activism.wtf"]
        .filter(Boolean)
        .join(" · "),
      wide: true,
    },
  ];
}

type Options = {
  w: number;
  h: number;
  t: Texts;
  mark: HTMLImageElement | null;
  photo: HTMLImageElement | null;
  shape: XmasPhoto;
};

const val = (s: string | undefined) => (s ?? "").trim();

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
  ctx.font = font(min);
  return min;
}

function snowflake(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = CREAM;
  ctx.lineWidth = Math.max(2, r * 0.13);
  ctx.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    ctx.rotate(Math.PI / 3);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -r);
    ctx.moveTo(0, -r * 0.6);
    ctx.lineTo(-r * 0.22, -r * 0.82);
    ctx.moveTo(0, -r * 0.6);
    ctx.lineTo(r * 0.22, -r * 0.82);
    ctx.stroke();
  }
  ctx.restore();
}

// Two rows of cream/red squares from x0 to x1.
function checks(
  ctx: CanvasRenderingContext2D,
  x0: number,
  x1: number,
  y: number,
  sq: number,
  rows = 3,
) {
  ctx.fillStyle = CREAM;
  const n = Math.ceil((x1 - x0) / sq);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < n; c++)
      if ((r + c) % 2 === 0) {
        const x = x0 + c * sq;
        ctx.fillRect(x, y + r * sq, Math.min(sq, x1 - x), sq);
      }
}

function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

// Our own stand-in for the characters: three baubles hanging on strings.
function baubles(
  ctx: CanvasRenderingContext2D,
  cx: number,
  top: number,
  bottom: number,
  u: number,
) {
  const room = bottom - top;
  const list = [
    { dx: -0.95, len: 0.42, r: 0.2, fill: SAGE, band: CREAM },
    { dx: 0, len: 0.2, r: 0.27, fill: CREAM, band: RED },
    { dx: 0.95, len: 0.5, r: 0.18, fill: MUSTARD, band: CREAM },
  ];
  for (const b of list) {
    const r = room * b.r;
    const x = cx + b.dx * room * 0.42;
    const cy = top + room * b.len + r;
    ctx.strokeStyle = CREAM;
    ctx.lineWidth = 4 * u;
    ctx.beginPath();
    ctx.moveTo(x, top - 20 * u);
    ctx.lineTo(x, cy - r - r * 0.18);
    ctx.stroke();
    // Cap.
    ctx.fillStyle = BROWN;
    rounded(ctx, x - r * 0.2, cy - r - r * 0.2, r * 0.4, r * 0.24, 4 * u);
    ctx.fill();
    // Ball with an outline, like the poster's drawn look.
    ctx.beginPath();
    ctx.arc(x, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = b.fill;
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = b.band;
    ctx.fillRect(x - r, cy - r * 0.16, r * 2, r * 0.32);
    ctx.fillStyle = b.fill === CREAM ? SAGE : CREAM;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.arc(x + i * r * 0.42, cy - r * 0.48, r * 0.07, 0, Math.PI * 2);
      ctx.arc(x + i * r * 0.42, cy + r * 0.48, r * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = BROWN;
    ctx.lineWidth = 5 * u;
    ctx.beginPath();
    ctx.arc(x, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    // Shine.
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = r * 0.09;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(x, cy, r * 0.72, Math.PI * 1.1, Math.PI * 1.35);
    ctx.stroke();
  }
}

// The photo in a cream frame with a soft brown drop.
function framed(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  u: number,
) {
  const b = 14 * u;
  const r = 28 * u;
  ctx.fillStyle = BROWN;
  rounded(ctx, x - b + 12 * u, y - b + 14 * u, w + 2 * b, h + 2 * b, r + b);
  ctx.fill();
  ctx.fillStyle = CREAM;
  rounded(ctx, x - b, y - b, w + 2 * b, h + 2 * b, r + b);
  ctx.fill();
  ctx.save();
  rounded(ctx, x, y, w, h, r);
  ctx.clip();
  cover(ctx, img, x, y, w, h);
  ctx.restore();
}

// Two words stacked (e.g. "24" / "DEC"), centred on x.
function stack(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
) {
  const words = text.toUpperCase().split(/\s+/).filter(Boolean);
  if (!words.length) return;
  const lines =
    words.length <= 2 ? words : [words[0], words.slice(1).join(" ")];
  ctx.font = `${size}px ${CHUNKY}`;
  ctx.fillStyle = CREAM;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * size * 0.92));
}

export function drawChristmas(canvas: HTMLCanvasElement, o: Options) {
  const { w, h, t } = o;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const wide = w / h > 1.3;
  const u = (wide ? h : w) / 1080;
  const heading = val(t.heading).toUpperCase();
  const script = val(t.script);
  const date = val(t.date);
  const time = val(t.time);
  const tagline = val(t.tagline).toUpperCase();
  const where = val(t.place).toUpperCase();
  const footer = val(t.footer);
  const photo = o.shape === "none" ? null : o.photo;

  ctx.fillStyle = RED;
  ctx.fillRect(0, 0, w, h);
  grain(ctx, w, h);

  // Words column: the whole width on posts and stories, the left part on
  // the wide cover.
  const colX = wide ? 70 * u : 0;
  const colW = wide ? w * 0.48 : w;
  const cx = colX + colW / 2;

  // Heading + script word.
  let y = (wide ? 120 : h > w * 1.6 ? 230 : 150) * u;
  if (heading) {
    const s = fitOne(
      ctx,
      heading,
      (n) => `${n}px ${CHUNKY}`,
      210 * u,
      70 * u,
      colW * 0.84,
    );
    ctx.fillStyle = CREAM;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(heading, cx, y + s * 0.78);
    y += s * 0.8;
  }
  if (script) {
    const s = fitOne(
      ctx,
      script,
      (n) => `${n}px ${SCRIPT}`,
      200 * u,
      60 * u,
      colW * 0.66,
    );
    ctx.save();
    ctx.translate(cx, y + s * 0.62);
    ctx.rotate(-0.07);
    ctx.fillStyle = CREAM;
    ctx.textAlign = "center";
    ctx.fillText(script, 0, 0);
    // Swash under the word.
    ctx.strokeStyle = CREAM;
    ctx.lineWidth = 7 * u;
    ctx.lineCap = "round";
    const sw = ctx.measureText(script).width;
    ctx.beginPath();
    ctx.moveTo(-sw * 0.1, s * 0.3);
    ctx.quadraticCurveTo(sw * 0.3, s * 0.4, sw * 0.62, s * 0.18);
    ctx.stroke();
    ctx.restore();
    y += s * 1.05;
  }

  // Snowflakes.
  const flakes = wide
    ? [
        [0.47, 0.55, 26],
        [0.47, 0.1, 40],
        [0.03, 0.62, 28],
        [0.96, 0.9, 30],
      ]
    : [
        [0.1, 0.3, 34],
        [0.92, 0.06, 40],
        [0.1, 0.68, 32],
        [0.88, 0.68, 26],
      ];
  for (const [fx, fy, r] of flakes) snowflake(ctx, fx * w, fy * h, r * u);

  // Footer: tagline, place box, bottom line (from the bottom up).
  const pad = 60 * u;
  let bottom = h - (wide ? 70 : h > w * 1.6 ? 170 : 60) * u;
  if (footer) {
    const s = fitOne(
      ctx,
      footer,
      (n) => `${n}px ${CHUNKY}`,
      34 * u,
      20 * u,
      colW - 2 * pad,
    );
    ctx.fillStyle = CREAM;
    ctx.textAlign = "center";
    ctx.fillText(footer, cx, bottom);
    bottom -= s * 1.6;
  }
  if (where) {
    const s = fitOne(
      ctx,
      where,
      (n) => `${n}px ${CHUNKY}`,
      48 * u,
      24 * u,
      colW * 0.78,
    );
    const bw = Math.min(colW - 2 * pad, ctx.measureText(where).width + 80 * u);
    const bh = s * 1.6;
    ctx.fillStyle = CREAM;
    ctx.fillRect(cx - bw / 2, bottom - bh, bw, bh);
    ctx.fillStyle = SAGE;
    ctx.textBaseline = "middle";
    ctx.fillText(where, cx, bottom - bh / 2 + s * 0.05);
    ctx.textBaseline = "alphabetic";
    bottom -= bh + 28 * u;
  }
  if (tagline) {
    const s = fitOne(
      ctx,
      tagline,
      (n) => `${n}px ${CHUNKY}`,
      70 * u,
      30 * u,
      colW - 2 * pad,
    );
    ctx.fillStyle = CREAM;
    ctx.fillText(tagline, cx, bottom);
    bottom -= s * 1.25;
  }

  // Middle: the picture area.
  let mx0: number, mx1: number, my0: number, my1: number;
  let dateBottom = 0;
  if (wide) {
    mx0 = w * 0.52;
    mx1 = w - 60 * u;
    my0 = 70 * u;
    my1 = h - 90 * u;
    // Date and time sit in the words column, between heading and footer.
    const mid = (y + bottom) / 2;
    const ds = 74 * u;
    stack(ctx, date, colX + colW * 0.28, mid - ds * 0.2, ds);
    stack(ctx, time, colX + colW * 0.72, mid - ds * 0.2, ds);
  } else {
    mx0 = 0;
    mx1 = w;
    my0 = y + 20 * u;
    my1 = bottom - 30 * u;
    const ds = 76 * u;
    stack(ctx, date, w * 0.15, my0 + ds * 0.8, ds);
    stack(ctx, time, w * 0.85, my0 + ds * 0.8, ds);
    dateBottom = my0 + ds * 1.9;
  }
  const roomW = mx1 - mx0;
  const mcx = (mx0 + mx1) / 2;
  // Between the date and the time the picture can be 0.58 of the width; a
  // wider one goes below them.
  const narrow = wide ? roomW * 0.86 : w * 0.58;
  const tall = h > w * 1.6;

  // Picture box size.
  let bw: number, bh: number;
  let top = my0;
  if (photo) {
    const ratio = o.shape === "portrait" ? 4 / 5 : 3 / 2;
    const maxW = wide ? roomW * 0.86 : tall ? w * 0.8 : w * 0.72;
    if (!wide && maxW > narrow) top = Math.max(my0, dateBottom);
    bw = Math.min(maxW, (my1 - top) * 0.88 * ratio);
    if (!wide && bw <= narrow) top = my0;
    bh = bw / ratio;
  } else {
    bw = Math.min(wide ? roomW * 0.8 : narrow, (my1 - my0) * 1.1);
    bh = Math.min((my1 - my0) * 0.86, bw);
  }
  const roomH = my1 - top;
  const bx = mcx - bw / 2;
  const by = top + (roomH - bh) / 2 - (wide ? 0 : 6 * u);

  // Checkered bands behind, on both sides of the picture.
  const sq = 42 * u;
  const cy = by + bh * 0.56 - sq * 1.5;
  checks(ctx, wide ? mx0 - 40 * u : 0, bx, cy, sq);
  checks(ctx, bx + bw, w, cy, sq);

  // Ground shadow.
  ctx.fillStyle = BROWN;
  ctx.beginPath();
  ctx.ellipse(
    mcx,
    by + bh + (photo ? 32 : 12) * u,
    bw * 0.62,
    Math.max(18 * u, bh * 0.06),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  if (photo) framed(ctx, photo, bx, by, bw, bh, u);
  else baubles(ctx, mcx, by, by + bh, u);

  // Logo mark, small, top left.
  if (o.mark) {
    const m = 74 * u;
    ctx.globalAlpha = 0.95;
    ctx.drawImage(o.mark, 36 * u, 36 * u, m, m);
    ctx.globalAlpha = 1;
  }
}
