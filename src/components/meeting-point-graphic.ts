// Meeting point graphic (Kai, 11 Nov 2026: "pick a spot that then generates a
// graphic to go on socials for our meeting point at events"). A street map
// centred on the spot with a big pink pin, and a navy panel saying where
// exactly, when, and what for. Map tiles are CARTO's (OpenStreetMap data);
// both need crediting, so the credit is drawn on the map.

import { grain } from "@/components/graphic-poster";
import { fitLines, spaced } from "@/components/graphic-teaser";

const NAVY = "#071130";
const PINK = "#ff47b9";
const YELLOW = "#ffd90f";
const DISPLAY = '"WTF Display", "Arial Black", sans-serif';
const BODY = '"WTF Body", "Helvetica Neue", Arial, sans-serif';
const BOLD = '"WTF Bold", "Helvetica Neue", Arial, sans-serif';

export type MapLook = "light" | "dark";
export const MAP_LOOKS: { id: MapLook; label: string }[] = [
  { id: "light", label: "Light map" },
  { id: "dark", label: "Dark map" },
];
const TILES: Record<MapLook, string> = {
  light:
    "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
};
export const tileUrl = (look: MapLook) => TILES[look].replace("@2x", "{r}");
export const CREDIT = "© OpenStreetMap contributors © CARTO";

const TILE = 512; // @2x tiles, drawn at full size
const SUBS = ["a", "b", "c", "d"];

const tileCache = new Map<string, Promise<HTMLImageElement | null>>();
function loadTile(url: string) {
  let p = tileCache.get(url);
  if (!p) {
    p = new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
    tileCache.set(url, p);
  }
  return p;
}

// Web Mercator: world pixel position of a point at zoom z (512-px tiles).
function project(lat: number, lng: number, z: number) {
  const world = TILE * 2 ** z;
  const s = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * world,
    y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * world,
  };
}

// A map picture w × h with the point at (cx, cy). null if no tiles loaded.
export async function renderMap(
  lat: number,
  lng: number,
  zoom: number,
  w: number,
  h: number,
  cx: number,
  cy: number,
  look: MapLook,
): Promise<HTMLCanvasElement | null> {
  const z = Math.round(zoom);
  const p = project(lat, lng, z);
  const left = p.x - cx;
  const top = p.y - cy;
  const n = 2 ** z;
  const jobs: Promise<void>[] = [];
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = look === "dark" ? "#1b1d24" : "#f2efe9";
  ctx.fillRect(0, 0, w, h);
  let got = 0;
  for (let ty = Math.floor(top / TILE); ty * TILE < top + h; ty++) {
    if (ty < 0 || ty >= n) continue;
    for (let tx = Math.floor(left / TILE); tx * TILE < left + w; tx++) {
      const x = ((tx % n) + n) % n;
      const url = TILES[look]
        .replace("{s}", SUBS[(x + ty) % SUBS.length])
        .replace("{z}", String(z))
        .replace("{x}", String(x))
        .replace("{y}", String(ty));
      jobs.push(
        loadTile(url).then((img) => {
          if (!img) return;
          got++;
          ctx.drawImage(img, tx * TILE - left, ty * TILE - top, TILE, TILE);
        }),
      );
    }
  }
  await Promise.all(jobs);
  return got ? out : null;
}

export type MeetSize = "post" | "story";
export const MEET_SIZES: Record<
  MeetSize,
  { w: number; h: number; label: string; panel: number }
> = {
  post: { w: 1080, h: 1350, label: "Post", panel: 520 },
  story: { w: 1080, h: 1920, label: "Story", panel: 700 },
};

// Where the pin sits: the middle of the map area above the panel.
export const pinSpot = (size: MeetSize) => {
  const s = MEET_SIZES[size];
  const top = size === "story" ? 220 : 0; // stories: room for the profile bar
  return { x: s.w / 2, y: top + (s.h - s.panel - top) / 2 + 40 };
};

export type MeetTexts = {
  kicker: string;
  where: string;
  when: string;
  what: string;
  footer: string;
};

