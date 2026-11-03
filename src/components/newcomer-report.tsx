"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { loadPosterFonts, grain } from "@/components/graphic-poster";

// The week's newcomers (Kai, 4 Nov 2026): everyone whose first event ever
// was one of ours that Monday–Sunday. Shown on Events the week after, with an
// image for the regulars' chat: "NEWCOMERS", the dates, first names only
// (a last initial only when two first names match). No line at the bottom.

type Newcomer = {
  person_id: string;
  first_name: string;
  last_name: string | null;
  event_title: string;
  event_starts_at: string;
};

const NAVY = "#071130";
const PINK = "#ff47b9";
const CYAN = "#2fd9df";
const YELLOW = "#ffd90f";

// First names, with a last initial only where two people share one.
export function graphicNames(
  people: { first_name: string; last_name: string | null }[],
) {
  const count = new Map<string, number>();
  for (const p of people) {
    const k = p.first_name.trim().toLowerCase();
    count.set(k, (count.get(k) ?? 0) + 1);
  }
  return people.map((p) => {
    const first = p.first_name.trim();
    const initial = p.last_name?.trim()[0];
    return (count.get(first.toLowerCase()) ?? 0) > 1 && initial
      ? `${first} ${initial.toUpperCase()}.`
      : first;
  });
}

// "26 October – 1 November" for a week starting on a Monday (YYYY-MM-DD).
export function weekLabel(weekStart: string) {
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("en-AU", {
      timeZone: "UTC",
      day: "numeric",
      month: "long",
    }).format(d);
  const start = new Date(`${weekStart}T12:00:00Z`);
  const end = new Date(start.getTime() + 6 * 864e5);
  return `${fmt(start)} – ${fmt(end)}`;
}

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((ok, fail) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = fail;
    img.src = url;
  });

// 1080 × 1350: NEWCOMERS, the dates, the names as coloured pills.
export function drawNewcomers(
  canvas: HTMLCanvasElement,
  names: string[],
  dates: string,
  logo: HTMLImageElement | null,
) {
  const W = 1080;
  const H = 1350;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const body =
    getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
  const display = '"WTF Display", "Arial Black", sans-serif';
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, W, H);
  grain(ctx, W, H);
  const glow = (x: number, y: number, r: number, c: string) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, c);
    g.addColorStop(1, "rgba(7,17,48,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  };
  glow(W, 0, 620, "rgba(255,71,185,0.25)");
  glow(0, H, 560, "rgba(47,217,223,0.2)");

  const pad = 90;
  if (logo) {
    const h = 64;
    ctx.drawImage(logo, pad, 80, (logo.width / logo.height) * h, h);
  }
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  // As big as fits the width.
  let hs = 130;
  ctx.font = `${hs}px ${display}`;
  while (ctx.measureText("NEWCOMERS").width > W - pad * 2 && hs > 60) {
    hs -= 4;
    ctx.font = `${hs}px ${display}`;
  }
  let y = 300;
  ctx.fillText("NEWCOMERS", pad, y);
  y += 66;
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = `600 40px ${body}`;
  ctx.fillText(dates, pad, y);
  y += 70;

  const top = y;
  const bottom = H - 100;
  const colours = [PINK, CYAN, YELLOW];
  let size = 76;
  let layout: { x: number; y: number; w: number; name: string }[] = [];
  for (; size >= 26; size -= 2) {
    ctx.font = `${size}px ${display}`;
    const ph = size * 1.55;
    const gap = size * 0.35;
    const padX = size * 0.6;
    layout = [];
    let x = pad;
    let row = top;
    let ok = true;
    for (const name of names) {
      const w = Math.min(ctx.measureText(name).width + padX * 2, W - pad * 2);
      if (x + w > W - pad && x > pad) {
        x = pad;
        row += ph + gap;
      }
      if (row + ph > bottom) {
        ok = false;
        break;
      }
      layout.push({ x, y: row, w, name });
      x += w + gap;
    }
    if (ok) break;
  }
  const ph = size * 1.55;
  ctx.font = `${size}px ${display}`;
  layout.forEach((p, i) => {
    ctx.beginPath();
    ctx.roundRect(p.x, p.y, p.w, ph, ph / 2);
    ctx.fillStyle = colours[i % colours.length];
    ctx.fill();
    ctx.fillStyle = NAVY;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText(p.name, p.x + p.w / 2, p.y + ph / 2 + size * 0.05, p.w - 20);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  });
  if (layout.length < names.length) {
    ctx.fillStyle = "#ffffff";
    ctx.font = `600 34px ${body}`;
    ctx.fillText(`+${names.length - layout.length} more`, pad, bottom + 40);
  }
}

