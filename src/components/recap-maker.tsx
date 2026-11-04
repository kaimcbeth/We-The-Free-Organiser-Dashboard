"use client";

import { useEffect, useRef, useState } from "react";
import { zipSync } from "fflate";
import { Sheet } from "@/components/sheet";
import { CaptionWriter, PhotoPicker } from "@/components/carousel-maker";
import { grain, loadPosterFonts } from "@/components/graphic-poster";
import { createClient } from "@/lib/supabase/client";
import { loadCommunityPhotos, type EventPhoto } from "@/lib/event-photos";

// Monthly photo recap carousel (Kai, 2 Nov 2026). Portrait 4:5, every photo
// full-bleed:
//   1. Cover: the first photo, with a big "OCTOBER RECAP".
//   2. One photo per slide, with its event's name, date, place and type.
//   3. "Coming up in November": next month's events.
// Opened from the monthly recap action or from photos selected in the
// Photo Hub. Photos marked "not for promo" are left out.

export const W = 1080;
export const H = 1350;
const MAX_PHOTOS = 18; // + cover text on the first, + the coming-up slide = 19
export const NAVY = "#071130";
export const PINK = "#ff47b9";
export const YELLOW = "#ffd90f";
export const DISPLAY = '"WTF Display", "Arial Black", sans-serif';
const URL_TEXT = "www.activism.wtf";

export type Pos = { x: number; y: number };
export const CENTRE: Pos = { x: 0.5, y: 0.45 };

export type RecapEvent = {
  id: string;
  title: string;
  startsAt: string;
  venue: string | null;
  address: string | null;
  typeName: string | null;
};

type Month = { year: number; month: number }; // month 1-12

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const nextMonth = (m: Month): Month =>
  m.month === 12
    ? { year: m.year + 1, month: 1 }
    : { year: m.year, month: m.month + 1 };
const prevMonth = (m: Month): Month =>
  m.month === 1
    ? { year: m.year - 1, month: 12 }
    : { year: m.year, month: m.month - 1 };
const ymOf = (iso: string, tz: string) => {
  const [y, m] = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
  })
    .format(new Date(iso))
    .split("-")
    .map(Number);
  return { year: y, month: m };
};
const same = (a: Month, b: Month) => a.year === b.year && a.month === b.month;

// "WTF SYDNEY" from "Sydney, Australia".
export const communityLabel = (name: string) =>
  `WE THE FREE ${name.split(",")[0].trim().toUpperCase()}`;

const place = (e: RecapEvent) =>
  e.venue?.trim() || e.address?.split(",")[0].trim() || "";

export const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });

export const bodyFont = () =>
  (typeof document !== "undefined" &&
    getComputedStyle(document.body).fontFamily) ||
  "system-ui, sans-serif";

// ---------- Drawing (always in 1080 × 1350 units) ----------

export function drawPhoto(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  pos: Pos,
) {
  const s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
  const pw = img.naturalWidth * s;
  const ph = img.naturalHeight * s;
  ctx.drawImage(img, (W - pw) * pos.x, (H - ph) * pos.y, pw, ph);
}