function pin(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Soft rings on the spot.
  for (const [r, a] of [
    [120, 0.12],
    [78, 0.2],
  ] as const) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 71, 185, ${a})`;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(x, y + 4, 26, 9, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(7, 17, 48, 0.35)";
  ctx.fill();
  // The pin: a teardrop with its tip on the spot.
  const r = 46;
  const head = y - 112;
  ctx.save();
  ctx.shadowColor = "rgba(7, 17, 48, 0.45)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(x - 18, y - 40, x - r, head + 40, x - r, head);
  ctx.arc(x, head, r, Math.PI, 0);
  ctx.bezierCurveTo(x + r, head + 40, x + 18, y - 40, x, y);
  ctx.closePath();
  ctx.fillStyle = PINK;
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, head, 17, 0, Math.PI * 2);
  ctx.fillStyle = NAVY;
  ctx.fill();
  // "Meet here" tag above the pin.
  ctx.font = `30px ${BOLD}`;
  const label = "MEET HERE";
  const tw = ctx.measureText(label).width + 6 * label.length;
  const ty = head - r - 76;
  ctx.fillStyle = NAVY;
  roundRect(ctx, x - tw / 2 - 26, ty, tw + 52, 58, 29);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  spaced(ctx, label, x + 3, ty + 31, 6);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawMeetingPoint(
  canvas: HTMLCanvasElement,
  o: {
    size: MeetSize;
    map: HTMLCanvasElement | null;
    t: MeetTexts;
    mark: HTMLImageElement | null;
    look: MapLook;
  },
) {
  const { w, h, panel } = MEET_SIZES[o.size];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const story = o.size === "story";

  // The map (or plain navy until it loads).
  if (o.map) ctx.drawImage(o.map, 0, 0, w, h);
  else {
    ctx.fillStyle = "#1d2748";
    ctx.fillRect(0, 0, w, h);
  }
  // A touch of navy over the map so it sits with the brand colours.
  ctx.fillStyle =
    o.look === "dark" ? "rgba(7,17,48,0.25)" : "rgba(7,17,48,0.06)";
  ctx.fillRect(0, 0, w, h - panel);

  const spot = pinSpot(o.size);
  pin(ctx, spot.x, spot.y);

  // Logo in a navy notch, top left.
  const top = story ? 220 : 0;
  if (o.mark) {
    const mh = 74;
    const mw = (o.mark.width / o.mark.height) * mh;
    ctx.fillStyle = NAVY;
    roundRect(ctx, 40, top + 40, mw + 52, mh + 40, 28);
    ctx.fill();
    ctx.drawImage(o.mark, 66, top + 60, mw, mh);
  }

  // Map credit, bottom right of the map.
  ctx.font = `20px ${BODY}`;
  const cw = ctx.measureText(CREDIT).width;
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fillRect(w - cw - 30, h - panel - 34, cw + 30, 34);
  ctx.fillStyle = "#3b4255";
  ctx.fillText(CREDIT, w - cw - 15, h - panel - 11);

  // The panel.
  const py = h - panel;
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, py, w, panel);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, py, w, panel);
  ctx.clip();
  grain(ctx, w, h);
  ctx.restore();
  ctx.fillStyle = PINK;
  ctx.fillRect(0, py, w, 10);

  const pad = 72;
  const max = w - pad * 2;
  let y = py + 92;
  if (o.t.kicker.trim()) {
    ctx.font = `32px ${BOLD}`;
    ctx.fillStyle = PINK;
    spaced(ctx, o.t.kicker.trim().toUpperCase(), pad, y, 7);
    y += 26;
  }
  const where = o.t.where.trim() || "Pick the spot";
  const fit = fitLines(
    ctx,
    where,
    (s) => `${s}px ${DISPLAY}`,
    story ? 96 : 84,
    44,
    max,
    3,
    1.08,
    story ? 300 : 200,
  );
  ctx.font = `${fit.size}px ${DISPLAY}`;
  ctx.fillStyle = "#ffffff";
  for (const line of fit.lines) {
    y += fit.size * 1.08;
    ctx.fillText(line, pad, y);
  }
  y += story ? 84 : 70;
  if (o.t.when.trim()) {
    ctx.font = `38px ${BOLD}`;
    ctx.fillStyle = YELLOW;
    ctx.fillText(o.t.when.trim(), pad, y, max);
    y += 50;
  }
  if (o.t.what.trim()) {
    ctx.font = `34px ${BODY}`;
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.fillText(o.t.what.trim(), pad, y, max);
  }
  if (o.t.footer.trim()) {
    ctx.font = `26px ${BOLD}`;
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    spaced(
      ctx,
      o.t.footer.trim().toUpperCase(),
      pad,
      h - (story ? 110 : 52),
      3,
    );
  }
}
