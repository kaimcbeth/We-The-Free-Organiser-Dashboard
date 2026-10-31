// The "Poster" style for the graphic maker: big bold heading, a hand-drawn
// ring around the day, a rounded photo, a script tagline, time and place
// staggered, and a ruled footer. Drawn on a grainy navy background in
// We The Free colours. Based on a template Kai sent (1 Nov 2026).

const NAVY = "#071130";
const PINK = "#ff47b9";
const YELLOW = "#ffd90f";

const DISPLAY = '"WTF Display", "Arial Black", sans-serif';
const SCRIPT = '"WTF Script", "Brush Script MT", cursive';

let fontsReady: Promise<void> | null = null;
// Archivo Black (headings) and Yellowtail (tagline), from /public/fonts.
export function loadPosterFonts() {
  fontsReady ??= Promise.all([
    new FontFace("WTF Display", "url(/fonts/archivo-black.woff2)").load(),
    new FontFace("WTF Script", "url(/fonts/yellowtail.woff2)").load(),
  ])
    .then((faces) => faces.forEach((f) => document.fonts.add(f)))
    .catch(() => {
      fontsReady = null;
    });
  return fontsReady;
}

export type PosterEvent = {
  title: string;
  startsAt: string;
  endsAt: string | null;
  venue: string | null;
  address: string | null;
  typeName: string | null;
  community: string | null;
};

export type PosterText = {
  heading: string;
  tagline: string;
  badge: [string, string];
  left: string | null;
  right: string | null;
  footer: string | null; // null = no footer (rules and text left off)
};

const fmt = (iso: string, tz: string, o: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-AU", { timeZone: tz, ...o }).format(
    new Date(iso),
  );
const time = (iso: string, tz: string) =>
  fmt(iso, tz, { hour: "numeric", minute: "2-digit" })
    .replace(/\s/g, "")
    .toUpperCase();

// What the poster says, unless the organiser types their own heading/tagline.
export function posterDefaults(e: PosterEvent, recap: boolean) {
  const movie = e.typeName?.toLowerCase() === "movie challenge";
  const heading = movie ? "3 Minute Movie Challenge" : e.title;
  const type = e.typeName?.trim();
  const tagline = recap
    ? "Thanks for coming"
    : movie
      ? "Vegan Outreach"
      : type && !e.title.toLowerCase().includes(type.toLowerCase())
        ? type
        : "Everyone welcome";
  return { heading, tagline };
}

export function posterText(
  e: PosterEvent,
  tz: string,
  recap: boolean,
  heading: string,
  tagline: string,
  footer = "", // the organiser's own footer; empty = the default
  noFooter = false,
): PosterText {
  const d = posterDefaults(e, recap);
  const tag = tagline.trim() || d.tagline;
  const first = recap
    ? "THANK YOU"
    : /everyone/i.test(tag)
      ? "NO EXPERIENCE NEEDED"
      : "EVERYONE IS WELCOME";
  return {
    heading: (heading.trim() || d.heading).toUpperCase(),
    tagline: tag,
    badge: [
      fmt(e.startsAt, tz, { weekday: "long" }).toUpperCase(),
      fmt(e.startsAt, tz, { day: "numeric", month: "long" }).toUpperCase(),
    ],
    left: recap
      ? null
      : e.endsAt
        ? `${time(e.startsAt, tz)} – ${time(e.endsAt, tz)}`
        : time(e.startsAt, tz),
    right: (e.venue ?? e.address)?.toUpperCase() ?? null,
    footer: noFooter
      ? null
      : footer.trim().toUpperCase() ||
        [first, e.community?.toUpperCase(), "ACTIVISM.WTF"]
          .filter(Boolean)
          .join("  |  "),
  };
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
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

// Largest size (from start down to min) at which text fits on one line.
function fit(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: (s: number) => string,
  start: number,
  min: number,
  max: number,
) {
  let s = start;
  for (; s > min; s -= 2) {
    ctx.font = font(s);
    if (ctx.measureText(text).width <= max) break;
  }
  ctx.font = font(s);
  return s;
}

function cover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / s;
  const sh = h / s;
  ctx.drawImage(
    img,
    (img.naturalWidth - sw) / 2,
    (img.naturalHeight - sh) / 2,
    sw,
    sh,
    x,
    y,
    w,
    h,
  );
}