// Dark fade up from the bottom, so white text reads on any photo.
export function shade(
  ctx: CanvasRenderingContext2D,
  from: number,
  alpha: number,
) {
  const g = ctx.createLinearGradient(0, H * from, 0, H);
  g.addColorStop(0, "rgba(7,17,48,0)");
  g.addColorStop(0.55, `rgba(7,17,48,${alpha * 0.75})`);
  g.addColorStop(1, `rgba(7,17,48,${alpha})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, H * from, W, H * (1 - from));
}

export function logo(
  ctx: CanvasRenderingContext2D,
  mark: HTMLImageElement | null,
) {
  if (!mark) return;
  const mh = 72;
  const mw = (mark.naturalWidth / mark.naturalHeight) * mh;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 12;
  ctx.drawImage(mark, W - 48 - mw, 48, mw, mh);
  ctx.restore();
}

// Biggest size (up to max) at which the text fits the width.
export function fit(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: (size: number) => string,
  width: number,
  max: number,
  min = 20,
) {
  let size = max;
  ctx.font = font(size);
  while (size > min && ctx.measureText(text).width > width) {
    size -= 2;
    ctx.font = font(size);
  }
  return size;
}

// Up to `lines` lines, the last one cut with "…".
export function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  lines: number,
) {
  const words = text.split(/\s+/);
  const out: string[] = [];
  let line = "";
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(test).width <= width || !line) {
      line = test;
      continue;
    }
    out.push(line);
    line = words[i];
    if (out.length === lines - 1) {
      line = words.slice(i).join(" ");
      break;
    }
  }
  if (line) out.push(line);
  const last = out.length - 1;
  if (ctx.measureText(out[last]).width > width) {
    let t = out[last];
    while (t.length > 1 && ctx.measureText(`${t}…`).width > width)
      t = t.slice(0, -1);
    out[last] = `${t.trimEnd()}…`;
  }
  return out;
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  pos: Pos,
  m: Month,
  community: string,
  mark: HTMLImageElement | null,
) {
  drawPhoto(ctx, img, pos);
  shade(ctx, 0.35, 0.92);
  logo(ctx, mark);
  const x = 72;
  const width = W - 2 * x;
  const month = MONTHS[m.month - 1].toUpperCase();
  const display = (s: number) => `${s}px ${DISPLAY}`;
  const size = fit(ctx, month, display, width, 230, 120);
  const recapSize = Math.round(size * 0.78);
  ctx.textBaseline = "alphabetic";
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 16;
  // From the bottom up: community line, RECAP, month.
  let y = H - 96;
  ctx.font = `700 34px ${bodyFont()}`;
  ctx.fillStyle = "#ffffff";
  ctx.letterSpacing = "4px";
  ctx.fillText(`${community} · ${m.year}`, x, y);
  ctx.letterSpacing = "0px";
  y -= 60;
  ctx.font = display(recapSize);
  ctx.fillStyle = PINK;
  ctx.fillText("RECAP", x - 4, y);
  y -= Math.round(recapSize * 0.98);
  ctx.font = display(size);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(month, x - 6, y);
  ctx.shadowBlur = 0;
}

function drawPhotoSlide(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  pos: Pos,
  info: { title: string; when: string; where: string; type: string } | null,
  mark: HTMLImageElement | null,
) {
  drawPhoto(ctx, img, pos);
  logo(ctx, mark);
  if (!info) return;
  shade(ctx, 0.6, 0.9);
  const x = 64;
  const width = W - 2 * x;
  const font = bodyFont();
  let y = H - 70;
  ctx.textBaseline = "alphabetic";
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 10;
  // Date and place.
  const line = [info.when, info.where].filter(Boolean).join("  ·  ");
  if (line) {
    ctx.font = `500 34px ${font}`;
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.fillText(wrap(ctx, line, width, 1)[0], x, y);
    y -= 62;
  }
  // Event name (up to 2 lines).
  if (info.title) {
    ctx.font = `48px ${DISPLAY}`;
    ctx.fillStyle = "#ffffff";
    const lines = wrap(ctx, info.title, width, 2);
    for (let i = lines.length - 1; i >= 0; i--) {
      ctx.fillText(lines[i], x, y);
      y -= 58;
    }
    y -= 4;
  }
  ctx.shadowBlur = 0;
  // Event type, as a pink tag.
  if (info.type) {
    ctx.font = `800 26px ${font}`;
    ctx.letterSpacing = "2px";
    const label = info.type.toUpperCase();
    const tw = ctx.measureText(label).width;
    const ph = 46;
    ctx.fillStyle = PINK;
    ctx.beginPath();
    ctx.roundRect(x, y - ph + 10, tw + 36, ph, ph / 2);
    ctx.fill();
    ctx.fillStyle = NAVY;
    ctx.fillText(label, x + 18, y - 4);
    ctx.letterSpacing = "0px";
  }
}

function drawComingUp(
  ctx: CanvasRenderingContext2D,
  m: Month,
  events: RecapEvent[],
  tz: string,
  community: string,
  mark: HTMLImageElement | null,
) {
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, W, H);
  grain(ctx, W, H);
  logo(ctx, mark);
  const x = 72;
  const width = W - 2 * x;
  const font = bodyFont();
  ctx.textBaseline = "alphabetic";
  ctx.font = `800 32px ${font}`;
  ctx.letterSpacing = "6px";
  ctx.fillStyle = PINK;
  ctx.fillText("COMING UP", x, 200);
  ctx.letterSpacing = "0px";
  const title = `IN ${MONTHS[m.month - 1].toUpperCase()}`;
  const size = fit(ctx, title, (s) => `${s}px ${DISPLAY}`, width, 120, 70);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(title, x - 4, 200 + size + 6);
  let y = 200 + size + 90;

  const shown = events.slice(0, 6);
  if (!shown.length) {
    ctx.font = `500 40px ${font}`;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (const l of wrap(
      ctx,
      `New events are on the way. Find them at ${URL_TEXT}`,
      width,
      3,
    )) {
      y += 56;
      ctx.fillText(l, x, y);
    }
  }
  const rowH = Math.min(
    150,
    Math.floor((H - 200 - y) / Math.max(1, shown.length)),
  );
  const dayFmt = new Intl.DateTimeFormat("en-AU", {
    timeZone: tz,
    weekday: "short",
  });
  const dateFmt = new Intl.DateTimeFormat("en-AU", {
    timeZone: tz,
    day: "numeric",
  });
  const timeFmt = new Intl.DateTimeFormat("en-AU", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
  });
  for (const e of shown) {
    const d = new Date(e.startsAt);
    // Date block: weekday over the day number.
    ctx.font = `800 24px ${font}`;
    ctx.letterSpacing = "3px";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText(dayFmt.format(d).toUpperCase(), x, y + 30);
    ctx.letterSpacing = "0px";
    ctx.font = `64px ${DISPLAY}`;
    ctx.fillStyle = YELLOW;
    ctx.fillText(dateFmt.format(d), x, y + 96);
    // Name and where/when.
    const tx = x + 150;
    const tw = width - 150;
    ctx.font = `700 40px ${font}`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(wrap(ctx, e.title, tw, 1)[0], tx, y + 46);
    ctx.font = `500 30px ${font}`;
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    const sub = [timeFmt.format(d).replace(" ", "").toLowerCase(), place(e)]
      .filter(Boolean)
      .join("  ·  ");
    ctx.fillText(wrap(ctx, sub, tw, 1)[0], tx, y + 92);
    y += rowH;
  }
  if (events.length > shown.length) {
    ctx.font = `600 30px ${font}`;
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText(
      `+ ${events.length - shown.length} more at ${URL_TEXT}`,
      x,
      y + 20,
    );
  }
  // Footer.
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, H - 150);
  ctx.lineTo(W - x, H - 150);
  ctx.stroke();
  ctx.font = `700 34px ${font}`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(URL_TEXT, x, H - 86);
  ctx.font = `600 26px ${font}`;
  ctx.letterSpacing = "3px";
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  const cw = ctx.measureText(community).width;
  ctx.fillText(community, W - x - cw, H - 88);
  ctx.letterSpacing = "0px";
}

// ---------- Slides ----------

export type Slide =
  | { kind: "cover"; photo: EventPhoto }
  | { kind: "photo"; photo: EventPhoto }
  | { kind: "coming" };

export type Drawn = {
  month: Month;
  next: Month;
  community: string;
  tz: string;
  upcoming: RecapEvent[];
  events: Map<string, RecapEvent>;
  mark: HTMLImageElement | null;
};

function infoFor(p: EventPhoto, d: Drawn) {
  const e = p.eventId ? d.events.get(p.eventId) : undefined;
  if (!e) {
    const type = p.eventKind ?? "";
    return type ? { title: "", when: "", where: "", type } : null;
  }
  const when = new Intl.DateTimeFormat("en-AU", {
    timeZone: d.tz,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(e.startsAt));
  return {
    title: e.title,
    when,
    where: place(e),
    type: e.typeName ?? p.eventKind ?? "",
  };
}

export async function drawSlide(
  canvas: HTMLCanvasElement,
  slide: Slide,
  pos: Pos,
  d: Drawn,
  img: HTMLImageElement | null,
) {
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.scale(canvas.width / W, canvas.width / W);
  if (slide.kind === "coming")
    drawComingUp(ctx, d.next, d.upcoming, d.tz, d.community, d.mark);
  else if (img && slide.kind === "cover")
    drawCover(ctx, img, pos, d.month, d.community, d.mark);
  else if (img && slide.kind === "photo")
    drawPhotoSlide(ctx, img, pos, infoFor(slide.photo, d), d.mark);
}

// ---------- The sheet ----------

export function RecapMaker({
  teamId,
  year,
  month,
  selected,
  onClose,
}: {
  teamId: string;
  year?: number; // the month to recap (else worked out from `selected`, or last month)
  month?: number;
  selected?: EventPhoto[]; // picked in the Photo Hub
  onClose: () => void;
}) {
  const [team, setTeam] = useState<{ name: string; tz: string } | null>(null);
  const [all, setAll] = useState<EventPhoto[] | null>(null);
  const [events, setEvents] = useState<Map<string, RecapEvent>>(new Map());
  const [upcoming, setUpcoming] = useState<RecapEvent[] | null>(null);
  const [m, setM] = useState<Month | null>(
    year && month ? { year, month } : null,
  );
  const [order, setOrder] = useState<string[] | null>(null);
  const [pos, setPos] = useState<Record<string, Pos>>({});
  const [mark, setMark] = useState<HTMLImageElement | null>(null);
  const [fontsOk, setFontsOk] = useState(false);
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const [made, setMade] = useState<File[] | null>(null);

  // The community, its photos (not "not for promo"), and their events.
  useEffect(() => {
    let live = true;
    const supabase = createClient();
    loadPosterFonts()?.then(() => live && setFontsOk(true));
    loadImage("/brand/wtf-mark.png")
      .then((img) => live && setMark(img))
      .catch(() => {});
    Promise.all([
      supabase.from("teams").select("name, timezone").eq("id", teamId).single(),
      loadCommunityPhotos(supabase, teamId),
    ]).then(async ([t, photos]) => {
      if (!live) return;
      const tz = (t.data?.timezone as string) || "Australia/Sydney";
      const usable = photos.filter((p) => !p.noPromo);
      const ids = [
        ...new Set(usable.flatMap((p) => (p.eventId ? [p.eventId] : []))),
      ];
      const map = new Map<string, RecapEvent>();
      for (let i = 0; i < ids.length; i += 100) {
        const { data } = await supabase
          .from("events")
          .select(
            "id, title, starts_at, venue, address, event_type:event_types(name)",
          )
          .in("id", ids.slice(i, i + 100));
        for (const e of data ?? [])
          map.set(e.id as string, {
            id: e.id as string,
            title: e.title as string,
            startsAt: e.starts_at as string,
            venue: (e.venue as string | null) ?? null,
            address: (e.address as string | null) ?? null,
            typeName:
              (e.event_type as unknown as { name: string } | null)?.name ??
              null,
          });
      }
      if (!live) return;
      setTeam({ name: (t.data?.name as string) ?? "", tz });
      setEvents(map);
      setAll(usable);
    });
    return () => {
      live = false;
    };
  }, [teamId]);

  const tz = team?.tz ?? "Australia/Sydney";
  // When a photo was taken: its event's date, else the month set by hand.
  const when = (p: EventPhoto) => {
    const e = p.eventId ? events.get(p.eventId) : undefined;
    if (e) return { ...ymOf(e.startsAt, tz), at: e.startsAt };
    if (p.takenYear && p.takenMonth)
      return {
        year: p.takenYear,
        month: p.takenMonth,
        at: `${p.takenYear}-${String(p.takenMonth).padStart(2, "0")}-01`,
      };
    return null;
  };
  const byDate = (list: EventPhoto[]) =>
    [...list].sort((a, b) =>
      (when(a)?.at ?? "9").localeCompare(when(b)?.at ?? "9"),
    );

  // Which month: given, else the one most of the picked photos are from,
  // else last month.
  let month0 = m;
  if (!month0 && all && team) {
    const counts = new Map<string, number>();
    for (const p of selected ?? []) {
      const w = when(p);
      if (w)
        counts.set(
          `${w.year}-${w.month}`,
          (counts.get(`${w.year}-${w.month}`) ?? 0) + 1,
        );
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (top) {
      const [y, mo] = top.split("-").map(Number);
      month0 = { year: y, month: mo };
    } else {
      const now = ymOf(new Date().toISOString(), tz);
      month0 = prevMonth(now);
    }
  }
  const monthPhotos =
    all && month0
      ? byDate(
          all.filter((p) => {
            const w = when(p);
            return (
              (w && same(w, month0)) || selected?.some((s) => s.id === p.id)
            );
          }),
        )
      : null;

  // The starting pick: what was selected in the hub, else the month's
  // favourites (else its first photos), in date order, with the first
  // favourite as the cover.
  let chosenIds = order;
  if (!chosenIds && monthPhotos) {
    const picked = selected?.length
      ? monthPhotos.filter((p) => selected.some((s) => s.id === p.id))
      : monthPhotos.filter((p) => p.favourite);
    const start = (picked.length ? picked : monthPhotos).slice(0, MAX_PHOTOS);
    const cover = start.find((p) => p.favourite) ?? start[0];
    chosenIds = cover
      ? [cover.id, ...start.filter((p) => p !== cover).map((p) => p.id)]
      : [];
  }

  // Next month's events, for the last slide.
  const nextM = month0 ? nextMonth(month0) : null;
  const nextKey = nextM ? `${nextM.year}-${nextM.month}` : "";
  useEffect(() => {
    if (!nextKey || !team) return;
    let live = true;
    const [y, mo] = nextKey.split("-").map(Number);
    // A day either side covers any time zone; the exact month is checked below.
    const from = new Date(Date.UTC(y, mo - 1, 1) - 864e5).toISOString();
    const to = new Date(Date.UTC(y, mo, 1) + 864e5).toISOString();
    createClient()
      .from("events")
      .select(
        "id, title, starts_at, venue, address, event_type:event_types(name)",
      )
      .eq("team_id", teamId)
      .gte("starts_at", from)
      .lt("starts_at", to)
      .order("starts_at")
      .then(({ data }) => {
        if (!live) return;
        setUpcoming(
          (data ?? [])
            .filter((e) =>
              same(ymOf(e.starts_at as string, team.tz), {
                year: y,
                month: mo,
              }),
            )
            .map((e) => ({
              id: e.id as string,
              title: e.title as string,
              startsAt: e.starts_at as string,
              venue: (e.venue as string | null) ?? null,
              address: (e.address as string | null) ?? null,
              typeName:
                (e.event_type as unknown as { name: string } | null)?.name ??
                null,
            })),
        );
      });
    return () => {
      live = false;
    };
  }, [nextKey, team, teamId]);

  const byId = new Map((monthPhotos ?? []).map((p) => [p.id, p]));
  const chosen = (chosenIds ?? [])
    .map((id) => byId.get(id))
    .filter((p): p is EventPhoto => !!p);
  const slides: Slide[] = chosen.length
    ? [
        { kind: "cover", photo: chosen[0] },
        ...chosen.slice(1).map((p) => ({ kind: "photo" as const, photo: p })),
        { kind: "coming" },
      ]
    : [];
  const drawn: Drawn | null =
    month0 && nextM && team
      ? {
          month: month0,
          next: nextM,
          community: communityLabel(team.name),
          tz,
          upcoming: upcoming ?? [],
          events,
          mark,
        }
      : null;

  const change = (ids: string[]) => {
    setOrder(ids);
    setMade(null);
    setNote("");
  };
  const toggle = (id: string) => {
    const ids = chosenIds ?? [];
    change(
      ids.includes(id)
        ? ids.filter((x) => x !== id)
        : ids.length >= MAX_PHOTOS
          ? ids
          : [...ids, id],
    );
  };
  const goMonth = (to: Month) => {
    setM(to);
    setOrder(null);
    setUpcoming(null);
    setMade(null);
  };

  const name = month0 ? `${MONTHS[month0.month - 1]} ${month0.year}` : "";
  const fileBase = `${name.toLowerCase().replace(/\s+/g, "-")}-recap`;

  async function build(): Promise<File[]> {
    if (!drawn) return [];
    const files: File[] = [];
    for (let i = 0; i < slides.length; i++) {
      setBusy(`Making slide ${i + 1} of ${slides.length}…`);
      const s = slides[i];
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const img = s.kind === "coming" ? null : await loadImage(s.photo.url);
      await drawSlide(
        canvas,
        s,
        s.kind === "coming" ? CENTRE : (pos[s.photo.id] ?? CENTRE),
        drawn,
        img,
      );
      const blob = await new Promise<Blob>((ok, no) =>
        canvas.toBlob(
          (b) => (b ? ok(b) : no(new Error("no image"))),
          "image/jpeg",
          0.92,
        ),
      );
      files.push(
        new File([blob], `${fileBase}-${String(i + 1).padStart(2, "0")}.jpg`, {
          type: "image/jpeg",
        }),
      );
    }
    return files;
  }

  async function make() {
    setNote("");
    try {
      setMade(await build());
    } catch {
      setNote("Something went wrong making the slides. Try again?");
    } finally {
      setBusy("");
    }
  }
  async function share() {
    if (!made) return;
    try {
      await navigator.share({ files: made });
    } catch (e) {
      if ((e as Error).name !== "AbortError")
        setNote("Couldn't open sharing here. Use Download instead.");
    }
  }
  const canShare =
    !!made &&
    typeof navigator !== "undefined" &&
    !!navigator.canShare?.({ files: made });
  async function download() {
    setNote("");
    try {
      const files = made ?? (await build());
      setBusy("Zipping…");
      const entries: Record<string, Uint8Array> = {};
      for (const f of files)
        entries[f.name] = new Uint8Array(await f.arrayBuffer());
      const zip = zipSync(entries, { level: 0 });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(
        new Blob([zip as BlobPart], { type: "application/zip" }),
      );
      a.download = `${fileBase}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
    } catch {
      setNote("Something went wrong making the slides. Try again?");
    } finally {
      setBusy("");
    }
  }

  // What the caption writer should know: the month, its events, next month.
  const recapEvents = [
    ...new Map(
      chosen.flatMap((p) => {
        const e = p.eventId ? events.get(p.eventId) : undefined;
        return e ? [[e.id, e] as const] : [];
      }),
    ).values(),
  ];
  const extra = month0
    ? [
        `monthly recap of ${name}`,
        recapEvents.length
          ? `events in the photos: ${recapEvents.map((e) => `${e.title} (${e.typeName ?? "event"}${place(e) ? `, ${place(e)}` : ""})`).join("; ")}`
          : "",
        upcoming?.length && nextM
          ? `coming up in ${MONTHS[nextM.month - 1]}: ${upcoming
              .slice(0, 6)
              .map((e) => e.title)
              .join("; ")}`
          : "",
      ]
        .filter(Boolean)
        .join(". ")
    : "";

  return (
    <Sheet title={name ? `${name} recap` : "Monthly recap"} onClose={onClose}>
      {!monthPhotos || !month0 ? (
        <p className="text-sm text-stone-500">Loading photos…</p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => goMonth(prevMonth(month0))}
              className="rounded-lg px-2 py-1 text-sm font-semibold text-navy ring-1 ring-black/10 hover:bg-stone-50"
              aria-label="Month before"
            >
              ‹
            </button>
            <span className="font-semibold text-navy">{name}</span>
            <button
              type="button"
              onClick={() => goMonth(nextMonth(month0))}
              className="rounded-lg px-2 py-1 text-sm font-semibold text-navy ring-1 ring-black/10 hover:bg-stone-50"
              aria-label="Month after"
            >
              ›
            </button>
          </div>
          {monthPhotos.length === 0 ? (
            <p className="mt-3 text-sm text-stone-600">
              No photos from {name} in the Photo Hub yet. Photos attached to an
              event count for that event&apos;s month; others need their month
              set.
            </p>
          ) : (
            <>
              <p className="mt-3 mb-2 text-sm text-stone-600">
                The first photo is the cover. Each one after it gets its own
                slide with the event&apos;s name, date, place and type, and the
                last slide shows next month&apos;s events.
              </p>
              <PhotoPicker
                photos={monthPhotos}
                order={chosenIds ?? []}
                max={MAX_PHOTOS}
                onToggle={toggle}
                onMove={(from, to) => {
                  const n = [...(chosenIds ?? [])];
                  const [x] = n.splice(from, 1);
                  n.splice(to, 0, x);
                  change(n);
                }}
              />
            </>
          )}

          {drawn && slides.length > 0 && (
            <>
              <p className="mt-4 text-xs font-medium text-stone-500">
                Preview · drag a photo to move it in the frame
              </p>
              <div className="mt-1.5 flex snap-x gap-2 overflow-x-auto rounded-2xl bg-stone-100 p-2">
                {slides.map((s, i) => (
                  <div
                    key={
                      s.kind === "coming" ? "coming" : `${s.kind}-${s.photo.id}`
                    }
                    className="w-44 shrink-0 snap-start"
                  >
                    <SlidePreview
                      slide={s}
                      pos={
                        s.kind === "coming"
                          ? CENTRE
                          : (pos[s.photo.id] ?? CENTRE)
                      }
                      drawn={drawn}
                      ready={fontsOk}
                      onPos={
                        s.kind === "coming"
                          ? undefined
                          : (p) => {
                              setPos((all) => ({ ...all, [s.photo.id]: p }));
                              setMade(null);
                            }
                      }
                    />
                    <p className="mt-1 text-center text-xs text-stone-500">
                      {i === 0
                        ? "Cover"
                        : s.kind === "coming"
                          ? "Coming up"
                          : i + 1}
                    </p>
                  </div>
                ))}
              </div>
              {upcoming && upcoming.length === 0 && nextM && (
                <p className="mt-1.5 text-xs text-stone-500">
                  No events in {MONTHS[nextM.month - 1]} yet, so the last slide
                  points people to {URL_TEXT}.
                </p>
              )}
              {note && <p className="mt-2 text-sm text-red-700">{note}</p>}
              <div className="mt-3 flex gap-2">
                {made && canShare ? (
                  <button
                    type="button"
                    onClick={share}
                    className="flex-1 rounded-xl bg-pink px-4 py-2.5 font-semibold text-navy hover:bg-pink-strong"
                  >
                    Share {made.length} slides
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={made ? download : make}
                    disabled={!!busy}
                    className="flex-1 rounded-xl bg-pink px-4 py-2.5 font-semibold text-navy hover:bg-pink-strong disabled:opacity-50"
                  >
                    {busy ||
                      (made
                        ? `Download ${made.length} slides`
                        : `Make ${slides.length} slides`)}
                  </button>
                )}
                <button
                  type="button"
                  onClick={download}
                  disabled={!!busy}
                  className="rounded-xl px-3 py-2.5 text-sm font-semibold text-navy ring-1 ring-black/10 hover:bg-white disabled:opacity-50"
                >
                  Download
                </button>
              </div>
              <p className="mt-1.5 text-xs text-stone-500">
                On your phone, Share opens Instagram or Facebook with every
                slide ready to post.
              </p>
              <CaptionWriter teamId={teamId} photos={chosen} extra={extra} />
            </>
          )}
        </>
      )}
    </Sheet>
  );
}

