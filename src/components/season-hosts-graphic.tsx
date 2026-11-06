"use client";

import { useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/sheet";
import { SaveToPlanner } from "@/components/save-to-planner";
import { grain, loadPosterFonts } from "@/components/graphic-poster";
import {
  DISPLAY,
  NAVY,
  PINK,
  YELLOW,
  bodyFont,
  loadImage,
} from "@/components/recap-maker";
import { seasonForDue } from "@/components/season-calendar";

// "Host an event this summer?" graphic for the "Event hosts asked for next
// season" action (Kai, 5 Nov 2026). Same look as the seasonal calendar.

const CYAN = "#5ce1e6";
const SIZES = {
  post: { label: "Post", w: 1080, h: 1350 },
  story: { label: "Story", w: 1080, h: 1920 },
} as const;
type Size = keyof typeof SIZES;
const IDEAS = [
  "Picnic",
  "Hike",
  "Movie night",
  "Games night",
  "Beach day",
  "Sanctuary visit",
  "Your own idea",
];
// Casual on purpose (Kai: "just reaching out to the community if anyone's keen").
const SUMMER_IDEAS = [
  "Beach day",
  "Picnic",
  "Karaoke",
  "Sunset walk",
  "Movie night",
  "Sanctuary visit",
  "Your own idea",
];
const defaults = (season: string): Text => ({
  kicker: `${season} calendar`,
  heading: `Wanna host something this ${season}?`,
  ideas: (season === "summer" ? SUMMER_IDEAS : IDEAS).join(", "),
});

// No message or footer on it: the call to action goes in the WhatsApp text (Kai).
type Text = { kicker: string; heading: string; ideas: string };

function drawSummer(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  horizon: number,
  r: number,
) {
  // Sky: navy at the top, glowing pink to orange at the horizon.
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, NAVY);
  sky.addColorStop(0.45, "#1d1450");
  sky.addColorStop(0.8, "#b8327f");
  sky.addColorStop(1, "#ff8a3d");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, horizon);
  // Sun: yellow to orange, with retro bands cut across its lower half.
  const cx = w / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, horizon);
  ctx.clip();
  const sun = ctx.createLinearGradient(0, horizon - r, 0, horizon);
  sun.addColorStop(0, YELLOW);
  sun.addColorStop(1, "#ff7a2f");
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(cx, horizon, r, Math.PI, 0);
  ctx.fill();
  ctx.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 4; i++) {
    const band = 6 + i * 4;
    const by = horizon - r * 0.55 + i * (r * 0.14);
    ctx.fillRect(cx - r, by, 2 * r, band);
  }
  ctx.restore();
  // Re-paint the sky behind the cut bands.
  ctx.save();
  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, horizon);
  ctx.restore();
  // Sea: deep blue with a few wave lines and the sun's reflection.
  const sea = ctx.createLinearGradient(0, horizon, 0, h);
  sea.addColorStop(0, "#1b2a6b");
  sea.addColorStop(1, NAVY);
  ctx.fillStyle = sea;
  ctx.fillRect(0, horizon, w, h - horizon);
  ctx.lineCap = "round";
  const lines = h > 1500 ? 5 : 3;
  const gap = h > 1500 ? 22 : 14;
  for (let i = 0; i < lines; i++) {
    const ry = horizon + gap + i * gap;
    const half = r * (0.9 - i * 0.16);
    ctx.strokeStyle = `rgba(255, 190, 80, ${0.7 - i * 0.12})`;
    ctx.lineWidth = 6 - i;
    ctx.beginPath();
    ctx.moveTo(cx - half, ry);
    ctx.lineTo(cx + half, ry);
    ctx.stroke();
  }
}