// Fine film grain, the same every time (seeded), so redraws don't shimmer.
let grainTile: HTMLCanvasElement | null = null;
function grain(ctx: CanvasRenderingContext2D, w: number, h: number) {
  if (!grainTile) {
    grainTile = document.createElement("canvas");
    grainTile.width = grainTile.height = 256;
    const g = grainTile.getContext("2d")!;
    const data = g.createImageData(256, 256);
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < data.data.length; i += 4) {
      const v = rnd() < 0.5 ? 0 : 255;
      data.data[i] = data.data[i + 1] = data.data[i + 2] = v;
      data.data[i + 3] = Math.round(rnd() * 22);
    }
    g.putImageData(data, 0, 0);
  }
  const p = ctx.createPattern(grainTile, "repeat");
  if (!p) return;
  ctx.fillStyle = p;
  ctx.fillRect(0, 0, w, h);
}

// A loose, hand-drawn loop: one and a bit times round, slightly growing.
function scribble(
  ctx: CanvasRenderingContext2D,
  rx: number,
  ry: number,
  lw: number,
) {
  ctx.strokeStyle = PINK;
  ctx.lineWidth = lw;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  const turns = Math.PI * 2 * 1.22;
  for (let a = 0; a <= turns; a += 0.04) {
    const t = a - 2.6;
    const k = 0.95 + (0.1 * a) / turns;
    const x = Math.cos(t) * rx * k * (1 + 0.015 * Math.sin(3 * t));
    const y = Math.sin(t) * ry * k + (a / turns) * lw * 1.2;
    if (a === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function photos(
  ctx: CanvasRenderingContext2D,
  imgs: HTMLImageElement[],
  mark: HTMLImageElement | null,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  gap: number,
) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.clip();
  if (imgs.length === 0) {
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(x, y, w, h);
    if (mark) {
      const mh = Math.min(h * 0.6, w * 0.5);
      const mw = (mark.width / mark.height) * mh;
      ctx.drawImage(mark, x + (w - mw) / 2, y + (h - mh) / 2, mw, mh);
    }
  } else if (imgs.length === 1) cover(ctx, imgs[0], x, y, w, h);
  else {
    // Lead photo big on the left, up to two more stacked on the right.
    const rest = imgs.slice(1, 3);
    const lw = (w - gap) * 0.62;
    cover(ctx, imgs[0], x, y, lw, h);
    const ch = (h - gap * (rest.length - 1)) / rest.length;
    rest.forEach((img, i) =>
      cover(ctx, img, x + lw + gap, y + i * (ch + gap), w - lw - gap, ch),
    );
  }
  ctx.restore();
}

export function drawPoster(
  canvas: HTMLCanvasElement,
  o: {
    w: number;
    h: number;
    text: PosterText;
    imgs: HTMLImageElement[];
    logo: HTMLImageElement | null;
    mark: HTMLImageElement | null;
    font: string;
  },
) {
  const { w, h, text: t, font } = o;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const wide = w > h;
  const u = wide ? h / 1005 : w / 1080;
  const body = (weight: number) => (s: number) => `${weight} ${s}px ${font}`;

  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, w, h);
  grain(ctx, w, h);

  // The text column: the whole width (post, story) or the left half (cover).
  const pad = (wide ? 90 : 120) * u;
  const colL = pad;
  const colR = wide ? w * 0.5 : w - pad;
  const colW = colR - colL;

  // Logo and community name.
  let y = (wide ? 70 : 85) * u;
  const logoH = 64 * u;
  ctx.textBaseline = "middle";
  if (o.logo) {
    const lw = (o.logo.width / o.logo.height) * logoH;
    ctx.drawImage(o.logo, colL, y, lw, logoH);
  } else {
    ctx.fillStyle = PINK;
    ctx.font = body(800)(30 * u);
    ctx.fillText("WE THE FREE", colL, y + logoH / 2);
  }
  y += logoH + (wide ? 40 : 55) * u;

  // Heading: as big as fits in three lines.
  const headMax = colW * 0.86;
  // Leave the photo room: the heading takes at most this much height.
  const maxBlock = wide ? h * 0.4 : Math.min(h * 0.25, 340 * u);
  let hs = (wide ? 118 : 150) * u;
  let heads: string[] = [];
  for (; hs > 60 * u; hs -= 4 * u) {
    ctx.font = `${hs}px ${DISPLAY}`;
    heads = wrap(ctx, t.heading, headMax);
    if (
      heads.length <= 3 &&
      heads.length * hs * 0.9 <= maxBlock &&
      heads.every((l) => ctx.measureText(l).width <= colW)
    )
      break;
  }
  ctx.font = `${hs}px ${DISPLAY}`;
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "alphabetic";
  const step = hs * 0.9;
  let base = y + hs * 0.74;
  heads.forEach((l, i) => {
    if (i) base += step;
    ctx.fillText(l, colL, base);
  });
  const widths = heads.map((l) => ctx.measureText(l).width);
  const headBottom = base + hs * 0.12;

  // From the bottom up: footer, time and place, tagline.
  const rule = Math.max(2, 3 * u);
  const rule2 = h - (wide ? 70 : 95) * u;
  // No footer: the time and place drop down to where the footer was.
  const rule1 = t.footer ? rule2 - 82 * u : rule2 + 10 * u;
  ctx.fillStyle = "#ffffff";
  if (t.footer) {
    ctx.fillRect(colL, rule1, colW, rule);
    ctx.fillRect(colL, rule2, colW, rule);
    fit(ctx, t.footer, body(700), 26 * u, 14 * u, colW);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(t.footer, (colL + colR) / 2, (rule1 + rule2 + rule) / 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  const ds = 54 * u;
  let detailTop = rule1 - 40 * u;
  if (t.right) {
    let rs = fit(ctx, t.right, body(800), ds, 38 * u, colW);
    let rl = [t.right];
    if (ctx.measureText(t.right).width > colW) {
      rs = 40 * u;
      ctx.font = body(800)(rs);
      rl = wrap(ctx, t.right, colW).slice(0, 2);
    }
    let b = rule1 - 50 * u - (rl.length - 1) * rs * 1.1;
    for (const l of rl) {
      ctx.fillText(l, colR - ctx.measureText(l).width, b);
      b += rs * 1.1;
    }
    detailTop = rule1 - 50 * u - (rl.length - 1) * rs * 1.1 - rs * 0.75;
  }
  if (t.left) {
    const ls = fit(ctx, t.left, body(800), ds, 36 * u, colW);
    const b = detailTop - (t.right ? 18 * u : 10 * u);
    ctx.fillText(t.left, colL, b);
    detailTop = b - ls * 0.75;
  }

  const ts = fit(
    ctx,
    t.tagline,
    (s) => `${s}px ${SCRIPT}`,
    (wide ? 76 : 84) * u,
    40 * u,
    colW * 0.9,
  );
  const tagBase = detailTop - (wide ? 48 : 62) * u;
  const tw = ctx.measureText(t.tagline).width;
  const tx = (colL + colR) / 2 - tw / 2;
  ctx.fillStyle = YELLOW;
  ctx.fillText(t.tagline, tx, tagBase);
  ctx.fillRect(tx, tagBase + 12 * u, tw, Math.max(2, 4 * u));
  const tagTop = tagBase - ts * 0.85;

  // Photo: between the heading and the tagline (or the right half on covers).
  const radius = 26 * u;
  const box = wide
    ? { x: w * 0.54, y: 70 * u, w: w * 0.46 - 70 * u, h: h - 140 * u }
    : {
        x: colL,
        y: headBottom + 40 * u,
        w: colW,
        h: Math.max(120 * u, tagTop - 40 * u - (headBottom + 40 * u)),
      };
  photos(ctx, o.imgs, o.mark, box.x, box.y, box.w, box.h, radius, 8 * u);

  // The hand-drawn ring around the day: beside the last heading line, or
  // over the photo's corner when the heading leaves no room.
  const bs = 36 * u;
  ctx.font = body(800)(bs);
  const rx =
    Math.max(...t.badge.map((l) => ctx.measureText(l).width)) / 2 + 62 * u;
  const ry = bs * 1.75;
  const right = wide ? box.x + box.w * 0.3 : w - 30 * u;
  // The lowest heading line with room beside it.
  let cx = Infinity;
  let cy = 0;
  for (let i = heads.length - 1; i >= 0; i--) {
    const x = colL + widths[i] + 30 * u + rx;
    if (x + rx <= right) {
      cx = x;
      cy = base - (heads.length - 1 - i) * step - hs * 0.4;
      break;
    }
  }
  if (cx === Infinity) {
    if (wide) {
      cx = box.x;
      cy = box.y + box.h - ry * 0.4;
    } else {
      cx = box.x + box.w - rx * 0.75;
      cy = box.y + ry * 0.15;
    }
  }
  const overPhoto =
    cx + rx > box.x &&
    cx - rx < box.x + box.w &&
    cy + ry > box.y &&
    cy - ry < box.y + box.h;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.16);
  if (overPhoto) {
    // Over a photo: a navy disc behind so the words stay readable.
    ctx.fillStyle = "rgba(7,17,48,0.82)";
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * 0.98, ry * 0.98, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  scribble(ctx, rx, ry, 5 * u);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(t.badge[0], 0, -bs * 0.55);
  ctx.fillText(t.badge[1], 0, bs * 0.6);
  ctx.restore();
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}