// One slide, drawn exactly as it'll come out; drag to move the photo.
function SlidePreview({
  slide,
  pos,
  drawn,
  ready,
  onPos,
}: {
  slide: Slide;
  pos: Pos;
  drawn: Drawn;
  ready: boolean;
  onPos?: (p: Pos) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const img = useRef<HTMLImageElement | null>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const url = slide.kind === "coming" ? null : slide.photo.url;

  useEffect(() => {
    let live = true;
    const canvas = ref.current;
    if (!canvas) return;
    const go = (i: HTMLImageElement | null) => {
      if (!live) return;
      img.current = i;
      drawSlide(canvas, slide, pos, drawn, i);
    };
    if (!url) go(null);
    else if (img.current?.src === url) go(img.current);
    else
      loadImage(url)
        .then(go)
        .catch(() => {});
    return () => {
      live = false;
    };
  }, [slide, pos, drawn, url, ready]);

  return (
    <canvas
      ref={ref}
      width={360}
      height={450}
      className={`w-full rounded-lg shadow ${onPos ? "cursor-grab touch-none active:cursor-grabbing" : ""}`}
      onPointerDown={(e) => {
        if (!onPos) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        const i = img.current;
        if (!d || !i || !onPos) return;
        const box = e.currentTarget.getBoundingClientRect();
        const s = Math.max(
          box.width / i.naturalWidth,
          box.height / i.naturalHeight,
        );
        const overX = i.naturalWidth * s - box.width;
        const overY = i.naturalHeight * s - box.height;
        drag.current = { x: e.clientX, y: e.clientY };
        const clamp = (n: number) => Math.min(1, Math.max(0, n));
        onPos({
          x: overX > 0.5 ? clamp(pos.x - (e.clientX - d.x) / overX) : 0.5,
          y: overY > 0.5 ? clamp(pos.y - (e.clientY - d.y) / overY) : 0.5,
        });
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
    />
  );
}

// A button that opens the recap maker (the monthly recap action, the Photo Hub).
export function RecapButton({
  teamId,
  year,
  month,
  selected,
  label = "Make recap",
  className,
  disabled,
}: {
  teamId: string;
  year?: number;
  month?: number;
  selected?: EventPhoto[];
  label?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={className}
      >
        {label}
      </button>
      {open && (
        <RecapMaker
          teamId={teamId}
          year={year}
          month={month}
          selected={selected}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
