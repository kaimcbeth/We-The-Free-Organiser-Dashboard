"use client";

import { useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/sheet";
import { createClient } from "@/lib/supabase/client";
import { grain, loadPosterFonts } from "@/components/graphic-poster";

// "What's on across the region posted" (RSL, fortnightly; Kai 6 Nov 2026):
// every community's events for the next two weeks (0214
// region_upcoming_events), as a 1080×1350 post and as text.

type Ev = {
  team: string;
  tz: string | null;
  title: string;
  starts_at: string;
  venue: string | null;
  address: string | null;
  time_unknown: boolean;
};

const NAVY = "#071130";
const PINK = "#ff47b9";
const CYAN = "#2fd9df";
const YELLOW = "#ffd90f";
const DISPLAY = '"WTF Display", "Arial Black", sans-serif';
const BODY = '"Helvetica Neue", Arial, sans-serif';
const W = 1080;
const H = 1350;
const DAYS = 14;
const city = (name: string) => name.replace(/, .*$/, "");

const dayKey = (e: Ev) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: e.tz ?? "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(e.starts_at));
const dayLabel = (e: Ev) =>
  new Intl.DateTimeFormat("en-AU", {
    timeZone: e.tz ?? "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(e.starts_at));
const timeLabel = (e: Ev) =>
  e.time_unknown
    ? ""
    : new Intl.DateTimeFormat("en-AU", {
        timeZone: e.tz ?? "UTC",
        hour: "numeric",
        minute: "2-digit",
      })
        .format(new Date(e.starts_at))
        .replace(":00", "")
        .replace(" ", "");

// Monday of this week, as YYYY-MM-DD.
function thisMonday() {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return iso(d);
}
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function addDays(day: string, n: number) {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + n);
  return iso(d);
}
function rangeLabel(from: string) {
  const a = new Date(`${from}T12:00:00`);
  const b = new Date(`${addDays(from, DAYS - 1)}T12:00:00`);
  const f = (d: Date, month: boolean) =>
    new Intl.DateTimeFormat("en-AU", {
      day: "numeric",
      ...(month ? { month: "long" } : {}),
    }).format(d);
  return a.getMonth() === b.getMonth()
    ? `${f(a, false)} – ${f(b, true)}`
    : `${f(a, true)} – ${f(b, true)}`;
}

function fit(
  ctx: CanvasRenderingContext2D,
  text: string,
  max: number,
  start: number,
  min: number,
  font = DISPLAY,
  weight = "",
) {
  let s = start;
  for (; s > min; s -= 2) {
    ctx.font = `${weight}${s}px ${font}`;
    if (ctx.measureText(text).width <= max) break;
  }
  return s;
}

function clip(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max)
    t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

export function drawWhatsOn(
  canvas: HTMLCanvasElement,
  o: {
    region: string;
    range: string;
    events: Ev[];
    mark: HTMLImageElement | null;
  },
) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, W, H);
  grain(ctx, W, H);
  if (o.mark) ctx.drawImage(o.mark, W - 72 - 84, 72, 84, 84);
  const x = 72;
  const width = W - 2 * x;
  ctx.textBaseline = "alphabetic";

  let y = 150;
  ctx.font = `700 34px ${BODY}`;
  ctx.fillStyle = PINK;
  ctx.letterSpacing = "4px";
  ctx.fillText("WHAT'S ON", x, y);
  ctx.letterSpacing = "0px";
  y += 108;
  ctx.fillStyle = YELLOW;
  const head = o.region.toUpperCase();
  ctx.font = `${fit(ctx, head, width - 110, 110, 50)}px ${DISPLAY}`;
  ctx.fillText(head, x - 4, y);
  y += 62;
  ctx.font = `600 36px ${BODY}`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(o.range, x, y);
  y += 56;

  // One row per event, the day in a column on the left (shown on the first
  // event of each day), as many as fit.
  const bottom = H - 130;
  const rowH = 56;
  const dayW = 215;
  let shown = 0;
  let last = "";
  y += 30;
  for (const e of o.events) {
    if (y + rowH > bottom) break;
    y += rowH;
    const k = dayKey(e);
    if (k !== last) {
      if (last) {
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.fillRect(x, y - rowH + 10, width, 2);
      }
      ctx.font = `700 28px ${BODY}`;
      ctx.fillStyle = CYAN;
      ctx.letterSpacing = "1px";
      ctx.fillText(dayLabel(e).replace(",", "").toUpperCase(), x, y);
      ctx.letterSpacing = "0px";
      last = k;
    }
    const t = timeLabel(e);
    const left = x + dayW;
    ctx.font = `700 32px ${BODY}`;
    ctx.fillStyle = "#ffffff";
    const where = city(e.team);
    ctx.fillText(where, left, y);
    const wW = ctx.measureText(where).width;
    ctx.font = `600 28px ${BODY}`;
    const tW = t ? ctx.measureText(t).width : 0;
    ctx.font = `400 30px ${BODY}`;
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    const titleMax = x + width - left - wW - 20 - (t ? tW + 24 : 0);
    ctx.fillText(clip(ctx, e.title, titleMax), left + wW + 16, y);
    if (t) {
      ctx.textAlign = "right";
      ctx.fillStyle = YELLOW;
      ctx.font = `600 28px ${BODY}`;
      ctx.fillText(t, x + width, y);
      ctx.textAlign = "left";
    }
    shown++;
  }
  if (!o.events.length) {
    y += 90;
    ctx.font = `600 36px ${BODY}`;
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillText("Nothing listed yet. Watch this space.", x, y);
  }
  const more = o.events.length - shown;
  ctx.font = `600 26px ${BODY}`;
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.letterSpacing = "2px";
  ctx.fillText(
    more > 0
      ? `+${more} MORE AT WWW.ACTIVISM.WTF/EVENTS`
      : "FIND YOURS AT WWW.ACTIVISM.WTF/EVENTS",
    x,
    H - 64,
  );
  ctx.letterSpacing = "0px";
}

