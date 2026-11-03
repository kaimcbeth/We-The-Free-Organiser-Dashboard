"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { loadPosterFonts, grain } from "@/components/graphic-poster";

// After an event (Kai, 4 Nov 2026): how many came, who was new, and for
// outreach the film numbers. The first-timers can go out as an image to the
// regulars' chat, asking who can be onboarding support. First names only on
// the image (Kai); a last initial only when two first names match.

type Recap = {
  attended: number;
  first_timers: { id: string; first_name: string; last_name: string | null }[];
  watched: number;
  answered: number;
  impact: number | null;
  tapouts: number;
};

const NAVY = "#071130";
const PINK = "#ff47b9";
const CYAN = "#2fd9df";
const YELLOW = "#ffd90f";
export const DEFAULT_ASK =
  "Who can be onboarding support for one of them? Reply with their name.";

// First names, with a last initial only where two people share one.
export function graphicNames(people: Recap["first_timers"]) {
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

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((ok, fail) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = fail;
    img.src = url;
  });

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const lines: string[] = [];
  let line = "";
  for (const w of text.split(/\s+/)) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > max && line) {
      lines.push(line);
      line = w;
    } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

// 1080 × 1350: heading, the event, the names as coloured pills, the ask.
export function drawNewFaces(
  canvas: HTMLCanvasElement,
  names: string[],
  event: string,
  when: string,
  ask: string,
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
  let y = 290;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  ctx.font = `120px ${display}`;
  ctx.fillText("NEW FACES", pad, y);
  y += 62;
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = `600 36px ${body}`;
  for (const l of wrap(ctx, `${event} · ${when}`, W - pad * 2).slice(0, 2)) {
    ctx.fillText(l, pad, y);
    y += 46;
  }
  y += 30;

  // The ask goes at the bottom; names fill what's between.
  ctx.font = `700 44px ${body}`;
  const askLines = wrap(ctx, ask.trim(), W - pad * 2).slice(0, 3);
  const askTop = H - 110 - askLines.length * 56;
  const top = y;
  const bottom = askTop - 50;

  // Biggest name size where every pill fits.
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
    const c = colours[i % colours.length];
    ctx.beginPath();
    ctx.roundRect(p.x, p.y, p.w, ph, ph / 2);
    ctx.fillStyle = c;
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
    ctx.fillText(`+${names.length - layout.length} more`, pad, bottom + 10);
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = `700 44px ${body}`;
  askLines.forEach((l, i) => ctx.fillText(l, pad, askTop + 44 + i * 56));
}

export function EventRecap({
  eventId,
  title,
  when,
  dismissible = false,
  hideFilms = false,
}: {
  eventId: string;
  title: string;
  when: string; // "Sat 31 Oct"
  dismissible?: boolean; // Events tab card: has a close button
  hideFilms?: boolean; // event page of a Movie Challenge: the day summary has them
}) {
  const router = useRouter();
  const [recap, setRecap] = useState<Recap | null>(null);
  const [open, setOpen] = useState(false);
  const [ask, setAsk] = useState(DEFAULT_ASK);
  const [copied, setCopied] = useState("");
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [fonts, setFonts] = useState(false);
  const [closing, setClosing] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let live = true;
    createClient()
      .rpc("event_recap", { p_event_id: eventId })
      .then(({ data }) => live && setRecap((data as Recap | null) ?? null));
    return () => {
      live = false;
    };
  }, [eventId]);

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

  const names = recap ? graphicNames(recap.first_timers) : [];
  const namesKey = names.join("|");
  useEffect(() => {
    if (open && canvas.current && namesKey)
      drawNewFaces(
        canvas.current,
        namesKey.split("|"),
        title,
        when,
        ask || DEFAULT_ASK,
        logo,
      );
  }, [open, namesKey, title, when, ask, logo, fonts]);

  if (!recap || closing) return null;
  const firsts = recap.first_timers.length;
  const films = !hideFilms && recap.watched > 0;

  async function close() {
    setClosing(true);
    await createClient()
      .from("event_recap_dismissals")
      .insert({ event_id: eventId });
    router.refresh();
  }
  const flash = (what: string) => {
    setCopied(what);
    setTimeout(() => setCopied(""), 2500);
  };
  const text = [
    `New faces at ${title} (${when}):`,
    ...names.map((n) => `• ${n}`),
    "",
    ask || DEFAULT_ASK,
  ].join("\n");
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
    const file = new File([await blob()], "new-faces.png", {
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

  const stat = (n: string, label: string) => (
    <div className="rounded-xl bg-stone-50 px-3 py-2">
      <p className="text-2xl font-bold tabular-nums text-navy">{n}</p>
      <p className="text-xs text-stone-500">{label}</p>
    </div>
  );

  return (
    <section className="relative rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      {dismissible && (
        <button
          type="button"
          onClick={close}
          aria-label="Close this recap"
          title="Close"
          className="absolute right-2 top-2 rounded-full px-2 py-0.5 text-lg leading-none text-stone-400 hover:bg-stone-100 hover:text-stone-700"
        >
          ×
        </button>
      )}
      <p className="text-xs font-semibold uppercase tracking-wide text-pink-ink">
        Event recap
      </p>
      <h2 className="mt-0.5 pr-6 text-lg font-semibold leading-snug tracking-tight">
        {dismissible ? (
          <a href={`/events/${eventId}`} className="hover:underline">
            {title}
          </a>
        ) : (
          title
        )}
        <span className="ml-2 text-sm font-normal text-stone-500">{when}</span>
      </h2>

      {recap.attended === 0 && !films ? (
        <p className="mt-2 text-sm text-stone-600">
          No one was checked in.{" "}
          <a
            href={`/events/${eventId}`}
            className="font-medium text-pink-ink hover:underline"
          >
            Add who came
          </a>{" "}
          to see the newcomers here.
        </p>
      ) : (
        <div
          className={`mt-3 grid grid-cols-2 gap-2 ${films ? "sm:grid-cols-5" : "sm:grid-cols-3"}`}
        >
          {stat(String(recap.attended), "came")}
          {stat(String(firsts), firsts === 1 ? "first-timer" : "first-timers")}
          {!films &&
            stat(String(Math.max(recap.attended - firsts, 0)), "came back")}
          {films && stat(String(recap.watched), "watched the film")}
          {films &&
            stat(
              recap.impact !== null ? String(recap.impact) : "–",
              "average impact /10",
            )}
          {films && stat(String(recap.tapouts), "tapouts")}
        </div>
      )}

      {firsts > 0 && (
        <div className="mt-3">
          <p className="text-sm text-stone-700">
            <span className="font-semibold">New faces: </span>
            {recap.first_timers
              .map((p) => [p.first_name, p.last_name].filter(Boolean).join(" "))
              .join(", ")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="rounded-xl bg-pink px-3.5 py-2 text-sm font-semibold text-navy hover:bg-pink-strong"
            >
              {open ? "Hide image" : "Ask for onboarding support"}
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
              <label className="mt-2 block text-xs font-medium text-stone-600">
                The ask
                <textarea
                  value={ask}
                  onChange={(e) => setAsk(e.target.value)}
                  rows={2}
                  maxLength={160}
                  className="mt-1 block w-full rounded-lg bg-white px-2.5 py-1.5 text-sm text-stone-800 ring-1 ring-black/10"
                />
              </label>
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
        </div>
      )}
    </section>
  );
}
