// Style 10 in the graphic maker (Kai, 13 Nov 2026: "a 3 format graphic
// generator template for vegan dinner in the park"; 3 format = landscape
// photo, portrait photo or no photo, like style 9). A warm evening in the
// park: deep green with grain, festoon lights strung across the top, a
// serif heading with a gold script line, the photo as a tilted polaroid
// (or, with no photo, a drawn sunset picnic in an arched window), and a
// pink-and-cream gingham picnic blanket along the bottom.

import { cover, grain } from "@/components/graphic-poster";
import {
  fmt,
  place,
  shortTitle,
  timeRange,
  type PhotoStyleEvent,
  type TextField,
  type Texts,
} from "@/components/graphic-photo-styles";
import type { XmasPhoto } from "@/components/graphic-christmas";

const SERIF = '"WTF Park Serif", Georgia, serif';
const SCRIPT = '"WTF Park Script", "Brush Script MT", cursive';
const SANS = '"WTF Park Sans", "Helvetica Neue", Arial, sans-serif';

const GREEN = "#163628";
const GREEN_LIGHT = "#2c5a43";
const LEAF = "#5f8f68";
const CREAM = "#f8eedb";
const GOLD = "#ffc94d";
const PINK = "#ff47b9";
const NAVY = "#071130";

let fontsReady: Promise<void> | null = null;
export function loadParkFonts() {
  fontsReady ??= Promise.all([
    new FontFace("WTF Park Serif", "url(/fonts/gloock.woff2)").load(),
    new FontFace("WTF Park Script", "url(/fonts/yellowtail.woff2)").load(),
    new FontFace("WTF Park Sans", "url(/fonts/poppins-semibold.woff2)").load(),
  ])
    .then((faces) => faces.forEach((f) => document.fonts.add(f)))
    .catch(() => {
      fontsReady = null;
    });
  return fontsReady;
}

export const isPark = (title: string) =>
  /\bpark\b|picnic/i.test(title) && /dinner|picnic|lunch|brunch/i.test(title);

