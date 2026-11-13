import { grain } from "@/components/graphic-poster";
import { clock, sectionOf, type DeckSlide } from "@/lib/hangouts";

// One 16:9 hangout slide in the Hub's look (navy grain, pink / cyan / yellow,
// Archivo Black headings). `layoutSlide` works out every piece of text once,
// so the canvas (preview, Present, PDF) and the PowerPoint export put words in
// the same places.

export const SW = 1920;
export const SH = 1080;
const NAVY = "#071130";
const PINK = "#ff47b9";
const CYAN = "#2fd9df";
const YELLOW = "#ffd90f";
export const DISPLAY = '"WTF Display", "Arial Black", sans-serif';
export const BODY = '"Helvetica Neue", Arial, sans-serif';

export type TextBox = {
  lines: string[];
  x: number;
  y: number; // top
  w: number;
  size: number;
  lineH: number;
  display: boolean;
  bold?: boolean;
  colour: string;
  spacing?: number; // letter spacing, px
  align?: "left" | "right";
};

export type Dot = { x: number; y: number; r: number; colour: string };
export type Bar = {
  x: number;
  y: number;
  w: number;
  h: number;
  colour: string;
};

export type SlideLayout = {
  boxes: TextBox[];
  dots: Dot[];
  bars: Bar[];
  accent: string;
};

const PAD = 120;

function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: string,
  max: number,
) {
  ctx.font = font;
  const out: string[] = [];
  for (const para of text.split("\n")) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = "";
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (line && ctx.measureText(next).width > max) {
        out.push(line);
        line = w;
      } else line = next;
    }
    if (line) out.push(line);
  }
  return out;
}

// The biggest size (from start down to min) at which text fits in maxLines.
function fitLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  family: string,
  weight: string,
  max: number,
  maxLines: number,
  start: number,
  min: number,
) {
  for (let s = start; s >= min; s -= 4) {
    const lines = wrap(ctx, text, `${weight} ${s}px ${family}`, max);
    if (lines.length <= maxLines) return { size: s, lines };
  }
  return {
    size: min,
    lines: wrap(ctx, text, `${weight} ${min}px ${family}`, max),
  };
}

