"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Sheet } from "@/components/sheet";
import { SaveToPlanner } from "@/components/save-to-planner";
import type { GraphicEvent } from "@/components/graphic-maker";
import { grain, loadPosterFonts } from "@/components/graphic-poster";
import { fmt, place, shortTitle } from "@/components/graphic-photo-styles";
import { SIGNUP_THEMES } from "@/components/signup-list";
import { saveFiles } from "@/lib/save-files";
import { drawMainPoster, loadMainPosterFonts } from "@/lib/main-poster";
import { createClient } from "@/lib/supabase/client";
import { eventKind } from "@/lib/insight-charts";
import { DISPLAY, PINK, bodyFont, loadImage } from "@/components/recap-maker";

// "What to bring" carousel (Kai, 26 Nov 2026, for the special event promo:
// "Make a template for the what to bring post and a generator button", then
// "Should be a carousel"): a cover, one slide per thing to bring (with an
// optional short note, "A plate to share - vegan, enough for a few"), and
// the whole ticked checklist, then the event's main promo poster last
// (Kai: "Always put the main promo poster at the end of the carousel"). Same colours as the sign-up list. The
// list is kept per event on this device.

const W = 1080;
const H = 1350;
type ThemeKey = keyof typeof SIGNUP_THEMES;
const MAX_ITEMS = 8;

type Texts = {
  kicker: string;
  heading: string;
  details: string;
  footer: string;
};
type Item = { emoji: string; text: string; note: string };

// A picture for each thing (Kai, 26 Nov 2026: "a bit more visual with the
// items"): the emoji a line starts with, else one guessed from the words.
const PICTURES: [RegExp, string][] = [
  [/plate|dish|food|share|salad|dessert/i, "🥗"],
  [/water/i, "💧"],
  [/\bhats?\b|sunscreen|sun ?cream|sunnies|sunglasses/i, "🧢"],
  [/\bsit\b|rug|towel|blanket|chair|\bmat\b/i, "🧺"],
  [/cup|cutlery|fork|bowl|container/i, "🍴"],
  [/friend|mate|someone/i, "🫶"],
  [/shoe|boots|feet/i, "👟"],
  [/phone|charge/i, "📱"],
  [/snack|lunch|fruit/i, "🍎"],
  [/layer|jacket|jumper|warm|coat/i, "🧥"],
  [/umbrella|rain/i, "☂️"],
  [/playlist|music|speaker|song/i, "🎶"],
  [/game|cards|frisbee|ball/i, "🥏"],
  [/drink|juice|kombucha/i, "🧃"],
  [/bag|bin|rubbish/i, "♻️"],
];
// One kind of list carousel (Kai, 26 Nov 2026): What to bring, then
// Animal-friendly NYE, sharing the same maker.
export type ListKind = {
  id: string; // localStorage keys: wtf-<id>-<event>, wtf-<id>-theme
  title: string; // sheet title + planner note
  defaultItems: (e: GraphicEvent, tz: string) => string;
  defaults: (e: GraphicEvent, tz: string) => Texts;
  countLine: (n: number) => string; // cover, bottom left
  tick: boolean; // tick badge on each thing's picture
  copyLead: (t: Texts, head: string) => string; // Copy as text opening line
  example: string; // help line under the list
};

export const pictureFor = (text: string) =>
  PICTURES.find(([re]) => re.test(text))?.[1] ?? "✨";
const LEADING_EMOJI =
  /^((?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:\uFE0F|\u200D(?:\p{Extended_Pictographic})|\p{Emoji_Modifier})*)\s*/u;

// Summer where the event is: Dec–Feb down south, Jun–Aug up north.
function isSummer(iso: string, tz: string) {
  const month = Number(fmt(iso, tz, { month: "numeric" }));
  const south = /^(Australia|Pacific\/Auckland|Pacific\/Chatham)/.test(tz);
  return south ? [12, 1, 2].includes(month) : [6, 7, 8].includes(month);
}

