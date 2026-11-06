"use client";

import { useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/sheet";
import { createClient } from "@/lib/supabase/client";
import { grain, loadPosterFonts } from "@/components/graphic-poster";

// "Monthly recap posted on the regional socials" (RSL, Kai 6 Nov 2026):
// last month across the region's communities (0211 region_month_recap), as
// text and a 1080×1350 post.

type Row = { name: string; events: number; people: number; watched: number };

const NAVY = "#071130";
const PINK = "#ff47b9";
const CYAN = "#2fd9df";
const YELLOW = "#ffd90f";
const DISPLAY = '"WTF Display", "Arial Black", sans-serif';
const BODY = '"Helvetica Neue", Arial, sans-serif';
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
const W = 1080;
const H = 1350;
const city = (name: string) => name.replace(/, .*$/, "");

function lastMonth() {
  const d = new Date();
  return {
    y: d.getMonth() === 0 ? d.getFullYear() - 1 : d.getFullYear(),
    m: (d.getMonth() + 11) % 12,
  };
}

function fit(
  ctx: CanvasRenderingContext2D,
  text: string,
  max: number,
  start: number,
  min: number,
) {
  let s = start;
  for (; s > min; s -= 2) {
    ctx.font = `${s}px ${DISPLAY}`;
    if (ctx.measureText(text).width <= max) break;
  }
  return s;
}

export function drawRegionRecap(
  canvas: HTMLCanvasElement,
  o: {
    region: string;
    month: string;
    rows: Row[];
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
  ctx.fillText(`${o.month.toUpperCase()} RECAP`, x, y);
  ctx.letterSpacing = "0px";
  y += 120;
  const head = o.region.toUpperCase();
  ctx.fillStyle = "#ffffff";
  ctx.font = `${fit(ctx, "WE THE FREE", width, 120, 60)}px ${DISPLAY}`;
  ctx.fillText("WE THE FREE", x - 4, y);
  y += 120;
  ctx.fillStyle = YELLOW;
  const hs = fit(ctx, head, width, 120, 50);
  ctx.font = `${hs}px ${DISPLAY}`;
  ctx.fillText(head, x - 4, y);

  // Big numbers (only the ones there's something for).
  const total = (k: keyof Row) =>
    o.rows.reduce((n, r) => n + (r[k] as number), 0);
  const active = o.rows.filter((r) => r.events > 0).length;
  const stats = [
    { n: total("events"), label: "events", colour: PINK },
    { n: total("people"), label: "people at them", colour: CYAN },
    { n: total("watched"), label: "films watched", colour: YELLOW },
    {
      n: active,
      label: active === 1 ? "community" : "communities",
      colour: "#ffffff",
    },
  ].filter((s) => s.n > 0);
  y += 110;
  const cols = Math.min(2, stats.length) || 1;
  const colW = width / cols;
  stats.forEach((s, i) => {
    const cx = x + (i % cols) * colW;
    const cy = y + Math.floor(i / cols) * 190 + 110;
    ctx.font = `110px ${DISPLAY}`;
    ctx.fillStyle = s.colour;
    ctx.fillText(String(s.n), cx, cy);
    ctx.font = `600 30px ${BODY}`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(s.label, cx + 4, cy + 46);
  });
  y += Math.ceil(stats.length / cols) * 190 + 60;

  // The busiest communities.
  const busy = o.rows.filter((r) => r.events > 0).slice(0, 6);
  if (busy.length) {
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(x, y, width, 2);
    y += 60;
    for (const r of busy) {
      if (y > H - 150) break;
      ctx.font = `700 36px ${BODY}`;
      ctx.fillStyle = "#ffffff";
      ctx.fillText(city(r.name), x, y);
      ctx.textAlign = "right";
      ctx.font = `600 30px ${BODY}`;
      ctx.fillStyle = CYAN;
      ctx.fillText(
        `${r.events} event${r.events === 1 ? "" : "s"}${r.people ? ` · ${r.people} people` : ""}`,
        x + width,
        y,
      );
      ctx.textAlign = "left";
      y += 58;
    }
  }

  ctx.font = `600 26px ${BODY}`;
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.letterSpacing = "2px";
  ctx.fillText("WWW.ACTIVISM.WTF", x, H - 64);
  ctx.letterSpacing = "0px";
}

export function RegionRecapButton({
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
        Make the recap
      </button>
      {open && (
        <RecapSheet regionId={regionId} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function RecapSheet({
  regionId,
  onClose,
}: {
  regionId: string;
  onClose: () => void;
}) {
  const [when, setWhen] = useState(lastMonth);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [region, setRegion] = useState("");
  const [mark, setMark] = useState<HTMLImageElement | null>(null);
  const [fonts, setFonts] = useState(false);
  const [note, setNote] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  const month = `${MONTHS[when.m]} ${when.y}`;

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
    const first = `${when.y}-${String(when.m + 1).padStart(2, "0")}-01`;
    createClient()
      .rpc("region_month_recap", { p_region: regionId, p_month: first })
      .then(({ data, error }) => {
        if (!live) return;
        if (error) setNote("Couldn't load the month. Try again in a moment.");
        setRows(((data as Row[] | null) ?? []).map((r) => ({ ...r })));
      });
    return () => {
      live = false;
    };
  }, [regionId, when]);

  useEffect(() => {
    if (!rows || !canvas.current) return;
    drawRegionRecap(canvas.current, {
      region,
      month: MONTHS[when.m],
      rows,
      mark,
    });
  }, [rows, region, when, mark, fonts]);

  const sum = (k: keyof Row) =>
    (rows ?? []).reduce((n, r) => n + (r[k] as number), 0);
  const active = (rows ?? []).filter((r) => r.events > 0);
  const text = [
    `${MONTHS[when.m]} across We The Free ${region} 💛`,
    "",
    `${sum("events")} events${sum("people") ? `, ${sum("people")} people checked in` : ""}${sum("watched") ? ` and ${sum("watched")} films watched` : ""} across ${active.length} ${active.length === 1 ? "community" : "communities"}.`,
    "",
    ...active.map(
      (r) =>
        `📍 ${city(r.name)}: ${r.events} event${r.events === 1 ? "" : "s"}${r.people ? `, ${r.people} people` : ""}`,
    ),
    "",
    "Thank you to every organiser and member who made it happen. Find an event near you at www.activism.wtf",
  ].join("\n");

  const shift = (d: number) =>
    setWhen(({ y, m }) => {
      const n = m + d;
      return { y: y + Math.floor(n / 12), m: ((n % 12) + 12) % 12 };
    });

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
    const file = new File(
      [blob],
      `recap-${MONTHS[when.m].toLowerCase()}-${when.y}.png`,
      {
        type: "image/png",
      },
    );
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
    <Sheet title="Monthly recap" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => shift(-1)}
            className={quiet}
            aria-label="Month before"
          >
            ‹
          </button>
          <p className="font-semibold text-navy">{month}</p>
          <button
            type="button"
            onClick={() => shift(1)}
            className={quiet}
            aria-label="Month after"
          >
            ›
          </button>
        </div>
        {!rows ? (
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
              People are those checked in on the Movement Hub, so communities
              that don&apos;t check people in yet show events only.
            </p>
          </>
        )}
      </div>
    </Sheet>
  );
}