function draw(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: Text,
  range: string,
  mark: HTMLImageElement | null,
  season = "",
) {
  const story = h > 1500;
  const summer = season.toLowerCase() === "summer";
  // Summer: sunset sky, a retro sun setting over the sea (Kai, 5 Nov).
  // Nothing goes under the sun any more (Kai: WhatsApp chat, keep it casual).
  const horizon = h - (story ? 400 : 230);
  const sunR = story ? 240 : 170;
  if (summer) drawSummer(ctx, w, h, horizon, sunR);
  else {
    ctx.fillStyle = NAVY;
    ctx.fillRect(0, 0, w, h);
  }
  grain(ctx, w, h);
  if (mark) {
    const mh = 72;
    const mw = (mark.naturalWidth / mark.naturalHeight) * mh;
    ctx.drawImage(mark, w - 48 - mw, 48, mw, mh);
  }
  const x = 72;
  const width = w - 2 * x;
  const font = bodyFont();
  let y = story ? 340 : 200;
  ctx.textBaseline = "alphabetic";

  ctx.font = `800 32px ${font}`;
  ctx.letterSpacing = "6px";
  ctx.fillStyle = PINK;
  ctx.fillText(t.kicker.toUpperCase(), x, y);
  ctx.letterSpacing = "0px";

  // Heading: up to 3 lines (never cut), as big as fits.
  const words = t.heading.toUpperCase().split(/\s+/).filter(Boolean);
  const breakLines = (max: number) => {
    const out: string[] = [];
    let line = "";
    for (const wd of words) {
      const test = line ? `${line} ${wd}` : wd;
      if (!line || ctx.measureText(test).width <= max) line = test;
      else {
        out.push(line);
        line = wd;
      }
    }
    if (line) out.push(line);
    return out;
  };
  let size = story ? 190 : 170;
  let lines: string[] = [];
  for (; size >= 60; size -= 4) {
    ctx.font = `${size}px ${DISPLAY}`;
    lines = breakLines(width);
    if (
      lines.length <= 3 &&
      lines.every((l) => ctx.measureText(l).width <= width)
    )
      break;
  }
  for (const [i, l] of lines.entries()) {
    y += size * (i === 0 ? 1.1 : 0.98);
    ctx.fillStyle = i === lines.length - 1 ? YELLOW : "#ffffff";
    ctx.fillText(l, x - 4, y);
  }
  if (range) {
    ctx.font = `600 32px ${font}`;
    ctx.letterSpacing = "3px";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText(range.toUpperCase(), x, y + 64);
    ctx.letterSpacing = "0px";
    y += 64;
  }
  // Idea pills: centred in the space between.
  const ideas = t.ideas
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const colours = [PINK, CYAN, YELLOW]; // no white (Kai)
  ctx.font = `700 ${story ? 38 : 34}px ${font}`;
  const ph = story ? 74 : 66;
  const gap = 18;
  const placed: { label: string; x: number; row: number; w: number }[] = [];
  let px = x;
  let row = 0;
  for (const idea of ideas) {
    const label = idea;
    const pw = ctx.measureText(label).width + 52;
    if (px + pw > w - x && px > x) {
      px = x;
      row++;
    }
    placed.push({ label, x: px, row, w: pw });
    px += pw + 16;
  }
  const block = placed.length ? (row + 1) * ph + row * gap : 0;
  // Summer: pills sit under the heading, clear of the sun.
  const top = summer
    ? Math.min(y + (story ? 100 : 70), horizon - sunR - 30 - block)
    : y + (h - 120 - y - block) / 2;
  for (const [i, p] of placed.entries()) {
    const py = top + p.row * (ph + gap);
    ctx.fillStyle = colours[i % colours.length];
    ctx.beginPath();
    ctx.roundRect(p.x, py, p.w, ph, ph / 2);
    ctx.fill();
    ctx.fillStyle = NAVY;
    ctx.fillText(p.label, p.x + 26, py + ph * 0.68);
  }
  ctx.letterSpacing = "0px";
}