export function RegionWhatsOnButton({
  regionId,
  className,
}: {
  regionId: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        Make the post
      </button>
      {open && (
        <WhatsOnSheet regionId={regionId} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function WhatsOnSheet({
  regionId,
  onClose,
}: {
  regionId: string;
  onClose: () => void;
}) {
  const [from, setFrom] = useState(thisMonday);
  const [events, setEvents] = useState<Ev[] | null>(null);
  const [region, setRegion] = useState("");
  const [mark, setMark] = useState<HTMLImageElement | null>(null);
  const [fonts, setFonts] = useState(false);
  const [note, setNote] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  const range = rangeLabel(from);

  useEffect(() => {
    let live = true;
    loadPosterFonts()?.then(() => live && setFonts(true));
    const img = new Image();
    img.onload = () => live && setMark(img);
    img.src = "/brand/wtf-mark.png";
    createClient()
      .from("regions")
      .select("name, extra_countries")
      .eq("id", regionId)
      .maybeSingle()
      .then(({ data }) => {
        if (!live || !data) return;
        const extra = (data.extra_countries as string[] | null) ?? [];
        setRegion([data.name, ...extra].join(" + "));
      });
    return () => {
      live = false;
    };
  }, [regionId]);

  useEffect(() => {
    let live = true;
    createClient()
      .rpc("region_upcoming_events", {
        p_region: regionId,
        p_from: from,
        p_days: DAYS,
      })
      .then(({ data, error }) => {
        if (!live) return;
        if (error) setNote("Couldn't load the events. Try again in a moment.");
        setEvents((data as Ev[] | null) ?? []);
      });
    return () => {
      live = false;
    };
  }, [regionId, from]);

  useEffect(() => {
    if (!events || !canvas.current) return;
    drawWhatsOn(canvas.current, { region, range, events, mark });
  }, [events, region, range, mark, fonts]);

  // Text: one block per day.
  const lines: string[] = [
    `What's on across We The Free ${region} 📅`,
    range,
    "",
  ];
  let last = "";
  for (const e of events ?? []) {
    if (dayKey(e) !== last) {
      if (last) lines.push("");
      lines.push(dayLabel(e));
      last = dayKey(e);
    }
    const t = timeLabel(e);
    lines.push(`📍 ${city(e.team)}: ${e.title}${t ? ` (${t})` : ""}`);
  }
  lines.push(
    "",
    "Everyone's welcome, no experience needed. Find an event near you at www.activism.wtf/events",
  );
  const text = lines.join("\n");

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text);
      setNote("Copied the text.");
    } catch {
      setNote("Couldn't copy here. Select the text and copy it instead.");
    }
  }
  async function shareImage() {
    const c = canvas.current;
    if (!c) return;
    const blob = await new Promise<Blob | null>((r) =>
      c.toBlob(r, "image/png"),
    );
    if (!blob) return;
    const file = new File([blob], `whats-on-${from}.png`, {
      type: "image/png",
    });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }
    } catch {
      return;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(file);
    a.download = file.name;
    a.click();
  }

  const btn =
    "rounded-xl bg-pink px-3 py-1.5 text-sm font-semibold text-navy hover:bg-pink-strong";
  const quiet =
    "rounded-xl bg-navy/5 px-3 py-1.5 text-sm font-semibold text-navy hover:bg-navy/10";
  return (
    <Sheet title="What's on" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setFrom((f) => addDays(f, -7))}
            className={quiet}
            aria-label="A week earlier"
          >
            ‹
          </button>
          <p className="font-semibold text-navy">{range}</p>
          <button
            type="button"
            onClick={() => setFrom((f) => addDays(f, 7))}
            className={quiet}
            aria-label="A week later"
          >
            ›
          </button>
        </div>
        {!events ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : (
          <>
            <div className="flex justify-center rounded-2xl bg-stone-100 p-3">
              <canvas
                ref={canvas}
                className="max-h-[48vh] w-auto max-w-full rounded-lg shadow"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={shareImage} className={btn}>
                Share or download
              </button>
              <button type="button" onClick={copyText} className={quiet}>
                Copy as text
              </button>
            </div>
            {note && <p className="text-sm text-stone-500">{note}</p>}
            <pre className="whitespace-pre-wrap rounded-xl bg-white p-3 font-sans text-sm text-navy ring-1 ring-black/5">
              {text}
            </pre>
            <p className="text-xs text-stone-500">
              Events come from each community&apos;s activism.wtf calendar. The
              image fits about a dozen; the text has them all.
            </p>
          </>
        )}
      </div>
    </Sheet>
  );
}