export function NewcomerReport({
  teamId,
  weekStart,
  tz,
}: {
  teamId: string;
  weekStart: string; // the Monday, YYYY-MM-DD
  tz: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Newcomer[] | null>(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState("");
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [fonts, setFonts] = useState(false);
  const [closing, setClosing] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let live = true;
    createClient()
      .rpc("week_newcomers", { p_team_id: teamId, p_week_start: weekStart })
      .then(({ data }) => live && setRows((data as Newcomer[] | null) ?? []));
    return () => {
      live = false;
    };
  }, [teamId, weekStart]);

  useEffect(() => {
    if (!open) return;
    let live = true;
    loadPosterFonts().then(() => live && setFonts(true));
    if (!logo)
      loadImage("/brand/wtf-logo.png")
        .then((l) => live && setLogo(l))
        .catch(() => {});
    return () => {
      live = false;
    };
  }, [open, logo]);

  const dates = weekLabel(weekStart);
  const names = rows ? graphicNames(rows) : [];
  const namesKey = names.join("|");
  useEffect(() => {
    if (open && canvas.current && namesKey)
      drawNewcomers(canvas.current, namesKey.split("|"), dates, logo);
  }, [open, namesKey, dates, logo, fonts]);

  if (!rows || rows.length === 0 || closing) return null;

  // Grouped by event for the card (full names: organisers only).
  const byEvent: {
    key: string;
    title: string;
    when: string;
    people: string[];
  }[] = [];
  for (const r of rows) {
    const key = `${r.event_starts_at}|${r.event_title}`;
    let g = byEvent.find((x) => x.key === key);
    if (!g) {
      g = {
        key,
        title: r.event_title,
        when: new Intl.DateTimeFormat("en-AU", {
          timeZone: tz,
          weekday: "short",
          day: "numeric",
          month: "short",
        }).format(new Date(r.event_starts_at)),
        people: [],
      };
      byEvent.push(g);
    }
    g.people.push([r.first_name, r.last_name].filter(Boolean).join(" "));
  }

  async function close() {
    setClosing(true);
    await createClient()
      .from("newcomer_report_dismissals")
      .insert({ team_id: teamId, week_start: weekStart });
    router.refresh();
  }
  const flash = (what: string) => {
    setCopied(what);
    setTimeout(() => setCopied(""), 2500);
  };
  const text = [`Newcomers, ${dates}:`, ...names.map((n) => `• ${n}`)].join(
    "\n",
  );
  async function copyText() {
    try {
      await navigator.clipboard.writeText(text);
      flash("text");
    } catch {
      flash("failed");
    }
  }
  const blob = () =>
    new Promise<Blob>((ok, fail) =>
      canvas.current?.toBlob(
        (b) => (b ? ok(b) : fail(new Error("no image"))),
        "image/png",
      ),
    );
  async function copyImage() {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob() }),
      ]);
      flash("image");
    } catch {
      flash("failed");
    }
  }
  async function shareImage() {
    const file = new File([await blob()], `newcomers-${weekStart}.png`, {
      type: "image/png",
    });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return;
      } catch {}
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(file);
    a.download = file.name;
    a.click();
  }

  return (
    <section className="relative rounded-2xl bg-white p-4 shadow-sm ring-2 ring-pink">
      <button
        type="button"
        onClick={close}
        aria-label="Close this week's newcomers"
        title="Close"
        className="absolute right-2 top-2 rounded-full px-2 py-0.5 text-lg leading-none text-stone-400 hover:bg-stone-100 hover:text-stone-700"
      >
        ×
      </button>
      <p className="text-xs font-semibold uppercase tracking-wide text-pink-ink">
        Last week
      </p>
      <h2 className="mt-0.5 pr-6 text-lg font-semibold leading-snug tracking-tight">
        {rows.length} newcomer{rows.length === 1 ? "" : "s"}
        <span className="ml-2 text-sm font-normal text-stone-500">{dates}</span>
      </h2>
      <ul className="mt-2 space-y-1 text-sm text-stone-700">
        {byEvent.map((g) => (
          <li key={g.key}>
            <span className="text-stone-500">
              {g.when} · {g.title}:
            </span>{" "}
            {g.people.join(", ")}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-xl bg-pink px-3.5 py-2 text-sm font-semibold text-navy hover:bg-pink-strong"
        >
          {open ? "Hide image" : "Make the image"}
        </button>
        <button
          type="button"
          onClick={copyText}
          className="rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-navy ring-1 ring-black/10 hover:bg-stone-50"
        >
          {copied === "text" ? "Copied" : "Copy as text"}
        </button>
      </div>
      {open && (
        <div className="mt-3">
          <div className="flex justify-center rounded-2xl bg-stone-100 p-3">
            <canvas
              ref={canvas}
              className="max-h-[56vh] w-auto max-w-full rounded-lg shadow"
            />
          </div>
          <p className="mt-1 text-xs text-stone-500">
            First names only on the image.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={shareImage}
              className="flex-1 rounded-xl bg-pink px-4 py-2.5 font-semibold text-navy hover:bg-pink-strong"
            >
              Share or download
            </button>
            <button
              type="button"
              onClick={copyImage}
              className="flex-1 rounded-xl bg-white px-4 py-2.5 font-semibold text-navy ring-1 ring-black/10 hover:bg-stone-50"
            >
              {copied === "image"
                ? "Copied"
                : copied === "failed"
                  ? "Couldn't copy"
                  : "Copy image"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