export function SeasonHostsGraphic({
  teamId,
  dueAt,
  tz,
  className,
  label = "Get graphic",
}: {
  teamId: string;
  dueAt: string;
  tz: string;
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>
      {open && (
        <HostsSheet
          teamId={teamId}
          dueAt={dueAt}
          tz={tz}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function HostsSheet({
  teamId,
  dueAt,
  tz,
  onClose,
}: {
  teamId: string;
  dueAt: string;
  tz: string;
  onClose: () => void;
}) {
  const { name, range } = seasonForDue(dueAt, tz, 21);
  const [size, setSize] = useState<Size>("post");
  const [text, setText] = useState<Text>(() => defaults(name.toLowerCase()));
  const [mark, setMark] = useState<HTMLImageElement | null>(null);
  const [fonts, setFonts] = useState(0);
  const [msg, setMsg] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let live = true;
    loadPosterFonts()?.then(() => live && setFonts((n) => n + 1));
    loadImage("/brand/wtf-mark.png")
      .then((img) => live && setMark(img))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const { w, h } = SIZES[size];
  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    draw(ctx, w, h, text, range, mark, name);
  }, [w, h, text, range, mark, fonts, name]);

  const blob = () =>
    new Promise<Blob | null>((r) => canvas.current?.toBlob(r, "image/png"));
  const fileName = `host-an-event-${name.toLowerCase()}-${size}.png`;
  async function share() {
    setMsg("");
    const b = await blob();
    if (!b) return;
    const file = new File([b], fileName, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] }).catch(() => {});
      return;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = fileName;
    a.click();
  }
  async function copy() {
    try {
      const png = blob().then((b) => {
        if (!b) throw new Error("no image");
        return b;
      });
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": png }),
      ]);
      setMsg("Copied the image.");
    } catch {
      setMsg("Couldn't copy. Use Share or download instead.");
    }
  }

  const input =
    "mt-1 block w-full rounded-lg bg-white px-2.5 py-1.5 text-sm text-navy ring-1 ring-stone-300";
  const field = (key: keyof Text, label: string, rows = 1) => (
    <label className="block text-xs font-medium text-stone-600">
      {label}
      {rows > 1 ? (
        <textarea
          rows={rows}
          value={text[key]}
          onChange={(e) => setText({ ...text, [key]: e.target.value })}
          className={input}
        />
      ) : (
        <input
          value={text[key]}
          onChange={(e) => setText({ ...text, [key]: e.target.value })}
          className={input}
        />
      )}
    </label>
  );

  return (
    <Sheet title={`Hosts for ${name.toLowerCase()}`} onClose={onClose}>
      <div className="flex gap-1.5">
        {(Object.keys(SIZES) as Size[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSize(s)}
            className={`rounded-full px-3 py-1 text-sm font-medium ring-1 ${size === s ? "bg-navy text-white ring-navy" : "bg-white text-stone-600 ring-stone-300"}`}
          >
            {SIZES[s].label}
          </button>
        ))}
      </div>
      <canvas
        ref={canvas}
        width={w}
        height={h}
        className="mx-auto mt-3 block w-full max-w-xs rounded-xl shadow-sm ring-1 ring-black/10"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={share}
          className="rounded-xl bg-pink px-3 py-1.5 text-sm font-semibold text-navy hover:bg-pink-strong"
        >
          Share or download
        </button>
        <button
          type="button"
          onClick={copy}
          className="rounded-xl bg-navy/5 px-3 py-1.5 text-sm font-semibold text-navy hover:bg-navy/10"
        >
          Copy image
        </button>
        <SaveToPlanner
          teamId={teamId}
          tz={tz}
          note={`Hosts wanted for ${name.toLowerCase()}`}
          platforms={[size === "story" ? "story" : "instagram"]}
          getImage={blob}
          className="rounded-xl bg-navy/5 px-3 py-1.5 text-sm font-semibold text-navy hover:bg-navy/10"
        />
      </div>
      {msg && <p className="mt-2 text-sm text-stone-600">{msg}</p>}
      <div className="mt-4 space-y-2">
        {field("kicker", "Small line")}
        {field("heading", "Heading")}
        {field("ideas", "Ideas (separate with commas)")}
        <button
          type="button"
          onClick={() => setText(defaults(name.toLowerCase()))}
          className="text-xs text-stone-500 hover:text-navy hover:underline"
        >
          Put the original words back
        </button>
      </div>
    </Sheet>
  );
}