// Each line with its picture up front, so it's easy to swap.
const withPictures = (ls: string[]) =>
  ls.map((l) => `${pictureFor(l.split(" - ")[0])} ${l}`).join("\n");

function bringItems(e: GraphicEvent, tz: string): string {
  const kind = eventKind(e.typeName, e.title);
  const summer = isSummer(e.startsAt, tz);
  const weather = summer
    ? ["Water bottle - it'll be warm", "Hat and sunscreen"]
    : ["Water bottle", "A warm layer - it can get cool"];
  if (
    kind === "movie_challenge" ||
    kind === "outreach" ||
    kind === "demonstration"
  )
    return withPictures([
      ...weather,
      "Comfy shoes - you'll be on your feet",
      "A charged phone",
      "Snacks to keep you going",
      "A friend - everyone's welcome",
    ]);
  if (kind === "hike" || kind === "sanctuary")
    return withPictures([
      ...weather,
      "Closed shoes",
      "Snacks or lunch",
      "A friend - everyone's welcome",
    ]);
  return withPictures([
    "A plate to share - vegan, enough for a few",
    ...weather,
    "Something to sit on - a rug or towel",
    "Your own cup and cutlery - less waste",
    "A friend - everyone's welcome",
  ]);
}

function bringDefaults(e: GraphicEvent, tz: string): Texts {
  const day = fmt(e.startsAt, tz, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const time = fmt(e.startsAt, tz, { hour: "numeric", minute: "2-digit" })
    .replace(/\s/g, "")
    .replace(":00", "")
    .toLowerCase();
  const kind = eventKind(e.typeName, e.title);
  return {
    kicker: "What to bring",
    heading:
      kind === "movie_challenge"
        ? "3 Minute Movie Challenge"
        : shortTitle(e.title, e.community),
    details: [day, time, place(e)].filter(Boolean).join(" · "),
    footer:
      kind === "potluck" || kind === "social" || kind === "other"
        ? "No plate? Come anyway, there's always plenty."
        : "Forgot something? Come anyway.",
  };
}

// "A plate to share - vegan, enough for a few" → main text + note.
export function parseItems(text: string): Item[] {
  return text
    .split("\n")
    .map((l) => l.replace(/^\s*(?:[-•*]|\d+[.)])\s+/u, "").trim())
    .filter(Boolean)
    .slice(0, MAX_ITEMS)
    .map((l) => {
      const e = l.match(LEADING_EMOJI);
      const rest = e ? l.slice(e[0].length).trim() : l;
      const m = rest.match(/^(.+?)\s+[-–—]\s+(.+)$/);
      const text = (m ? m[1] : rest).trim();
      return {
        emoji: e ? e[1] : pictureFor(text),
        text,
        note: m ? m[2].trim() : "",
      };
    })
    .filter((i) => i.text);
}

export function listText(items: Item[], t: Texts, kind: ListKind = BRING) {
  const head = [t.heading, t.details].filter(Boolean).join(" · ");
  return [
    kind.copyLead(t, head),
    items
      .map((i) => `${i.emoji} ${i.text}${i.note ? ` (${i.note})` : ""}`)
      .join("\n"),
    t.footer,
  ]
    .filter(Boolean)
    .join("\n\n");
}

// Words onto lines that fit the width (at most `max` lines).
function lines(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  max: number,
) {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > width) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out.length > max ? null : out;
}

type Theme = (typeof SIGNUP_THEMES)[ThemeKey];

