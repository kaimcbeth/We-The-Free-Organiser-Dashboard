"use client";

import { useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/sheet";
import { SaveToPlanner } from "@/components/save-to-planner";
import { createClient } from "@/lib/supabase/client";
import { grain, loadPosterFonts } from "@/components/graphic-poster";
import {
  DISPLAY,
  NAVY,
  PINK,
  YELLOW,
  bodyFont,
  communityLabel,
  fit,
  loadImage,
  wrap,
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
  "Potluck",
  "Hike",
  "Picnic",
  "Workshop",
  "Movie night",
  "Sanctuary visit",
  "Collab",
];

type Text = { kicker: string; heading: string; body: string; ideas: string };

function draw(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: Text,
  range: string,
  community: string,
  mark: HTMLImageElement | null,
) {
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, w, h);
  grain(ctx, w, h);
  if (mark) {
    const mh = 72;
    const mw = (mark.naturalWidth / mark.naturalHeight) * mh;
    ctx.drawImage(mark, w - 48 - mw, 48, mw, mh);
  }
  const story = h > 1500;
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
  const fy = h - (story ? 250 : 150);

  // Message: sits just above the footer.
  const bodySize = story ? 46 : 40;
  ctx.font = `500 ${bodySize}px ${font}`;
  const body = wrap(ctx, t.body, width, 5);
  const bodyTop = fy - 70 - (body.length - 1) * bodySize * 1.35;
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  body.forEach((l, i) => ctx.fillText(l, x, bodyTop + i * bodySize * 1.35));

  // Idea pills: centred in the space between.
  const ideas = t.ideas
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const colours = [PINK, CYAN, YELLOW, "#ffffff"];
  ctx.font = `800 ${story ? 38 : 34}px ${font}`;
  ctx.letterSpacing = "1px";
  const ph = story ? 74 : 66;
  const gap = 18;
  const placed: { label: string; x: number; row: number; w: number }[] = [];
  let px = x;
  let row = 0;
  for (const idea of ideas) {
    const label = idea.toUpperCase();
    const pw = ctx.measureText(label).width + 52;
    if (px + pw > w - x && px > x) {
      px = x;
      row++;
    }
    placed.push({ label, x: px, row, w: pw });
    px += pw + 16;
  }
  const block = placed.length ? (row + 1) * ph + row * gap : 0;
  const top = y + (bodyTop - bodySize - y - block) / 2;
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

  // Footer.
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, fy);
  ctx.lineTo(w - x, fy);
  ctx.stroke();
  ctx.font = `700 34px ${font}`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText("www.activism.wtf", x, fy + 64);
  ctx.font = `600 26px ${font}`;
  ctx.letterSpacing = "3px";
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  const size2 = fit(ctx, community, (s) => `600 ${s}px ${font}`, 420, 26, 16);
  ctx.font = `600 ${size2}px ${font}`;
  const cw = ctx.measureText(community).width;
  ctx.fillText(community, w - x - cw, fy + 62);
  ctx.letterSpacing = "0px";
}

export function SeasonHostsGraphic({
  teamId,
  dueAt,
  tz,
  className,
}: {
  teamId: string;
  dueAt: string;
  tz: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        Get graphic
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
  const [text, setText] = useState<Text>({
    kicker: "Calling all hosts",
    heading: `Host an event this ${name.toLowerCase()}`,
    body: "Got an idea for an event? We'll help with the rest. Reply in the WhatsApp chat or message an organiser to get it on the calendar.",
    ideas: IDEAS.join(", "),
  });
  const [community, setCommunity] = useState("");
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
    createClient()
      .from("teams")
      .select("name")
      .eq("id", teamId)
      .maybeSingle()
      .then(
        ({ data }) => live && setCommunity(communityLabel(data?.name ?? "")),
      );
    return () => {
      live = false;
    };
  }, [teamId]);

  const { w, h } = SIZES[size];
  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    draw(ctx, w, h, text, range, community, mark);
  }, [w, h, text, range, community, mark, fonts]);

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
        {field("body", "Message", 3)}
        <button
          type="button"
          onClick={() =>
            setText({
              kicker: "Calling all hosts",
              heading: `Host an event this ${name.toLowerCase()}`,
              body: "Got an idea for an event? We'll help with the rest. Reply in the WhatsApp chat or message an organiser to get it on the calendar.",
              ideas: IDEAS.join(", "),
            })
          }
          className="text-xs text-stone-500 hover:text-navy hover:underline"
        >
          Put the original words back
        </button>
      </div>
    </Sheet>
  );
}
