"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Sheet } from "@/components/sheet";
import { grain, loadPosterFonts } from "@/components/graphic-poster";
import { graphicNames } from "@/components/newcomer-report";
import { stripEmoji } from "@/lib/event-emoji";

// Pairing post (Kai, 26 Nov 2026: "Have a generator for this with the names
// and the first event they went to"): from the weekly "Paired with a regular"
// card, one image + message for the regulars' chat listing the week's
// newcomers (first names) and the first event each came to, asking who can
// welcome them. Never "buddy" (Kai: "onboarding support").

const NAVY = "#071130";
const PINK = "#ff47b9";
const CYAN = "#2fd9df";
const YELLOW = "#ffd90f";
const W = 1080;
const H = 1350;
const DISPLAY = '"WTF Display", "Arial Black", sans-serif';

export type PairPerson = { id: string; name: string; first: string };
type Row = { name: string; event: string };

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((ok, fail) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = fail;
    img.src = url;
  });

function wrapLines(ctx: CanvasRenderingContext2D, text: string, w: number) {
  const words = text.split(/\s+/);
  const out: string[] = [];
  let line = "";
  for (const word of words) {
    const t = line ? `${line} ${word}` : word;
    if (ctx.measureText(t).width > w && line) {
      out.push(line);
      line = word;
    } else line = t;
  }
  if (line) out.push(line);
  return out;
}

export function drawPairing(
  canvas: HTMLCanvasElement,
  d: {
    kicker: string;
    heading: string;
    rows: Row[];
    foot: string;
    logo: HTMLImageElement | null;
  },
) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const body =
    getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
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
  const width = W - pad * 2;
  if (d.logo) {
    const h = 60;
    ctx.drawImage(d.logo, pad, 80, (d.logo.width / d.logo.height) * h, h);
  }
  ctx.textBaseline = "alphabetic";
  let y = 250;
  if (d.kicker) {
    ctx.font = `800 32px ${body}`;
    ctx.letterSpacing = "6px";
    ctx.fillStyle = PINK;
    ctx.fillText(d.kicker.toUpperCase(), pad, y);
    ctx.letterSpacing = "0px";
    y += 30;
  }

  // Heading: up to 3 lines, as big as fits.
  const heading = d.heading.toUpperCase();
  let hs = 96;
  let lines: string[] = [];
  for (; heading.trim() && hs >= 50; hs -= 4) {
    ctx.font = `${hs}px ${DISPLAY}`;
    lines = wrapLines(ctx, heading, width);
    if (lines.length <= 3) break;
  }
  ctx.fillStyle = "#ffffff";
  for (const l of lines.slice(0, 3)) {
    y += hs * 1.02;
    ctx.fillText(l, pad - 3, y);
  }

  // One row per newcomer: coloured dot, name, first event under it.
  const top = y + (lines.length ? 70 : 50);
  const bottom = H - (d.foot ? 170 : 90);
  const n = Math.max(1, d.rows.length);
  const rowH = Math.min(150, (bottom - top) / n);
  const nameSize = Math.min(58, rowH * 0.42);
  const evSize = Math.min(32, rowH * 0.24);
  const colours = [PINK, CYAN, YELLOW];
  d.rows.forEach((r, i) => {
    const ry = top + i * rowH;
    const dot = nameSize * 0.36;
    ctx.beginPath();
    ctx.arc(pad + dot, ry + nameSize * 0.62, dot, 0, Math.PI * 2);
    ctx.fillStyle = colours[i % colours.length];
    ctx.fill();
    const x = pad + dot * 2 + 26;
    ctx.font = `${nameSize}px ${DISPLAY}`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(r.name, x, ry + nameSize, width - (x - pad));
    if (r.event) {
      ctx.font = `600 ${evSize}px ${body}`;
      ctx.fillStyle = YELLOW;
      const ev = wrapLines(ctx, r.event, width - (x - pad))[0];
      ctx.fillText(ev, x, ry + nameSize + evSize * 1.45);
    }
  });

  if (d.foot) {
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(pad, H - 150, width, 2);
    ctx.font = `600 34px ${body}`;
    ctx.fillStyle = "#ffffff";
    const f = wrapLines(ctx, d.foot, width).slice(0, 2);
    f.forEach((l, i) => ctx.fillText(l, pad, H - 92 + i * 44));
  }
}

const dayFmt = (iso: string, tz: string) =>
  new Intl.DateTimeFormat("en-AU", {
    timeZone: tz,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));

function cleanTitle(t: string) {
  return stripEmoji(t)
    .replace(/^(WTF|We The Free)[:\s-]*/i, "")
    .trim();
}