// Background, grain, glow and the logo top right (like the sign-up list).
function backdrop(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  th: Theme,
  theme: ThemeKey,
  mark: HTMLImageElement | null,
) {
  const m = 72;
  ctx.fillStyle = th.bg;
  ctx.fillRect(0, 0, w, h);
  grain(ctx, w, h);
  const glow = ctx.createRadialGradient(w, 0, 0, w, 0, w * 0.8);
  glow.addColorStop(0, `rgba(${th.glow},${theme === "navy" ? 0.22 : 0.35})`);
  glow.addColorStop(1, `rgba(${th.glow},0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  if (!mark) return;
  const mh = 76;
  const mw = (mark.naturalWidth / mark.naturalHeight) * mh;
  if (th.mark) {
    const tint = document.createElement("canvas");
    tint.width = Math.ceil(mw * 2);
    tint.height = Math.ceil(mh * 2);
    const t2 = tint.getContext("2d")!;
    t2.drawImage(mark, 0, 0, tint.width, tint.height);
    t2.globalCompositeOperation = "source-in";
    t2.fillStyle = th.mark;
    t2.fillRect(0, 0, tint.width, tint.height);
    ctx.drawImage(tint, w - m - mw, m - 8, mw, mh);
  } else ctx.drawImage(mark, w - m - mw, m - 8, mw, mh);
}

// Small line, heading and the date line; returns where it ended.
function header(
  ctx: CanvasRenderingContext2D,
  w: number,
  t: Texts,
  th: Theme,
  theme: ThemeKey,
  y: number,
  big: number,
) {
  const m = 72;
  const body = bodyFont();
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  if (t.kicker) {
    ctx.fillStyle = theme === "navy" ? PINK : th.text;
    ctx.font = `800 34px ${body}`;
    ctx.letterSpacing = "4px";
    ctx.fillText(t.kicker.toUpperCase(), m, y);
    ctx.letterSpacing = "0px";
    y += 30;
  }
  const hw = w - m * 2 - 90;
  let size = big;
  let heading: string[] | null = null;
  while (size >= 40) {
    ctx.font = `${size}px ${DISPLAY}`;
    heading = lines(ctx, t.heading, hw, big > 100 ? 3 : 2);
    if (heading) break;
    size -= 4;
  }
  ctx.fillStyle = th.text;
  for (const l of heading ?? [t.heading]) {
    y += size * 1.02;
    ctx.fillText(l, m, y);
  }
  if (t.details) {
    y += big > 100 ? 72 : 56;
    let ds = big > 100 ? 40 : 36;
    ctx.fillStyle = th.accent;
    ctx.font = `700 ${ds}px ${body}`;
    while (ds > 24 && ctx.measureText(t.details).width > w - m * 2) {
      ds -= 2;
      ctx.font = `700 ${ds}px ${body}`;
    }
    ctx.fillText(t.details, m, y);
  }
  return y;
}

// A ticked box with its top-left corner at x, y.
function tick(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  box: number,
  th: Theme,
) {
  ctx.fillStyle = th.fill;
  ctx.beginPath();
  ctx.roundRect(x, y, box, box, box * 0.26);
  ctx.fill();
  ctx.strokeStyle = th.fillText;
  ctx.lineWidth = Math.max(5, box * 0.12);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const cy = y + box / 2;
  ctx.beginPath();
  ctx.moveTo(x + box * 0.26, cy + box * 0.02);
  ctx.lineTo(x + box * 0.43, cy + box * 0.2);
  ctx.lineTo(x + box * 0.76, cy - box * 0.2);
  ctx.stroke();
}

// An emoji drawn as a picture in a soft circle of the theme's colour.
const EMOJI_FONT =
  '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
function picture(
  ctx: CanvasRenderingContext2D,
  emoji: string,
  cx: number,
  cy: number,
  r: number,
  th: Theme,
) {
  const halo = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.35);
  halo.addColorStop(0, `rgba(${th.ink},0.16)`);
  halo.addColorStop(1, `rgba(${th.ink},0)`);
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(${th.ink},0.1)`;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = th.fill;
  ctx.lineWidth = Math.max(4, r * 0.05);
  ctx.stroke();
  ctx.font = `${Math.round(r * 1.1)}px ${EMOJI_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#000";
  ctx.fillText(emoji, cx, cy + r * 0.06);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

// Slide 1: the event, how many things, "Swipe".
export function drawBringCover(
  ctx: CanvasRenderingContext2D,
  t: Texts,
  pics: string[],
  mark: HTMLImageElement | null,
  theme: ThemeKey = "navy",
  kind: ListKind = BRING,
) {
  const th = SIGNUP_THEMES[theme] ?? SIGNUP_THEMES.navy;
  const m = 72;
  const body = bodyFont();
  backdrop(ctx, W, H, th, theme, mark);
  // The things' pictures, scattered across the top half.
  const spots: [number, number, number][] = [
    [0.27, 0.2, 128],
    [0.62, 0.15, 104],
    [0.82, 0.36, 92],
    [0.47, 0.4, 112],
    [0.16, 0.45, 84],
    [0.72, 0.56, 76],
    [0.3, 0.63, 64],
    [0.9, 0.12, 60],
  ];
  pics.slice(0, spots.length).forEach((e, i) => {
    const [x, y, r] = spots[i];
    picture(ctx, e, W * x, H * 0.58 * y + 40, r, th);
  });
  // The heading block sits above the bottom line: measure it first.
  const probe = document.createElement("canvas").getContext("2d")!;
  const tall = header(probe, W, t, th, theme, 0, 132);
  header(ctx, W, t, th, theme, Math.max(620, H - 190 - tall), 132);
  ctx.textAlign = "left";
  ctx.fillStyle = th.text;
  ctx.font = `700 36px ${body}`;
  const line = kind.countLine(pics.length);
  ctx.fillText(line, m, H - 96);
  ctx.textAlign = "right";
  ctx.fillStyle = theme === "navy" ? PINK : th.text;
  ctx.font = `800 36px ${body}`;
  ctx.fillText("Swipe →", W - m, H - 96);
  ctx.textAlign = "left";
}

// One slide per thing: a big tick, the thing, the note.
export function drawBringItem(
  ctx: CanvasRenderingContext2D,
  t: Texts,
  it: Item,
  n: number,
  of: number,
  mark: HTMLImageElement | null,
  theme: ThemeKey = "navy",
  kind: ListKind = BRING,
) {
  const th = SIGNUP_THEMES[theme] ?? SIGNUP_THEMES.navy;
  const ink = (a: number) => `rgba(${th.ink},${a})`;
  const m = 72;
  const body = bodyFont();
  backdrop(ctx, W, H, th, theme, mark);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = theme === "navy" ? PINK : th.text;
  ctx.font = `800 34px ${body}`;
  ctx.letterSpacing = "4px";
  ctx.fillText((t.kicker || kind.title).toUpperCase(), m, m + 30);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = ink(0.6);
  ctx.font = `700 32px ${body}`;
  ctx.fillText(`${n} / ${of}`, m, m + 80);

  // The thing: as big as fits on up to 3 lines.
  const tw = W - m * 2;
  let size = 120;
  let words: string[] | null = null;
  while (size >= 56) {
    ctx.font = `${size}px ${DISPLAY}`;
    words = lines(ctx, it.text, tw, 3);
    if (words) break;
    size -= 6;
  }
  words ??= [it.text];
  const noteSize = 46;
  // The picture, same spot on every slide, with a tick badge.
  const r = 220;
  const cx = W / 2;
  const cy = 450;
  picture(ctx, it.emoji, cx, cy, r, th);
  const badge = 96;
  if (kind.tick) tick(ctx, cx + r * 0.62, cy + r * 0.62 - badge / 2, badge, th);
  let y = cy + r + 70;
  ctx.textAlign = "center";
  ctx.fillStyle = th.text;
  for (const l of words) {
    y += size * 0.86;
    ctx.font = `${size}px ${DISPLAY}`;
    ctx.fillText(l, W / 2, y);
    y += size * 0.18;
  }
  if (it.note) {
    y += noteSize * 1.2;
    let ns = noteSize;
    ctx.font = `700 ${ns}px ${body}`;
    while (ns > 24 && ctx.measureText(it.note).width > tw) {
      ns -= 2;
      ctx.font = `700 ${ns}px ${body}`;
    }
    ctx.fillStyle = th.accent;
    ctx.fillText(it.note, W / 2, y);
  }
  // The event at the bottom.
  ctx.fillStyle = ink(0.6);
  ctx.font = `700 30px ${body}`;
  const foot = [t.heading, t.details].filter(Boolean).join(" · ");
  let fs = 30;
  while (fs > 20 && ctx.measureText(foot).width > tw) {
    fs -= 1;
    ctx.font = `700 ${fs}px ${body}`;
  }
  ctx.fillText(foot, W / 2, H - 80);
  ctx.textAlign = "left";
}

// Last slide: the whole list, ticked.
export function drawWhatToBring(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: Texts,
  items: Item[],
  mark: HTMLImageElement | null,
  theme: ThemeKey = "navy",
) {
  const th = SIGNUP_THEMES[theme] ?? SIGNUP_THEMES.navy;
  const ink = (a: number) => `rgba(${th.ink},${a})`;
  const body = bodyFont();
  const story = h > 1500;
  const m = 72;
  backdrop(ctx, w, h, th, theme, mark);
  const y = header(ctx, w, t, th, theme, m + 30, story ? 104 : 92);

  // The checklist.
  const footH = t.footer ? 130 : 60;
  const top = y + (story ? 70 : 54);
  const bottom = h - footH;
  const n = Math.max(1, items.length);
  const rowH = Math.min(story ? 170 : 130, (bottom - top) / n);
  const top0 = top + (story ? (bottom - top - rowH * n) / 2 : 0);
  const box = Math.round(Math.min(76, rowH * 0.6));
  const textX = m + box + 32;
  const maxW = w - m - textX;
  items.forEach((it, i) => {
    const cy = top0 + i * rowH + rowH / 2;
    if (i > 0) {
      ctx.fillStyle = ink(0.12);
      ctx.fillRect(textX, top0 + i * rowH, w - m - textX, 2);
    }
    picture(ctx, it.emoji, m + box / 2, cy, box * 0.56, th);

    let s = Math.round(Math.min(story ? 50 : 44, rowH * 0.36));
    ctx.font = `800 ${s}px ${body}`;
    while (s > 22 && ctx.measureText(it.text).width > maxW) {
      s -= 2;
      ctx.font = `800 ${s}px ${body}`;
    }
    const ns = Math.round(s * 0.66);
    ctx.textBaseline = "middle";
    ctx.fillStyle = th.text;
    if (it.note) {
      ctx.fillText(it.text, textX, cy - ns * 0.62);
      let nsz = ns;
      ctx.font = `600 ${nsz}px ${body}`;
      while (nsz > 16 && ctx.measureText(it.note).width > maxW) {
        nsz -= 1;
        ctx.font = `600 ${nsz}px ${body}`;
      }
      ctx.fillStyle = ink(0.68);
      ctx.fillText(it.note, textX, cy + s * 0.58);
    } else ctx.fillText(it.text, textX, cy + 1);
    ctx.textBaseline = "alphabetic";
  });

  if (t.footer) {
    ctx.textAlign = "center";
    ctx.fillStyle = th.text;
    ctx.font = `700 34px ${body}`;
    ctx.fillText(t.footer, w / 2, h - 64);
    ctx.textAlign = "left";
  }
}

type MakerProps = {
  event: GraphicEvent & { teamId: string; eventId: string };
  tz: string;
  planDay?: string;
  label?: string;
  className?: string;
};

export function WhatToBringMaker(p: MakerProps) {
  return <ListCarouselMaker {...p} kind={BRING} />;
}

export function ListCarouselMaker({
  event,
  tz,
  planDay,
  kind,
  label = `${kind.title} post`,
  className = "text-xs font-medium text-pink-ink hover:underline",
}: MakerProps & { kind: ListKind }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>
      {open && (
        <Maker
          event={event}
          tz={tz}
          planDay={planDay}
          kind={kind}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

type Saved = { items: string; texts: Texts };

type Poster = {
  event: GraphicEvent;
  tz: string;
  handle: string | null;
  kind: ListKind;
};

// Draws slide i of the carousel: 0 = cover, then the things, the list, and
// the event's main promo poster last.
function drawSlide(
  ctx: CanvasRenderingContext2D,
  i: number,
  t: Texts,
  items: Item[],
  mark: HTMLImageElement | null,
  theme: ThemeKey,
  poster: Poster,
) {
  if (i === 0)
    drawBringCover(
      ctx,
      t,
      items.map((x) => x.emoji),
      mark,
      theme,
      poster.kind,
    );
  else if (i <= items.length)
    drawBringItem(
      ctx,
      t,
      items[i - 1],
      i,
      items.length,
      mark,
      theme,
      poster.kind,
    );
  else if (i === items.length + 1)
    drawWhatToBring(ctx, W, H, t, items, mark, theme);
  else drawMainPoster(ctx.canvas, poster.event, poster.tz, poster.handle, mark);
}

function SlideCanvas({
  i,
  texts,
  itemsKey,
  mark,
  fonts,
  theme,
  poster,
}: {
  i: number;
  poster: Poster;
  texts: Texts;
  itemsKey: string;
  mark: HTMLImageElement | null;
  fonts: number;
  theme: ThemeKey;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (ctx)
      drawSlide(ctx, i, texts, JSON.parse(itemsKey), mark, theme, poster);
  }, [i, texts, itemsKey, mark, fonts, theme, poster]);
  return (
    <canvas
      ref={ref}
      width={W}
      height={H}
      className="h-auto w-56 shrink-0 snap-start rounded-xl shadow-sm ring-1 ring-black/10"
    />
  );
}

function Maker({
  event,
  tz,
  planDay,
  kind,
  onClose,
}: {
  event: GraphicEvent & { teamId: string; eventId: string };
  tz: string;
  planDay?: string;
  kind: ListKind;
  onClose: () => void;
}) {
  const key = `wtf-${kind.id}-${event.eventId}`;
  const [saved] = useState<Saved | null>(() => {
    try {
      const v = JSON.parse(localStorage.getItem(key) ?? "null") as Saved | null;
      return v && typeof v.items === "string" ? v : null;
    } catch {
      return null;
    }
  });
  const [theme, setTheme] = useState<ThemeKey>(() => {
    try {
      const v = localStorage.getItem(`wtf-${kind.id}-theme`) as ThemeKey | null;
      return v && v in SIGNUP_THEMES ? v : "navy";
    } catch {
      return "navy";
    }
  });
  const [texts, setTexts] = useState<Texts>(
    () => saved?.texts ?? kind.defaults(event, tz),
  );
  const [list, setList] = useState(
    () => saved?.items ?? kind.defaultItems(event, tz),
  );
  const [mark, setMark] = useState<HTMLImageElement | null>(null);
  const [fonts, setFonts] = useState(0);
  const [msg, setMsg] = useState("");
  const [files, setFiles] = useState<File[] | null>(null);
  const [handle, setHandle] = useState<string | null>(null);
  const poster = useMemo<Poster>(
    () => ({ event, tz, handle, kind }),
    [event, tz, handle, kind],
  );
  const items = parseItems(list);
  const itemsKey = JSON.stringify(items);
  const slides = items.length + 3;
  const tooMany = list.split("\n").filter((l) => l.trim()).length > MAX_ITEMS;

  useEffect(() => {
    let live = true;
    loadPosterFonts()?.then(() => live && setFonts((n) => n + 1));
    loadMainPosterFonts(event.title)?.then(
      () => live && setFonts((n) => n + 1),
    );
    createClient()
      .from("teams")
      .select("instagram_handle")
      .eq("id", event.teamId)
      .maybeSingle()
      .then(({ data }) => live && setHandle(data?.instagram_handle ?? null));
    loadImage("/brand/wtf-mark.png")
      .then((img) => live && setMark(img))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [event.title, event.teamId]);

  // Keep the list for this event on this device.
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify({ items: list, texts }));
    } catch {}
  }, [key, list, texts]);

  // The slides as files, ready before Share is tapped (phones only open the
  // share menu straight from a tap).
  useEffect(() => {
    let live = true;
    const id = window.setTimeout(async () => {
      const its = JSON.parse(itemsKey) as Item[];
      const out: File[] = [];
      for (let i = 0; i < its.length + 3; i++) {
        const c = document.createElement("canvas");
        c.width = W;
        c.height = H;
        drawSlide(c.getContext("2d")!, i, texts, its, mark, theme, poster);
        const b = await new Promise<Blob | null>((r) =>
          c.toBlob(r, "image/png"),
        );
        if (b)
          out.push(
            new File(
              [b],
              `what-to-bring-${String(i + 1).padStart(2, "0")}.png`,
              {
                type: "image/png",
              },
            ),
          );
      }
      if (live) setFiles(out);
    }, 500);
    return () => {
      live = false;
      window.clearTimeout(id);
    };
  }, [texts, itemsKey, mark, fonts, theme, poster]);

  const canShare =
    !!files &&
    typeof navigator !== "undefined" &&
    !!navigator.canShare?.({ files });
  async function share() {
    if (!files) return;
    setMsg("");
    try {
      await navigator.share({ files });
    } catch (e) {
      if ((e as Error).name !== "AbortError")
        setMsg("Couldn't open sharing here. Use Download instead.");
    }
  }
  async function copyText() {
    try {
      await navigator.clipboard.writeText(listText(items, texts, kind));
      setMsg("Copied the list as text.");
    } catch {
      setMsg("Couldn't copy the text.");
    }
  }

  const input =
    "mt-1 block w-full rounded-lg bg-white px-2.5 py-1.5 text-sm text-navy ring-1 ring-stone-300";
  const btn =
    "rounded-xl bg-navy/5 px-3 py-1.5 text-sm font-semibold text-navy hover:bg-navy/10 disabled:opacity-50";
  const field = (k: keyof Texts, lab: string) => (
    <label className="block text-xs font-medium text-stone-600">
      {lab}
      <input
        value={texts[k]}
        onChange={(e) => setTexts({ ...texts, [k]: e.target.value })}
        className={input}
      />
    </label>
  );

  return (
    <Sheet title={kind.title} onClose={onClose}>
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(SIGNUP_THEMES) as ThemeKey[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setTheme(k);
              try {
                localStorage.setItem(`wtf-${kind.id}-theme`, k);
              } catch {}
            }}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium ring-1 ${theme === k ? "bg-navy text-white ring-navy" : "bg-white text-stone-600 ring-stone-300"}`}
          >
            <span
              className="size-3.5 rounded-full ring-1 ring-black/15"
              style={{ background: SIGNUP_THEMES[k].swatch }}
            />
            {SIGNUP_THEMES[k].label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-stone-500">
        {slides} slides: a cover, one for each thing, the whole list, then the
        event poster.
      </p>
      <div className="mt-1.5 flex snap-x gap-2 overflow-x-auto pb-2">
        {Array.from({ length: slides }, (_, i) => (
          <SlideCanvas
            key={i}
            i={i}
            texts={texts}
            itemsKey={itemsKey}
            mark={mark}
            fonts={fonts}
            theme={theme}
            poster={poster}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {canShare && (
          <button
            type="button"
            onClick={share}
            className="rounded-xl bg-pink px-3 py-1.5 text-sm font-semibold text-navy hover:bg-pink-strong"
          >
            Share all {slides}
          </button>
        )}
        <button
          type="button"
          disabled={!files}
          onClick={() => files && saveFiles(files)}
          className={
            canShare
              ? btn
              : "rounded-xl bg-pink px-3 py-1.5 text-sm font-semibold text-navy hover:bg-pink-strong disabled:opacity-50"
          }
        >
          {files ? "Download" : "Getting the slides ready…"}
        </button>
        <button type="button" onClick={copyText} className={btn}>
          Copy as text
        </button>
        <SaveToPlanner
          teamId={event.teamId}
          tz={tz}
          day={planDay}
          eventId={event.eventId}
          note={`${kind.title}: ${texts.heading}`}
          caption={listText(items, texts, kind)}
          platforms={["instagram"]}
          getImages={async () => files ?? []}
          className={btn}
        />
      </div>
      {msg && <p className="mt-2 text-sm text-stone-600">{msg}</p>}

      <div className="mt-4 space-y-3">
        <div>
          <label
            htmlFor="bring-items"
            className="text-xs font-medium text-stone-600"
          >
            The list
          </label>
          <textarea
            id="bring-items"
            rows={7}
            value={list}
            onChange={(e) => setList(e.target.value)}
            className={input}
          />
          <p className="mt-1 text-xs text-stone-500">
            One thing per line, one slide each. Start a line with an emoji to
            change its picture, and add a short note after a dash, like &quot;
            {kind.example}&quot;. Up to {MAX_ITEMS} things.
          </p>
          {tooMany && (
            <p className="mt-1 text-xs font-medium text-pink-ink">
              Only the first {MAX_ITEMS} go in.
            </p>
          )}
          <button
            type="button"
            onClick={() => setList(kind.defaultItems(event, tz))}
            className="mt-1 text-xs text-stone-500 hover:text-navy hover:underline"
          >
            Back to the suggested list
          </button>
        </div>
        {field("kicker", "Small line")}
        {field("heading", "Heading")}
        {field("details", "Date, time and place")}
        {field("footer", "Bottom line (last slide)")}
        <button
          type="button"
          onClick={() => setTexts(kind.defaults(event, tz))}
          className="text-xs text-stone-500 hover:text-navy hover:underline"
        >
          Put the original words back
        </button>
      </div>
    </Sheet>
  );
}

export const BRING: ListKind = {
  id: "bring",
  title: "What to bring",
  defaultItems: bringItems,
  defaults: bringDefaults,
  countLine: (n) => `${n} thing${n === 1 ? "" : "s"} to bring`,
  tick: true,
  copyLead: (t, head) =>
    `${t.kicker || "What to bring"}${head ? ` for ${head}` : ""}:`,
  example: "Hat and sunscreen - it'll be hot",
};

// Animal-friendly NYE (Kai, 26 Nov 2026). Never fireworks (Kai, 5 Nov:
// not in line with veganism; never suggest them).
const yearAfter = (e: GraphicEvent, tz: string) => {
  const y = Number(fmt(e.startsAt, tz, { year: "numeric" }));
  const m = Number(fmt(e.startsAt, tz, { month: "numeric" }));
  return m === 12 ? y + 1 : y;
};
export const ANIMAL_FRIENDLY: ListKind = {
  id: "animal-nye",
  title: "Animal-friendly NYE",
  defaultItems: (e, tz) =>
    [
      "🌱 Celebrate with plant-based food - our potluck is all vegan",
      "🍾 Check your drinks are vegan - some wines are filtered with animal products",
      "🐾 Keep pets inside and close - with a quiet spot to retreat to",
      "🎈 Skip balloons and glitter - they end up in waterways",
      "♻️ Bring your own cup and plate - less waste, happier wildlife",
      `🌏 Make a resolution for the animals - try vegan for January ${yearAfter(e, tz)}`,
      "🫶 See the year out with us - everyone's welcome",
    ].join("\n"),
  defaults: (e, tz) => {
    const day = fmt(e.startsAt, tz, {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    const time = fmt(e.startsAt, tz, { hour: "numeric", minute: "2-digit" })
      .replace(/\s/g, "")
      .replace(":00", "")
      .toLowerCase();
    return {
      kicker: "Animal-friendly NYE",
      heading: "A kinder New Year's Eve",
      details: [day, time, place(e)].filter(Boolean).join(" · "),
      footer: `Start ${yearAfter(e, tz)} kind. Come along.`,
    };
  },
  countLine: (n) => `${n} way${n === 1 ? "" : "s"} to see the year out kindly`,
  tick: false,
  copyLead: (t) =>
    `${t.heading || "A kinder New Year's Eve"} 🐾${t.details ? `\nJoin us: ${t.details}` : ""}`,
  example: "Keep pets inside and close - with a quiet spot to retreat to",
};

// Which action opens which list carousel.
export const LIST_KINDS: Record<string, ListKind> = {
  special_bring: BRING,
  special_animal_friendly: ANIMAL_FRIENDLY,
};
