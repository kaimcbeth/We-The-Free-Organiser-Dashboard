"use client";

import { useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/sheet";
import { SaveToPlanner } from "@/components/save-to-planner";
import type { GraphicEvent } from "@/components/graphic-maker";
import { grain, loadPosterFonts } from "@/components/graphic-poster";
import { fmt, place, shortTitle } from "@/components/graphic-photo-styles";
import {
  DISPLAY,
  NAVY,
  PINK,
  YELLOW,
  bodyFont,
  loadImage,
} from "@/components/recap-maker";

// Weather update post (Kai, 12 Nov 2026: "a confirmation post that an event
// is still on, cancelled or the location has changed if weather is
// threatening"). Lives on the "Weather backup plan made" action and on event
// pages. Nothing is saved: it's a graphic and a message for the chats.

export type Forecast = {
  chance: number | null;
  mm: number | null;
  temp: number | null;
};

type Status = "on" | "cancelled" | "moved";
type Weather = "rain" | "heat";

const STATUS: Record<Status, { label: string; word: string; colour: string }> =
  {
    on: { label: "Still on", word: "STILL ON", colour: "#3fd0ea" },
    cancelled: { label: "Cancelled", word: "CANCELLED", colour: PINK },
    moved: { label: "New location", word: "NEW LOCATION", colour: YELLOW },
  };

const SIZES = {
  post: { label: "Post", w: 1080, h: 1350 },
  story: { label: "Story", w: 1080, h: 1920 },
} as const;
type Size = keyof typeof SIZES;

type Texts = {
  kicker: string;
  word: string;
  heading: string;
  details: string;
  newPlace: string;
  line: string;
};

const CHANCE_RAIN = 30;
export function weatherOf(f: Forecast | null): Weather {
  const hot = (f?.temp ?? 0) > 30;
  const wet = (f?.chance ?? 0) > CHANCE_RAIN && (f?.mm ?? 0) >= 1;
  return hot && !wet ? "heat" : "rain";
}

function lineFor(status: Status, weather: Weather) {
  if (status === "on")
    return weather === "heat"
      ? "Bring water, a hat and sunscreen."
      : "Bring an umbrella or a raincoat.";
  if (status === "cancelled")
    return weather === "heat"
      ? "Stay cool and we'll see you at the next one."
      : "Stay dry and we'll see you at the next one.";
  return "Same time, new spot.";
}

function defaults(
  e: GraphicEvent,
  tz: string,
  status: Status,
  weather: Weather,
  newPlace = "",
): Texts {
  const movie = /movie challenge|3mmc/i.test(e.title);
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
    kicker: "Weather update",
    word: STATUS[status].word,
    heading: movie
      ? "3 Minute Movie Challenge"
      : shortTitle(e.title, e.community),
    details: [day, time, status === "moved" ? "" : place(e)]
      .filter(Boolean)
      .join(" · "),
    newPlace,
    line: lineFor(status, weather),
  };
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

// A simple cloud with rain, or a sun, drawn in white.
function drawIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  weather: Weather,
) {
  ctx.save();
  if (weather === "heat") {
    ctx.fillStyle = YELLOW;
    ctx.beginPath();
    ctx.arc(x, y, s * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = YELLOW;
    ctx.lineWidth = s * 0.07;
    ctx.lineCap = "round";
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * s * 0.44, y + Math.sin(a) * s * 0.44);
      ctx.lineTo(x + Math.cos(a) * s * 0.6, y + Math.sin(a) * s * 0.6);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x - s * 0.22, y, s * 0.22, 0, Math.PI * 2);
    ctx.arc(x + s * 0.05, y - s * 0.12, s * 0.3, 0, Math.PI * 2);
    ctx.arc(x + s * 0.32, y + s * 0.02, s * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x - s * 0.22, y, s * 0.54, s * 0.22);
    ctx.strokeStyle = "#3fd0ea";
    ctx.lineWidth = s * 0.06;
    ctx.lineCap = "round";
    for (let i = 0; i < 3; i++) {
      const dx = x - s * 0.18 + i * s * 0.22;
      ctx.beginPath();
      ctx.moveTo(dx, y + s * 0.34);
      ctx.lineTo(dx - s * 0.07, y + s * 0.52);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function drawWeatherUpdate(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: Texts,
  status: Status,
  weather: Weather,
  mark: HTMLImageElement | null,
) {
  const body = bodyFont();
  const m = 80;
  const story = h > 1500;
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, w, h);
  grain(ctx, w, h);
  const colour = STATUS[status].colour;
  const glow = ctx.createRadialGradient(w, 0, 0, w, 0, w * 0.9);
  glow.addColorStop(0, `${colour}38`);
  glow.addColorStop(1, `${colour}00`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  if (mark) {
    const mh = 76;
    const mw = (mark.naturalWidth / mark.naturalHeight) * mh;
    ctx.drawImage(mark, w - m - mw, m - 8, mw, mh);
  }

  // Block: icon, kicker, big word, heading, details, (new place), line.
  // Measure first, then centre it in the space.
  const iconS = story ? 220 : 180;
  ctx.font = `${story ? 150 : 132}px ${DISPLAY}`;
  let wordSize = story ? 150 : 132;
  let word = lines(ctx, t.word, w - m * 2, 2);
  while (!word && wordSize > 60) {
    wordSize -= 6;
    ctx.font = `${wordSize}px ${DISPLAY}`;
    word = lines(ctx, t.word, w - m * 2, 2);
  }
  ctx.font = `${story ? 66 : 58}px ${DISPLAY}`;
  let headSize = story ? 66 : 58;
  let head = lines(ctx, t.heading, w - m * 2, 2);
  while (!head && headSize > 32) {
    headSize -= 4;
    ctx.font = `${headSize}px ${DISPLAY}`;
    head = lines(ctx, t.heading, w - m * 2, 2);
  }
  const lineSize = story ? 40 : 36;
  ctx.font = `600 ${lineSize}px ${body}`;
  const said = t.line ? (lines(ctx, t.line, w - m * 2, 3) ?? [t.line]) : [];
  const placeSize = story ? 48 : 44;
  const showPlace = status === "moved" && t.newPlace.trim();
  ctx.font = `800 ${placeSize}px ${body}`;
  const placeLines = showPlace
    ? (lines(ctx, t.newPlace, w - m * 2 - 60, 2) ?? [t.newPlace])
    : [];

  const parts =
    iconS +
    40 +
    (t.kicker ? 60 : 0) +
    (word ?? [t.word]).length * wordSize * 0.98 +
    40 +
    (head ?? [t.heading]).length * headSize * 1.08 +
    (t.details ? 70 : 0) +
    (placeLines.length ? 50 + placeLines.length * placeSize * 1.2 + 30 : 0) +
    (said.length ? 50 + said.length * lineSize * 1.3 : 0);
  let y = Math.max(m + 90, (h - parts) / 2);

  drawIcon(ctx, m + iconS * 0.45, y + iconS * 0.45, iconS, weather);
  y += iconS + 40;

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  if (t.kicker) {
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = `800 34px ${body}`;
    ctx.letterSpacing = "5px";
    ctx.fillText(t.kicker.toUpperCase(), m, y);
    ctx.letterSpacing = "0px";
    y += 60;
  }

  ctx.fillStyle = colour;
  ctx.font = `${wordSize}px ${DISPLAY}`;
  for (const l of word ?? [t.word]) {
    y += wordSize * 0.9;
    ctx.fillText(l, m, y);
    y += wordSize * 0.08;
  }
  y += 40;

  ctx.fillStyle = "#ffffff";
  ctx.font = `${headSize}px ${DISPLAY}`;
  for (const l of head ?? [t.heading]) {
    y += headSize * 1.04;
    ctx.fillText(l, m, y);
  }
  if (t.details) {
    y += 70;
    ctx.fillStyle = YELLOW;
    ctx.font = `700 ${story ? 42 : 38}px ${body}`;
    ctx.fillText(t.details, m, y, w - m * 2);
  }

  if (placeLines.length) {
    // The new spot in a yellow-outlined box with a pin.
    y += 50;
    const boxH = placeLines.length * placeSize * 1.2 + 36;
    ctx.strokeStyle = YELLOW;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(m, y, w - m * 2, boxH, 22);
    ctx.stroke();
    // Pin
    const px = m + 40;
    const py = y + boxH / 2 - 6;
    ctx.fillStyle = YELLOW;
    ctx.beginPath();
    ctx.arc(px, py, 14, Math.PI, 0);
    ctx.lineTo(px, py + 26);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = NAVY;
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 ${placeSize}px ${body}`;
    let ly = y + 18;
    for (const l of placeLines) {
      ly += placeSize * 1.05;
      ctx.fillText(l, m + 76, ly);
      ly += placeSize * 0.15;
    }
    y += boxH;
  }

  if (said.length) {
    y += 50;
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.font = `600 ${lineSize}px ${body}`;
    for (const l of said) {
      y += lineSize * 1.1;
      ctx.fillText(l, m, y);
      y += lineSize * 0.2;
    }
  }
}

// The message for the chats.
export function messageText(
  status: Status,
  weather: Weather,
  t: Texts,
  eventTitle: string,
) {
  const name = t.heading || eventTitle;
  const when = t.details;
  if (status === "on")
    return [
      `${weather === "heat" ? "☀️" : "☔"} Weather update: ${name} is still on!`,
      when,
      t.line,
    ]
      .filter(Boolean)
      .join("\n");
  if (status === "cancelled")
    return [
      `Weather update: we've cancelled ${name}${when ? ` (${when})` : ""} because of the forecast.`,
      t.line,
    ]
      .filter(Boolean)
      .join("\n");
  return [
    `📍 Weather update: ${name} has moved${t.newPlace.trim() ? ` to ${t.newPlace.trim()}` : ""}.`,
    when,
    t.line,
  ]
    .filter(Boolean)
    .join("\n");
}

export function WeatherUpdateMaker({
  event,
  tz,
  forecast = null,
  planDay,
  label = "Weather update",
  className = "text-xs font-medium text-pink-ink hover:underline",
}: {
  event: GraphicEvent & { teamId: string };
  tz: string;
  forecast?: Forecast | null;
  planDay?: string;
  label?: string;
  className?: string;
}) {
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
          forecast={forecast}
          planDay={planDay}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function Maker({
  event,
  tz,
  forecast,
  planDay,
  onClose,
}: {
  event: GraphicEvent & { teamId: string };
  tz: string;
  forecast: Forecast | null;
  planDay?: string;
  onClose: () => void;
}) {
  const [size, setSize] = useState<Size>("post");
  const [status, setStatus] = useState<Status>("on");
  const [weather, setWeather] = useState<Weather>(() => weatherOf(forecast));
  const [texts, setTexts] = useState<Texts>(() =>
    defaults(event, tz, "on", weatherOf(forecast)),
  );
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
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    drawWeatherUpdate(ctx, w, h, texts, status, weather, mark);
  }, [w, h, texts, status, weather, mark, fonts]);

  // Changing the status or weather resets the words that depend on them
  // (keeps the new spot and anything else typed).
  function pick(s: Status, wx: Weather) {
    setStatus(s);
    setWeather(wx);
    setTexts((cur) => ({
      ...defaults(event, tz, s, wx, cur.newPlace),
      kicker: cur.kicker,
      heading: cur.heading,
    }));
  }

  const blob = () =>
    new Promise<Blob | null>((r) => canvas.current?.toBlob(r, "image/png"));
  const fileName = `weather-update-${status}-${size}.png`;
  const text = messageText(status, weather, texts, event.title);

  async function share() {
    setMsg("");
    const b = await blob();
    if (!b) return;
    const file = new File([b], fileName, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.clipboard.writeText(text).catch(() => {});
      await navigator.share({ files: [file] }).catch(() => {});
      return;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = fileName;
    a.click();
  }
  async function copyImage() {
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
  async function copyText() {
    try {
      await navigator.clipboard.writeText(text);
      setMsg("Copied the message.");
    } catch {
      setMsg("Couldn't copy the message.");
    }
  }

  const input =
    "mt-1 block w-full rounded-lg bg-white px-2.5 py-1.5 text-sm text-navy ring-1 ring-stone-300";
  const btn =
    "rounded-xl bg-navy/5 px-3 py-1.5 text-sm font-semibold text-navy hover:bg-navy/10";
  const chip = (on: boolean) =>
    `rounded-full px-3 py-1 text-sm font-medium ring-1 ${on ? "bg-navy text-white ring-navy" : "bg-white text-stone-600 ring-stone-300"}`;
  const field = (key: keyof Texts, label: string, multi = false) => (
    <label className="block text-xs font-medium text-stone-600">
      {label}
      {multi ? (
        <textarea
          rows={2}
          value={texts[key]}
          onChange={(e) => setTexts({ ...texts, [key]: e.target.value })}
          className={input}
        />
      ) : (
        <input
          value={texts[key]}
          onChange={(e) => setTexts({ ...texts, [key]: e.target.value })}
          className={input}
        />
      )}
    </label>
  );

  const forecastLine =
    forecast && (forecast.chance != null || forecast.temp != null)
      ? [
          forecast.chance != null
            ? `${forecast.chance}% chance of rain${forecast.mm != null ? `, about ${Math.round(forecast.mm)} mm` : ""}`
            : null,
          forecast.temp != null ? `up to ${Math.round(forecast.temp)}°C` : null,
        ]
          .filter(Boolean)
          .join(", ")
      : null;

  return (
    <Sheet title="Weather update" onClose={onClose}>
      {forecastLine && (
        <p className="mb-2 text-sm text-stone-600">
          Latest forecast: {forecastLine}.
        </p>
      )}
      <p className="text-xs font-medium text-stone-600">Is it going ahead?</p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {(Object.keys(STATUS) as Status[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => pick(s, weather)}
            className={chip(status === s)}
          >
            {STATUS[s].label}
          </button>
        ))}
      </div>
      {status === "moved" && (
        <label className="mt-3 block text-xs font-medium text-stone-600">
          Where is it now?
          <input
            value={texts.newPlace}
            placeholder="e.g. Under the Town Hall awnings"
            onChange={(e) => setTexts({ ...texts, newPlace: e.target.value })}
            className={input}
            autoFocus
          />
        </label>
      )}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {(["rain", "heat"] as Weather[]).map((wx) => (
          <button
            key={wx}
            type="button"
            onClick={() => pick(status, wx)}
            className={chip(weather === wx)}
          >
            {wx === "rain" ? "Rain" : "Heat"}
          </button>
        ))}
        <span className="mx-1 w-px bg-stone-200" />
        {(Object.keys(SIZES) as Size[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSize(s)}
            className={chip(size === s)}
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
        <button type="button" onClick={copyImage} className={btn}>
          Copy image
        </button>
        <button type="button" onClick={copyText} className={btn}>
          Copy message
        </button>
        <SaveToPlanner
          teamId={event.teamId}
          tz={tz}
          day={planDay}
          note={`Weather update: ${texts.heading}`}
          caption={text}
          platforms={[size === "story" ? "story" : "whatsapp"]}
          getImage={blob}
          className={btn}
        />
      </div>
      {msg && <p className="mt-2 text-sm text-stone-600">{msg}</p>}
      <div className="mt-3 rounded-xl bg-stone-50 p-3 text-sm whitespace-pre-line text-stone-700 ring-1 ring-stone-200">
        {text}
      </div>

      <div className="mt-4 space-y-3">
        {field("kicker", "Small line")}
        {field("word", "Big word")}
        {field("heading", "Event")}
        {field("details", "Date, time and place")}
        {field("line", "Last line", true)}
        <button
          type="button"
          onClick={() =>
            setTexts(defaults(event, tz, status, weather, texts.newPlace))
          }
          className="text-xs text-stone-500 hover:text-navy hover:underline"
        >
          Put the original words back
        </button>
      </div>
    </Sheet>
  );
}