export function PairingPostButton({
  people,
  dates,
  tz,
}: {
  people: PairPerson[];
  dates: string; // "16 Nov – 22 Nov"
  tz: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl bg-white px-3 py-1.5 text-sm font-semibold text-navy ring-1 ring-black/10 hover:bg-stone-50"
      >
        Make the post
      </button>
      {open && (
        <PairingPost
          people={people}
          dates={dates}
          tz={tz}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function PairingPost({
  people,
  dates,
  tz,
  onClose,
}: {
  people: PairPerson[];
  dates: string;
  tz: string;
  onClose: () => void;
}) {
  const [firsts, setFirsts] = useState<Record<string, string> | null>(null);
  const [left, setLeft] = useState<Set<string>>(new Set());
  const [kicker, setKicker] = useState(`Newcomers · ${dates}`);
  const [heading, setHeading] = useState("");
  const [foot, setFoot] = useState("");
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [fonts, setFonts] = useState(false);
  const [msg, setMsg] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let live = true;
    loadPosterFonts()?.then(() => live && setFonts(true));
    loadImage("/brand/wtf-logo.png")
      .then((img) => live && setLogo(img))
      .catch(() => {});
    const ids = people.map((p) => p.id);
    createClient()
      .from("attendance")
      .select("person_id, event:events(title, starts_at)")
      .in("person_id", ids)
      .then(({ data }) => {
        if (!live) return;
        const best: Record<string, { at: string; title: string }> = {};
        for (const r of (data ?? []) as unknown as {
          person_id: string;
          event: { title: string; starts_at: string } | null;
        }[]) {
          if (!r.event) continue;
          const cur = best[r.person_id];
          if (!cur || r.event.starts_at < cur.at)
            best[r.person_id] = { at: r.event.starts_at, title: r.event.title };
        }
        const out: Record<string, string> = {};
        for (const [id, b] of Object.entries(best))
          out[id] = `${cleanTitle(b.title)} · ${dayFmt(b.at, tz)}`;
        setFirsts(out);
      });
    return () => {
      live = false;
    };
  }, [people, tz]);

  const kept = people.filter((p) => !left.has(p.id));
  const names = graphicNames(
    kept.map((p) => ({
      first_name: p.first,
      last_name: p.name.split(" ").slice(1).join(" ") || null,
    })),
  );
  const rows: Row[] = kept.map((p, i) => ({
    name: names[i],
    event: firsts?.[p.id] ?? "",
  }));

  const key = JSON.stringify(rows);
  useEffect(() => {
    if (canvas.current && firsts)
      drawPairing(canvas.current, {
        kicker,
        heading,
        rows: JSON.parse(key) as Row[],
        foot,
        logo,
      });
  }, [kicker, heading, key, foot, logo, fonts, firsts]);

  const text = [
    `👋 ${kicker}`,
    "",
    ...rows.map(
      (r) => `• ${r.name}${r.event ? ` (first came to ${r.event})` : ""}`,
    ),
    ...(heading || foot ? [""] : []),
    ...(heading ? [heading] : []),
    ...(foot ? [foot] : []),
  ].join("\n");

  async function blob() {
    return new Promise<Blob | null>((r) =>
      canvas.current?.toBlob(r, "image/png"),
    );
  }
  async function share() {
    const b = await blob();
    if (!b) return;
    const file = new File([b], "newcomers-to-welcome.png", {
      type: "image/png",
    });
    void navigator.clipboard?.writeText(text).catch(() => {});
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
      } catch {}
      return;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = file.name;
    a.click();
  }
  async function copyImage() {
    const b = await blob();
    if (!b) return;
    await navigator.clipboard
      .write([new ClipboardItem({ "image/png": b })])
      .then(() => setMsg("Copied the image."))
      .catch(() => setMsg("Couldn't copy the image. Use Share or download."));
  }
  async function copyText() {
    await navigator.clipboard
      .writeText(text)
      .then(() => setMsg("Copied the message."))
      .catch(() => setMsg("Couldn't copy. Select the text and copy it."));
  }

  const input =
    "mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm";
  const button =
    "rounded-xl px-3.5 py-2 text-sm font-semibold ring-1 ring-black/10 hover:bg-stone-50";

  return (
    <Sheet title="Newcomers to welcome" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-stone-600">
          For the regulars&apos; chat: each newcomer and the first event they
          came to. First names only.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {people.map((p) => {
            const off = left.has(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() =>
                  setLeft((s) => {
                    const n = new Set(s);
                    if (off) n.delete(p.id);
                    else n.add(p.id);
                    return n;
                  })
                }
                title={off ? "Put back" : "Leave off"}
                className={`rounded-full px-3 py-1 text-sm ${off ? "bg-stone-100 text-stone-400 line-through" : "bg-navy text-white"}`}
              >
                {p.name}
              </button>
            );
          })}
        </div>
        {firsts === null ? (
          <p className="text-sm text-stone-500">Finding their first events…</p>
        ) : kept.length === 0 ? (
          <p className="text-sm text-stone-500">Everyone is left off.</p>
        ) : (
          <div className="flex justify-center rounded-2xl bg-stone-100 p-3">
            <canvas
              ref={canvas}
              width={W}
              height={H}
              className="max-h-[56vh] w-auto max-w-full rounded-lg shadow"
            />
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={share}
            disabled={!kept.length}
            className={`${button} bg-pink ring-0 hover:bg-pink-strong`}
          >
            Share or download
          </button>
          <button
            type="button"
            onClick={copyImage}
            disabled={!kept.length}
            className={button}
          >
            Copy image
          </button>
          <button type="button" onClick={copyText} className={button}>
            Copy message
          </button>
        </div>
        {msg && <p className="text-sm text-stone-600">{msg}</p>}
        <label className="block text-sm">
          <span className="font-medium text-navy">Small line at the top</span>
          <input
            className={input}
            value={kicker}
            onChange={(e) => setKicker(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-navy">
            Heading <span className="text-stone-400">(empty = left off)</span>
          </span>
          <input
            className={input}
            value={heading}
            onChange={(e) => setHeading(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-navy">
            Bottom line{" "}
            <span className="text-stone-400">(empty = left off)</span>
          </span>
          <input
            className={input}
            value={foot}
            onChange={(e) => setFoot(e.target.value)}
          />
        </label>
        <pre className="whitespace-pre-wrap rounded-xl bg-stone-50 p-3 font-sans text-sm text-navy">
          {text}
        </pre>
      </div>
    </Sheet>
  );
}