export function parkFields(
  e: PhotoStyleEvent,
  tz: string,
  recap: boolean,
  handle: string | null,
): TextField[] {
  const short = shortTitle(e.title, e.community);
  // "Vegan Dinner In The Park" → "Vegan Dinner" + "in the Park".
  const m = short.match(/^(.*?)\s+(in the park|at the park)$/i);
  const city = (e.community ?? "")
    .replace(/^(we the free|wtf)\s+/i, "")
    .split(",")[0]
    .trim();
  return [
    {
      key: "kicker",
      label: "Small line at the top",
      value: `We The Free ${city}`.trim(),
    },
    { key: "heading", label: "Heading", value: m ? m[1] : short },
    {
      key: "script",
      label: "Script line",
      value: m ? m[2].toLowerCase().replace(/park$/, "Park") : "",
    },
    {
      key: "when",
      label: "Date and time",
      value: [
        fmt(e.startsAt, tz, {
          weekday: "short",
          day: "numeric",
          month: "short",
        }),
        recap ? "" : timeRange(e, tz),
      ]
        .filter(Boolean)
        .join(" · "),
      wide: true,
    },
    {
      key: "tagline",
      label: "What to bring",
      value: recap ? "Thanks for coming" : "Bring a plate · Bring a blanket",
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

function spaced(ctx: CanvasRenderingContext2D, px: number) {
  // letterSpacing isn't in every browser's canvas yet; it's only a nicety.
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing =
    `${px}px`;
}

// A strand of festoon lights hanging between two points.
function lights(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  sag: number,
  gap: number,
  u: number,
) {
  const cx = (x0 + x1) / 2;
  const cy = Math.max(y0, y1) + sag;
  const at = (t: number) => ({
    x: (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1,
    y: (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1,
  });
  ctx.strokeStyle = "rgba(10,20,15,0.85)";
  ctx.lineWidth = 3 * u;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(cx, cy, x1, y1);
  ctx.stroke();
  const n = Math.max(3, Math.round(Math.abs(x1 - x0) / gap));
  for (let i = 1; i < n; i++) {
    const p = at(i / n);
    const by = p.y + 22 * u;
    const glow = ctx.createRadialGradient(p.x, by, 0, p.x, by, 60 * u);
    glow.addColorStop(0, "rgba(255,214,120,0.55)");
    glow.addColorStop(1, "rgba(255,214,120,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(p.x - 60 * u, by - 60 * u, 120 * u, 120 * u);
    ctx.strokeStyle = "rgba(10,20,15,0.85)";
    ctx.lineWidth = 2.5 * u;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x, by - 12 * u);
    ctx.stroke();
    ctx.fillStyle = "#1b1b1b";
    ctx.fillRect(p.x - 5 * u, by - 14 * u, 10 * u, 8 * u);
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.ellipse(p.x, by, 9 * u, 12 * u, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.beginPath();
    ctx.ellipse(p.x - 3 * u, by - 3 * u, 2.5 * u, 4 * u, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// A little sprig of leaves.
function sprig(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  len: number,
  angle: number,
  colour: string,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = len * 0.03;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.1, -len * 0.5, 0, -len);
  ctx.stroke();
  for (let i = 1; i <= 4; i++) {
    const t = i / 5;
    const py = -len * t;
    const s = len * (0.26 - t * 0.08);
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(len * 0.06 * Math.sin(t * 3), py);
      ctx.rotate(side * 0.9);
      ctx.beginPath();
      ctx.ellipse(0, -s / 2, s * 0.28, s / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.beginPath();
  ctx.ellipse(0, -len - len * 0.08, len * 0.06, len * 0.11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Pink and cream gingham filling a box.
function gingham(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  sq: number,
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = CREAM;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "rgba(255,71,185,0.5)";
  for (let c = 0; c * sq < w; c += 2) ctx.fillRect(x + c * sq, y, sq, h);
  for (let r = 0; r * sq < h; r += 2) ctx.fillRect(x, y + r * sq, w, sq);
  ctx.restore();
}

// The blanket along the bottom, with a soft wavy top edge.
function blanket(
  ctx: CanvasRenderingContext2D,
  w: number,
  top: number,
  h: number,
  u: number,
) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, top);
  const waves = Math.max(3, Math.round(w / (360 * u)));
  for (let i = 0; i < waves; i++) {
    const a = (i / waves) * w;
    const b = ((i + 1) / waves) * w;
    ctx.quadraticCurveTo((a + b) / 2, top + (i % 2 ? 16 : -16) * u, b, top);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.clip();
  gingham(ctx, 0, top - 20 * u, w, h - top + 20 * u, 34 * u);
  // A shadow along the edge so it sits on the grass.
  const shade = ctx.createLinearGradient(0, top - 20 * u, 0, top + 40 * u);
  shade.addColorStop(0, "rgba(22,54,40,0.45)");
  shade.addColorStop(1, "rgba(22,54,40,0)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, top - 20 * u, w, 60 * u);
  ctx.restore();
}

// The photo as a slightly tilted polaroid.
function polaroid(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number,
  cy: number,
  pw: number,
  ph: number,
  u: number,
) {
  const side = 18 * u;
  const foot = 62 * u;
  const fw = pw + 2 * side;
  const fh = ph + side + foot;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.035);
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 40 * u;
  ctx.shadowOffsetY = 18 * u;
  ctx.fillStyle = CREAM;
  ctx.fillRect(-fw / 2, -fh / 2, fw, fh);
  ctx.shadowColor = "transparent";
  cover(ctx, img, -fw / 2 + side, -fh / 2 + side, pw, ph);
  // A strip of pink tape at the top.
  ctx.rotate(0.06);
  ctx.fillStyle = "rgba(255,71,185,0.8)";
  ctx.fillRect(-70 * u, -fh / 2 - 22 * u, 140 * u, 44 * u);
  ctx.restore();
}

// With no photo: a sunset picnic in an arched window.
function scene(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  u: number,
) {
  const r = w / 2;
  const arch = () => {
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.arc(x + r, y + r, r, Math.PI, 0);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
  };
  // Frame.
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 36 * u;
  ctx.shadowOffsetY = 16 * u;
  ctx.fillStyle = CREAM;
  const b = 16 * u;
  ctx.beginPath();
  ctx.moveTo(x - b, y + h + b);
  ctx.lineTo(x - b, y + r);
  ctx.arc(x + r, y + r, r + b, Math.PI, 0);
  ctx.lineTo(x + w + b, y + h + b);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.save();
  arch();
  ctx.clip();
  // Sky.
  const horizon = y + h * 0.62;
  const sky = ctx.createLinearGradient(0, y, 0, horizon);
  sky.addColorStop(0, "#3b2a6b");
  sky.addColorStop(0.45, "#e2559c");
  sky.addColorStop(0.8, "#ff9a5a");
  sky.addColorStop(1, GOLD);
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);
  // Sun, half set.
  const sr = w * 0.2;
  ctx.fillStyle = "#ffe08a";
  ctx.beginPath();
  ctx.arc(x + w * 0.5, horizon, sr, Math.PI, 0);
  ctx.fill();
  // Trees on the horizon.
  ctx.fillStyle = GREEN;
  const trees = [
    [0.08, 0.16],
    [0.2, 0.22],
    [0.32, 0.14],
    [0.74, 0.2],
    [0.88, 0.25],
    [1.0, 0.15],
  ];
  for (const [tx, ts] of trees) {
    const px = x + tx * w;
    const s = ts * w;
    ctx.fillRect(px - s * 0.06, horizon - s * 0.5, s * 0.12, s * 0.5);
    ctx.beginPath();
    ctx.arc(px, horizon - s * 0.72, s * 0.42, 0, Math.PI * 2);
    ctx.arc(px - s * 0.28, horizon - s * 0.5, s * 0.3, 0, Math.PI * 2);
    ctx.arc(px + s * 0.28, horizon - s * 0.5, s * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Grass.
  ctx.fillStyle = GREEN_LIGHT;
  ctx.fillRect(x, horizon, w, h);
  // The blanket in perspective with plates on it.
  const by0 = horizon + (y + h - horizon) * 0.22;
  const by1 = y + h + 4 * u;
  const topW = w * 0.5;
  const botW = w * 1.05;
  const mid = x + w / 2;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(mid - topW / 2, by0);
  ctx.lineTo(mid + topW / 2, by0);
  ctx.lineTo(mid + botW / 2, by1);
  ctx.lineTo(mid - botW / 2, by1);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = CREAM;
  ctx.fillRect(x, by0, w, by1 - by0);
  ctx.fillStyle = "rgba(255,71,185,0.5)";
  const cols = 9;
  for (let c = 0; c < cols; c += 2) {
    const t0 = c / cols;
    const t1 = (c + 1) / cols;
    ctx.beginPath();
    ctx.moveTo(mid - topW / 2 + topW * t0, by0);
    ctx.lineTo(mid - topW / 2 + topW * t1, by0);
    ctx.lineTo(mid - botW / 2 + botW * t1, by1);
    ctx.lineTo(mid - botW / 2 + botW * t0, by1);
    ctx.fill();
  }
  const rows = 5;
  for (let r2 = 0; r2 < rows; r2 += 2) {
    // Rows get taller towards the front.
    const f = (k: number) => by0 + (by1 - by0) * (k / rows) ** 1.4;
    ctx.fillRect(x, f(r2), w, f(r2 + 1) - f(r2));
  }
  ctx.restore();
  // Plates and a bowl.
  const plates = [
    [0.36, 0.42, 0.075],
    [0.62, 0.38, 0.07],
    [0.5, 0.72, 0.1],
    [0.26, 0.78, 0.09],
    [0.76, 0.74, 0.085],
  ];
  for (const [px, py, pr] of plates) {
    const cx = x + px * w;
    const cy = by0 + (by1 - by0) * py;
    const rr = pr * w;
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + rr * 0.12, rr, rr * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(cx, cy, rr, rr * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    // Food: a few colourful bits.
    const bits = ["#7fbf5a", "#ff8a3d", "#e2559c", GOLD];
    bits.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.ellipse(
        cx + (i - 1.5) * rr * 0.28,
        cy - rr * 0.04 + (i % 2) * rr * 0.1,
        rr * 0.16,
        rr * 0.08,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    });
  }
  ctx.restore();
}

// The small cream logo mark.
function logo(
  ctx: CanvasRenderingContext2D,
  mark: HTMLImageElement,
  x: number,
  y: number,
  m: number,
) {
  const tint = document.createElement("canvas");
  tint.width = tint.height = Math.round(m);
  const t2 = tint.getContext("2d")!;
  t2.drawImage(mark, 0, 0, m, m);
  t2.globalCompositeOperation = "source-in";
  t2.fillStyle = CREAM;
  t2.fillRect(0, 0, m, m);
  ctx.drawImage(tint, x, y);
}

export function drawPark(canvas: HTMLCanvasElement, o: Options) {
  const { w, h, t } = o;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const wide = w / h > 1.3;
  const story = h > w * 1.6;
  const u = (wide ? h : w) / 1080;
  const kicker = val(t.kicker).toUpperCase();
  const heading = val(t.heading);
  const script = val(t.script);
  const when = val(t.when).toUpperCase();
  const tagline = val(t.tagline).toUpperCase();
  const where = val(t.place);
  const footer = val(t.footer);
  const photo = o.shape === "none" ? null : o.photo;

  // Background: deep green, a touch lighter low down, with grain.
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#0f2a1f");
  bg.addColorStop(1, GREEN_LIGHT);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  // Warm glow under the lights.
  const glow = ctx.createRadialGradient(w / 2, 0, 0, w / 2, 0, w * 0.7);
  glow.addColorStop(0, "rgba(255,201,77,0.18)");
  glow.addColorStop(1, "rgba(255,201,77,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  grain(ctx, w, h);

  // Festoon lights across the top.
  const lt = (story ? 90 : 0) * u;
  lights(ctx, -40 * u, lt - 10 * u, w * 0.55, lt + 20 * u, 90 * u, 105 * u, u);
  lights(
    ctx,
    w * 0.45,
    lt + 20 * u,
    w + 40 * u,
    lt - 10 * u,
    110 * u,
    105 * u,
    u,
  );

  // The blanket along the bottom.
  const blanketH = (wide ? 80 : story ? 150 : 110) * u;
  blanket(ctx, w, h - blanketH, h, u);

  // Leaves in the bottom corners, over the blanket edge.
  sprig(ctx, 40 * u, h - blanketH + 30 * u, 190 * u, 0.35, LEAF);
  sprig(ctx, 90 * u, h - blanketH + 40 * u, 130 * u, 0.9, LEAF);
  sprig(ctx, w - 40 * u, h - blanketH + 30 * u, 190 * u, -0.35, LEAF);
  sprig(ctx, w - 90 * u, h - blanketH + 40 * u, 130 * u, -0.9, LEAF);

  if (o.mark) logo(ctx, o.mark, 34 * u, lt + 70 * u, 64 * u);

  // Words column: the whole width on posts and stories, the left part on
  // the wide cover.
  const colX = wide ? 60 * u : 0;
  const colW = wide ? w * 0.5 : w;
  const cx = colX + colW / 2;
  const pad = 70 * u;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  let y = (wide ? 190 : story ? 330 : 205) * u;
  if (kicker) {
    ctx.font = `${26 * u}px ${SANS}`;
    spaced(ctx, 6 * u);
    ctx.fillStyle = GOLD;
    ctx.fillText(kicker, cx, y);
    spaced(ctx, 0);
    y += 26 * u;
  }
  if (heading) {
    const s = fitOne(
      ctx,
      heading,
      (n) => `${n}px ${SERIF}`,
      (wide ? 150 : 140) * u,
      60 * u,
      colW - 2 * pad,
    );
    ctx.fillStyle = CREAM;
    ctx.fillText(heading, cx, y + s * 0.82);
    y += s * 0.92;
  }
  if (script) {
    const s = fitOne(
      ctx,
      script,
      (n) => `${n}px ${SCRIPT}`,
      (wide ? 130 : 120) * u,
      50 * u,
      (colW - 2 * pad) * 0.9,
    );
    ctx.save();
    ctx.translate(cx + 20 * u, y + s * 0.62);
    ctx.rotate(-0.05);
    ctx.fillStyle = GOLD;
    ctx.shadowColor = "rgba(255,201,77,0.45)";
    ctx.shadowBlur = 24 * u;
    ctx.fillText(script, 0, 0);
    ctx.restore();
    y += s * 0.9;
  }
  if (when) {
    y += 22 * u;
    const s = fitOne(
      ctx,
      when,
      (n) => `${n}px ${SANS}`,
      36 * u,
      20 * u,
      colW - 2 * pad,
    );
    spaced(ctx, 3 * u);
    const tw = ctx.measureText(when).width + 56 * u;
    ctx.fillStyle = PINK;
    ctx.beginPath();
    ctx.roundRect(cx - tw / 2, y, tw, s * 1.9, s);
    ctx.fill();
    ctx.fillStyle = NAVY;
    ctx.textBaseline = "middle";
    ctx.fillText(when, cx, y + s * 0.98);
    ctx.textBaseline = "alphabetic";
    spaced(ctx, 0);
    y += s * 1.9;
  }

  // The bottom line sits on the blanket in a green pill, leaving the
  // middle to the picture.
  if (footer) {
    const s = fitOne(
      ctx,
      footer,
      (n) => `${n}px ${SANS}`,
      26 * u,
      16 * u,
      colW - 2 * pad - 60 * u,
    );
    const fw = ctx.measureText(footer).width + 56 * u;
    const fh = s * 1.9;
    const fy = h - blanketH / 2 - fh / 2 + (story ? -20 : 6) * u;
    ctx.fillStyle = GREEN;
    ctx.beginPath();
    ctx.roundRect(cx - fw / 2, fy, fw, fh, fh / 2);
    ctx.fill();
    ctx.fillStyle = CREAM;
    ctx.textBaseline = "middle";
    ctx.fillText(footer, cx, fy + fh / 2 + s * 0.04);
    ctx.textBaseline = "alphabetic";
  }

  // Place and what to bring, from the bottom up.
  let bottom = h - blanketH - (wide ? 30 : story ? 60 : 34) * u;
  if (where) {
    const s = fitOne(
      ctx,
      where,
      (n) => `${n}px ${SANS}`,
      34 * u,
      18 * u,
      colW - 2 * pad - 80 * u,
    );
    const tw = ctx.measureText(where).width;
    const bw = tw + 96 * u;
    const bh = s * 1.9;
    ctx.fillStyle = CREAM;
    ctx.beginPath();
    ctx.roundRect(cx - bw / 2, bottom - bh, bw, bh, bh / 2);
    ctx.fill();
    // Pin.
    const px = cx - tw / 2 - 18 * u;
    const py = bottom - bh / 2;
    ctx.fillStyle = PINK;
    ctx.beginPath();
    ctx.arc(px, py - 4 * u, 11 * u, Math.PI, 0);
    ctx.lineTo(px, py + 14 * u);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = CREAM;
    ctx.beginPath();
    ctx.arc(px, py - 4 * u, 4 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = GREEN;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText(where, px + 22 * u, py + s * 0.04);
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    bottom -= bh + 26 * u;
  }
  if (tagline) {
    const s = fitOne(
      ctx,
      tagline,
      (n) => `${n}px ${SANS}`,
      32 * u,
      18 * u,
      colW - 2 * pad,
    );
    spaced(ctx, 4 * u);
    ctx.fillStyle = CREAM;
    ctx.fillText(tagline, cx, bottom);
    spaced(ctx, 0);
    bottom -= s * 1.6;
  }

  // The picture.
  let mx0: number, mx1: number, my0: number, my1: number;
  if (wide) {
    mx0 = w * 0.55;
    mx1 = w - 60 * u;
    my0 = 150 * u;
    my1 = h - blanketH - 30 * u;
  } else {
    mx0 = 0;
    mx1 = w;
    my0 = y + 44 * u;
    my1 = bottom - 30 * u;
  }
  const roomW = mx1 - mx0;
  const roomH = my1 - my0;
  const mcx = (mx0 + mx1) / 2;
  const mcy = (my0 + my1) / 2;
  if (photo) {
    const ratio = o.shape === "portrait" ? 4 / 5 : 3 / 2;
    // Room for the polaroid border (bigger at the bottom).
    const extraW = 36 * u;
    const extraH = 80 * u;
    const pw = Math.min(
      roomW * (wide ? 0.9 : 0.84) - extraW,
      (roomH - extraH) * ratio,
    );
    polaroid(ctx, photo, mcx, mcy, pw, pw / ratio, u);
  } else {
    const sw = Math.min(roomW * (wide ? 0.62 : 0.6), roomH * 0.8);
    const sh = Math.min(roomH - 20 * u, sw * 1.25);
    scene(ctx, mcx - sw / 2, mcy - sh / 2, sw, sh, u);
  }
}