export function layoutSlide(
  ctx: CanvasRenderingContext2D,
  s: DeckSlide,
  o: { index: number; total: number; region: string },
): SlideLayout {
  const sec = sectionOf(s.section);
  const accent = sec.colour;
  const boxes: TextBox[] = [];
  const dots: Dot[] = [];
  const bars: Bar[] = [];
  const width = SW - 2 * PAD;

  // Kicker: section and the block's minutes.
  if (s.layout !== "title")
    boxes.push({
      lines: [
        `${sec.kicker}${s.layout === "agenda" ? "" : ` · ${s.minutes} MIN`}`,
      ],
      x: PAD,
      y: 104,
      w: width - 200,
      size: 34,
      lineH: 40,
      display: false,
      bold: true,
      colour: accent,
      spacing: 5,
    });

  // Footer.
  boxes.push({
    lines: [`WE THE FREE ${o.region.toUpperCase()} · ORGANISER HANGOUT`],
    x: PAD,
    y: SH - 92,
    w: width - 200,
    size: 24,
    lineH: 30,
    display: false,
    bold: true,
    colour: "rgba(255,255,255,0.55)",
    spacing: 3,
  });
  boxes.push({
    lines: [`${o.index + 1} / ${o.total}`],
    x: SW - PAD - 200,
    y: SH - 92,
    w: 200,
    size: 24,
    lineH: 30,
    display: false,
    bold: true,
    colour: "rgba(255,255,255,0.55)",
    align: "right",
  });

  if (s.layout === "title") {
    const head = fitLines(
      ctx,
      s.heading || " ",
      DISPLAY,
      "",
      width,
      3,
      170,
      80,
    );
    const lineH = Math.round(head.size * 1.08);
    const bodySize = 56;
    const total =
      head.lines.length * lineH + (s.body ? 40 + bodySize * 1.25 : 0);
    let y = Math.round((SH - total) / 2) - 20;
    boxes.push({
      lines: head.lines,
      x: PAD,
      y,
      w: width,
      size: head.size,
      lineH,
      display: true,
      colour: "#ffffff",
    });
    y += head.lines.length * lineH + 40;
    if (s.body)
      boxes.push({
        lines: wrap(ctx, s.body, `700 ${bodySize}px ${BODY}`, width),
        x: PAD,
        y,
        w: width,
        size: bodySize,
        lineH: Math.round(bodySize * 1.25),
        display: false,
        bold: true,
        colour: YELLOW,
      });
    bars.push({ x: PAD, y: y - 22, w: 160, h: 8, colour: PINK });
    return { boxes, dots, bars, accent };
  }

  if (s.layout === "question") {
    const head = fitLines(
      ctx,
      s.heading || " ",
      DISPLAY,
      "",
      width - 80,
      4,
      128,
      64,
    );
    const lineH = Math.round(head.size * 1.12);
    const bodySize = 50;
    const bodyLines = s.body
      ? wrap(ctx, s.body, `${bodySize}px ${BODY}`, width - 80)
      : [];
    const total =
      head.lines.length * lineH +
      (bodyLines.length ? 48 + bodyLines.length * bodySize * 1.3 : 0);
    let y = Math.max(200, Math.round((SH - total) / 2));
    boxes.push({
      lines: head.lines,
      x: PAD,
      y,
      w: width - 80,
      size: head.size,
      lineH,
      display: true,
      colour: "#ffffff",
    });
    y += head.lines.length * lineH + 48;
    if (bodyLines.length)
      boxes.push({
        lines: bodyLines,
        x: PAD,
        y,
        w: width - 80,
        size: bodySize,
        lineH: Math.round(bodySize * 1.3),
        display: false,
        colour: CYAN,
      });
    return { boxes, dots, bars, accent };
  }

  // Heading for list + agenda slides.
  const head = fitLines(ctx, s.heading || " ", DISPLAY, "", width, 2, 104, 60);
  const headH = Math.round(head.size * 1.1);
  boxes.push({
    lines: head.lines,
    x: PAD,
    y: 170,
    w: width,
    size: head.size,
    lineH: headH,
    display: true,
    colour: "#ffffff",
  });
  let y = 170 + head.lines.length * headH + 30;

  if (s.layout === "agenda") {
    const rows = s.agenda ?? [];
    const room = SH - 140 - y;
    const rowH = Math.min(
      92,
      Math.max(48, Math.floor(room / (rows.length || 1))),
    );
    const size = Math.min(46, Math.round(rowH * 0.52));
    for (const r of rows) {
      const c = sectionOf(r.section).colour;
      boxes.push({
        lines: [clock(r.at)],
        x: PAD,
        y: y + (rowH - size) / 2 - 4,
        w: 150,
        size: size * 0.8,
        lineH: size,
        display: false,
        bold: true,
        colour: "rgba(255,255,255,0.6)",
      });
      dots.push({ x: PAD + 175, y: y + rowH / 2, r: size * 0.26, colour: c });
      boxes.push({
        lines: [r.title],
        x: PAD + 215,
        y: y + (rowH - size) / 2 - 6,
        w: width - 215 - 220,
        size,
        lineH: size * 1.2,
        display: false,
        bold: true,
        colour: "#ffffff",
      });
      boxes.push({
        lines: [`${r.minutes} min`],
        x: SW - PAD - 220,
        y: y + (rowH - size) / 2 - 4,
        w: 220,
        size: size * 0.8,
        lineH: size,
        display: false,
        bold: true,
        colour: c,
        align: "right",
      });
      bars.push({
        x: PAD,
        y: y + rowH - 1,
        w: width,
        h: 2,
        colour: "rgba(255,255,255,0.12)",
      });
      y += rowH;
    }
    return { boxes, dots, bars, accent };
  }

  // List.
  if (s.body) {
    const lines = wrap(ctx, s.body, `44px ${BODY}`, width);
    boxes.push({
      lines,
      x: PAD,
      y,
      w: width,
      size: 44,
      lineH: 56,
      display: false,
      colour: CYAN,
    });
    y += lines.length * 56 + 34;
  } else y += 10;
  const points = (s.points ?? []).filter((p) => p.trim());
  const room = SH - 150 - y;
  let size = 56;
  let wrapped: string[][] = [];
  for (; size >= 30; size -= 2) {
    wrapped = points.map((p) =>
      wrap(ctx, p, `600 ${size}px ${BODY}`, width - 70),
    );
    const h = wrapped.reduce(
      (n, l) => n + l.length * size * 1.25 + size * 0.7,
      0,
    );
    if (h <= room) break;
  }
  const lh = Math.round(size * 1.25);
  wrapped.forEach((lines) => {
    dots.push({
      x: PAD + 16,
      y: y + lh / 2 + 2,
      r: size * 0.2,
      colour: accent,
    });
    boxes.push({
      lines,
      x: PAD + 60,
      y,
      w: width - 70,
      size,
      lineH: lh,
      display: false,
      bold: true,
      colour: "#ffffff",
    });
    y += lines.length * lh + Math.round(size * 0.7);
  });
  return { boxes, dots, bars, accent };
}

