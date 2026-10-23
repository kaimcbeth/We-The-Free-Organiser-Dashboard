"use client";

import { useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/sheet";

// A first, basic event graphic: drawn in the browser on a canvas from the
// event's details, in We The Free colours, ready to download as a PNG.
// Templates will be fine-tuned later.

export type GraphicEvent = {
  title: string;
  startsAt: string;
  endsAt: string | null;
  venue: string | null;
  address: string | null;
  typeName: string | null;
  community: string | null;
};

export type GraphicSize = "post" | "story" | "cover";
const SIZES: Record<GraphicSize, { label: string; w: number; h: number }> = {
  post: { label: "Instagram post", w: 1080, h: 1350 },
  story: { label: "Story", w: 1080, h: 1920 },
  cover: { label: "Facebook event cover", w: 1920, h: 1005 },
};

const NAVY = "#071130";
const PINK = "#ff47b9";
const CYAN = "#2fd9df";
const YELLOW = "#ffd90f";

function lines(ctx: CanvasRenderingContext2D, text: string, max: number) {
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

function draw(
  canvas: HTMLCanvasElement,
  e: GraphicEvent,
  size: GraphicSize,
  tz: string,
) {
  const { w, h } = SIZES[size];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const font =
    getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
  const wide = size === "cover";
  const pad = Math.round(w * (wide ? 0.06 : 0.08));
  const u = Math.min(w, h) / 1080; // scale unit

  // Background and accents.
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = PINK;
  ctx.beginPath();
  ctx.arc(w * 0.92, h * 0.08, 260 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = CYAN;
  ctx.beginPath();
  ctx.arc(w * 0.04, h * 0.98, 200 * u, 0, Math.PI * 2);
  ctx.fill();
  const barY = Math.max(wide ? 0 : h * 0.2, pad + 120 * u);
  ctx.fillStyle = YELLOW;
  ctx.fillRect(pad, barY, 120 * u, 14 * u);

  // Brand.
  ctx.fillStyle = PINK;
  ctx.font = `800 ${34 * u}px ${font}`;
  ctx.textBaseline = "top";
  ctx.fillText("WE THE FREE", pad, pad);
  if (e.community) {
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = `500 ${30 * u}px ${font}`;
    ctx.fillText(e.community, pad, pad + 44 * u);
  }

  // Event type.
  let y = barY + 50 * u;
  if (e.typeName) {
    ctx.fillStyle = CYAN;
    ctx.font = `700 ${36 * u}px ${font}`;
    ctx.fillText(e.typeName.toUpperCase(), pad, y);
    y += 60 * u;
  }

  // Title.
  const titleSize = (wide ? 110 : size === "story" ? 120 : 110) * u;
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 ${titleSize}px ${font}`;
  const titleLines = lines(ctx, e.title, w - pad * 2 - (wide ? w * 0.3 : 0));
  for (const l of titleLines.slice(0, 4)) {
    ctx.fillText(l, pad, y);
    y += titleSize * 1.05;
  }

  // Date, time, place.
  const date = new Intl.DateTimeFormat("en-AU", {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(e.startsAt));
  const time = (iso: string) =>
    new Intl.DateTimeFormat("en-AU", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
    })
      .format(new Date(iso))
      .replace(" ", "")
      .toLowerCase();
  const when = e.endsAt
    ? `${time(e.startsAt)} – ${time(e.endsAt)}`
    : time(e.startsAt);
  y += 30 * u;
  ctx.fillStyle = YELLOW;
  ctx.font = `700 ${52 * u}px ${font}`;
  ctx.fillText(date, pad, y);
  y += 66 * u;
  ctx.fillStyle = "#ffffff";
  ctx.font = `500 ${46 * u}px ${font}`;
  ctx.fillText(when, pad, y);
  y += 62 * u;
  const place = e.venue ?? e.address;
  if (place) {
    for (const l of lines(ctx, place, w - pad * 2).slice(0, 2)) {
      ctx.fillText(l, pad, y);
      y += 58 * u;
    }
  }

  // Footer.
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = `600 ${34 * u}px ${font}`;
  ctx.textBaseline = "bottom";
  const foot = "activism.wtf";
  ctx.fillText(foot, w - pad - ctx.measureText(foot).width, h - pad);
}

export function GraphicMaker({
  event,
  tz,
  initialSize = "post",
  label = "Make graphics",
  className = "text-xs font-medium text-pink-ink hover:underline",
}: {
  event: GraphicEvent;
  tz: string;
  initialSize?: GraphicSize;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState<GraphicSize>(initialSize);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (open && canvas.current) draw(canvas.current, event, size, tz);
  }, [open, size, event, tz]);

  function download() {
    if (!canvas.current) return;
    const a = document.createElement("a");
    a.href = canvas.current.toDataURL("image/png");
    const slug = event.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    a.download = `${slug}-${size}.png`;
    a.click();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>
      {open && (
        <Sheet title="Event graphics" onClose={() => setOpen(false)}>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(SIZES) as GraphicSize[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                className={`rounded-full px-3 py-1 text-sm font-medium ring-1 ${
                  size === s
                    ? "bg-navy text-white ring-navy"
                    : "bg-white text-stone-600 ring-stone-300"
                }`}
              >
                {SIZES[s].label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex justify-center rounded-2xl bg-stone-100 p-3">
            <canvas
              ref={canvas}
              className="max-h-[55vh] w-auto max-w-full rounded-lg shadow"
            />
          </div>
          <p className="mt-2 text-xs text-stone-500">
            {SIZES[size].w}×{SIZES[size].h}. A first, simple design: more
            templates are on the way.
          </p>
          <button
            type="button"
            onClick={download}
            className="mt-3 w-full rounded-xl bg-pink px-4 py-2.5 font-semibold text-navy hover:bg-pink-strong"
          >
            Download PNG
          </button>
        </Sheet>
      )}
    </>
  );
}