// Background only: navy, grain, a soft glow in the section colour and the
// logo. The PowerPoint export uses this as the slide picture under real text.
export function drawBackground(
  ctx: CanvasRenderingContext2D,
  accent: string,
  mark: HTMLImageElement | null,
) {
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, SW, SH);
  const g = ctx.createRadialGradient(SW - 160, 120, 20, SW - 160, 120, 760);
  g.addColorStop(0, `${accent}55`);
  g.addColorStop(1, `${accent}00`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SW, SH);
  grain(ctx, SW, SH);
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(SW - 70, 70, 250, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  if (mark) ctx.drawImage(mark, SW - PAD - 96, 80, 96, 96);
}

export function drawDecor(ctx: CanvasRenderingContext2D, l: SlideLayout) {
  for (const b of l.bars) {
    ctx.fillStyle = b.colour;
    ctx.fillRect(b.x, b.y, b.w, b.h);
  }
  for (const d of l.dots) {
    ctx.fillStyle = d.colour;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawBoxes(ctx: CanvasRenderingContext2D, l: SlideLayout) {
  ctx.textBaseline = "top";
  for (const b of l.boxes) {
    ctx.font = b.display
      ? `${b.size}px ${DISPLAY}`
      : `${b.bold ? 700 : 400} ${b.size}px ${BODY}`;
    ctx.fillStyle = b.colour;
    ctx.letterSpacing = `${b.spacing ?? 0}px`;
    ctx.textAlign = b.align ?? "left";
    const x = b.align === "right" ? b.x + b.w : b.x;
    b.lines.forEach((line, i) => {
      // Display type sits a little high in its box; nudge it to the middle.
      ctx.fillText(line, x, b.y + i * b.lineH + (b.lineH - b.size) / 2, b.w);
    });
  }
  ctx.letterSpacing = "0px";
  ctx.textAlign = "left";
}

export function drawHangoutSlide(
  canvas: HTMLCanvasElement,
  s: DeckSlide,
  o: {
    index: number;
    total: number;
    region: string;
    mark: HTMLImageElement | null;
  },
) {
  canvas.width = SW;
  canvas.height = SH;
  const ctx = canvas.getContext("2d")!;
  const l = layoutSlide(ctx, s, o);
  drawBackground(ctx, l.accent, o.mark);
  drawDecor(ctx, l);
  drawBoxes(ctx, l);
  return l;
}

export function loadMark(): Promise<HTMLImageElement | null> {
  return new Promise((done) => {
    const img = new Image();
    img.onload = () => done(img);
    img.onerror = () => done(null);
    img.src = "/brand/wtf-mark.png";
  });
}
