"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { loadPosterFonts } from "@/components/graphic-poster";

// A Movie Challenge day in numbers (Kai, 2 Nov 2026): how many watched, the
// average impact, languages and films, tapouts. Copy it as text for the
// group chat, or as a We The Free image to post (no tapouts on the image).

type Answer = {
  film: string;
  language: string | null;
  impact: number | null;
  answered_at: string;
  laptop: string | null;
};

const NAVY = "#071130";
const PINK = "#ff47b9";
const CYAN = "#2fd9df";
const YELLOW = "#ffd90f";

const dayKey = (iso: string, tz: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(iso));
const dayLabel = (key: string, long = false) =>
  new Intl.DateTimeFormat("en-AU", {
    timeZone: "UTC",
    weekday: long ? "long" : "short",
    day: "numeric",
    month: long ? "long" : "short",
  }).format(new Date(`${key}T12:00:00Z`));

export type Day = {
  watched: number;
  answered: number;
  avg: number | null;
  tapouts: number;
  languages: [string, number][];
  films: [string, number][];
  laptops: number;
};

function summarise(answers: Answer[], stops: number): Day {
  const langs = new Map<string, number>();
  const films = new Map<string, number>();
  const laptops = new Set<string>();
  let sum = 0;
  let n = 0;
  for (const a of answers) {
    const l = a.language || "English";
    langs.set(l, (langs.get(l) ?? 0) + 1);
    films.set(a.film, (films.get(a.film) ?? 0) + 1);
    if (a.laptop) laptops.add(a.laptop);
    if (a.impact !== null) {
      sum += a.impact;
      n++;
    }
  }
  const sorted = (m: Map<string, number>) =>
    [...m.entries()].sort((x, y) => y[1] - x[1]);
  return {
    watched: answers.length,
    answered: n,
    avg: n ? sum / n : null,
    tapouts: stops,
    languages: sorted(langs),
    films: sorted(films),
    laptops: laptops.size,
  };
}

const list = (xs: [string, number][]) =>
  xs.map(([k, v]) => `${k} ${v}`).join(", ");

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((ok, fail) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = fail;
    img.src = url;
  });

// The post: 1080 × 1350, navy, logo, big numbers.
export function drawDaySummary(
  canvas: HTMLCanvasElement,
  d: Day,
  key: string,
  community: string | null,
  logo: HTMLImageElement | null,
  showImpact: boolean,
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
  // Soft colour in the corners.
  const glow = (x: number, y: number, r: number, c: string) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, c);
    g.addColorStop(1, "rgba(7,17,48,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  };
  glow(W, 0, 620, "rgba(255,71,185,0.28)");
  glow(0, H, 560, "rgba(47,217,223,0.22)");

  const pad = 110;
  let y = 90;
  if (logo) {
    const h = 70;
    ctx.drawImage(logo, pad, y, (logo.width / logo.height) * h, h);
  }
  y += 150;
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "alphabetic";
  ctx.font = `92px ${display}`;
  ctx.fillText("3 MINUTE MOVIE", pad, y);
  y += 92;
  ctx.fillText("CHALLENGE", pad, y);
  y += 60;
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = `600 36px ${body}`;
  ctx.fillText(
    [community, dayLabel(key, true)].filter(Boolean).join(" · "),
    pad,
    y,
  );

  const stats: [string, string, string][] = [
    [
      String(d.watched),
      d.watched === 1 ? "person watched the film" : "people watched the film",
      PINK,
    ],
  ];
  if (showImpact && d.avg !== null)
    stats.push([
      d.avg.toFixed(1),
      "out of 10: how much it impacted them",
      CYAN,
    ]);
  if (d.languages.length > 1)
    stats.push([String(d.languages.length), "languages", YELLOW]);
  else if (d.films.length > 1)
    stats.push([String(d.films.length), "versions of the film", YELLOW]);

  y += 120;
  const gap = (H - 160 - y) / Math.max(stats.length, 1);
  for (const [n, label, colour] of stats) {
    ctx.fillStyle = colour;
    ctx.font = `150px ${display}`;
    ctx.fillText(n, pad, y + 130);
    const nw = ctx.measureText(n).width;
    ctx.fillStyle = "#ffffff";
    ctx.font = `600 38px ${body}`;
    const words = label.split(" ");
    let line = "";
    const lines: string[] = [];
    const max = W - pad * 2 - nw - 40;
    for (const w of words) {
      const t = line ? `${line} ${w}` : w;
      if (ctx.measureText(t).width > max && line) {
        lines.push(line);
        line = w;
      } else line = t;
    }
    if (line) lines.push(line);
    lines.slice(0, 3).forEach((l, i) => {
      ctx.fillText(l, pad + nw + 40, y + 70 + i * 46);
    });
    y += Math.min(gap, 230);
  }

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = `600 32px ${body}`;
  ctx.fillText("activism.wtf", pad, H - 90);
}

// Running total of films watched through the day (Kai, 12 Nov 2026: "a graph
// for total video views throughout the duration of a 3MMC"). Every answer row
// (including skips) is one view, at the time the question came up.
const hourLabel = (ms: number, tz: string) =>
  new Intl.DateTimeFormat("en-AU", { timeZone: tz, hour: "numeric" })
    .format(new Date(ms))
    .replace(/\s/g, "")
    .toLowerCase();

export function ViewsChart({ times, tz }: { times: number[]; tz: string }) {
  if (times.length < 2) return null;
  const sorted = [...times].sort((a, b) => a - b);
  const H = 36e5;
  const Q = H / 4;
  const start = Math.floor(sorted[0] / Q) * Q;
  const end = Math.max(Math.ceil(sorted[sorted.length - 1] / Q) * Q, start + H);
  const total = sorted.length;
  const W = 600;
  const Ht = 190;
  const pad = { l: 34, r: 12, t: 12, b: 24 };
  const x = (t: number) =>
    pad.l + ((t - start) / (end - start)) * (W - pad.l - pad.r);
  const y = (n: number) => pad.t + (1 - n / total) * (Ht - pad.t - pad.b);
  // Step line: flat until each view, then up by one.
  let d = `M${x(start)},${y(0)}`;
  sorted.forEach((t, i) => {
    d += ` H${x(t).toFixed(1)} V${y(i + 1).toFixed(1)}`;
  });
  d += ` H${x(end)}`;
  const area = `${d} V${y(0)} H${x(start)} Z`;
  const span = (end - start) / H;
  const step = span > 8 ? 2 * H : H;
  const ticks: number[] = [];
  for (let t = Math.ceil(start / H) * H; t <= end; t += step) ticks.push(t);
  const perHour = new Map<number, number>();
  for (const t of sorted) {
    const h = Math.floor(t / H) * H;
    perHour.set(h, (perHour.get(h) ?? 0) + 1);
  }
  const [peakAt, peakN] = [...perHour.entries()].sort((a, b) => b[1] - a[1])[0];
  const yTicks = [...new Set([0, Math.round(total / 2), total])];
  return (
    <figure className="mt-3">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-stone-500">
        <span className="font-medium text-stone-700">
          Films watched through the day
        </span>
        <span>
          Busiest hour: {hourLabel(peakAt, tz)}–{hourLabel(peakAt + H, tz)} (
          {peakN})
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${Ht}`}
        className="mt-1 w-full"
        role="img"
        aria-label={`${total} films watched between ${hourLabel(start, tz)} and ${hourLabel(end, tz)}`}
      >
        {yTicks.map((n) => (
          <g key={n}>
            <line
              x1={pad.l}
              x2={W - pad.r}
              y1={y(n)}
              y2={y(n)}
              stroke="#e7e5e4"
              strokeWidth="1"
            />
            <text
              x={pad.l - 6}
              y={y(n) + 4}
              textAnchor="end"
              fontSize="11"
              fill="#78716c"
            >
              {n}
            </text>
          </g>
        ))}
        <path d={area} fill="#ff47b9" fillOpacity="0.12" />
        <path d={d} fill="none" stroke="#ff47b9" strokeWidth="2.5" />
        {ticks.map((t) => (
          <text
            key={t}
            x={x(t)}
            y={Ht - 6}
            textAnchor="middle"
            fontSize="11"
            fill="#78716c"
          >
            {hourLabel(t, tz)}
          </text>
        ))}
      </svg>
    </figure>
  );
}

export function MovieDaySummary({
  teamId,
  tz,
  community,
  day,
}: {
  teamId: string;
  tz: string;
  community: string | null;
  day?: string; // YYYY-MM-DD in the team's time zone (event pages)
}) {
  const [answers, setAnswers] = useState<Answer[] | null>(null);
  const [stopDays, setStopDays] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(day ?? null);
  const [open, setOpen] = useState(false);
  const [showImpact, setShowImpact] = useState(true);
  const [copied, setCopied] = useState("");
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [fonts, setFonts] = useState(false);
  const [tick, setTick] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);

  // Keep the numbers and graph fresh during the day (once a minute).
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") setTick((n) => n + 1);
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let live = true;
    const since = new Date(Date.now() - 90 * 864e5).toISOString();
    Promise.all([
      supabase
        .from("film_survey_responses")
        .select("film, language, impact, answered_at, laptop")
        .eq("team_id", teamId)
        .gte("answered_at", since)
        .order("answered_at", { ascending: false })
        .limit(5000),
      supabase
        .from("film_stops")
        .select("stopped_on")
        .eq("team_id", teamId)
        .gte("stopped_on", since)
        .limit(5000),
    ]).then(([a, s]) => {
      if (!live) return;
      setAnswers((a.data ?? []) as Answer[]);
      setStopDays(
        ((s.data ?? []) as { stopped_on: string }[]).map((x) =>
          dayKey(x.stopped_on, tz),
        ),
      );
    });
    return () => {
      live = false;
    };
  }, [teamId, tz, tick]);

  const days = useMemo(() => {
    const seen: string[] = [];
    for (const a of answers ?? []) {
      const k = dayKey(a.answered_at, tz);
      if (!seen.includes(k)) seen.push(k);
    }
    return seen;
  }, [answers, tz]);
  const key = picked ?? days[0] ?? null;
  const times = useMemo(
    () =>
      key && answers
        ? answers
            .filter((a) => dayKey(a.answered_at, tz) === key)
            .map((a) => Date.parse(a.answered_at))
        : [],
    [key, answers, tz],
  );
  const summary = useMemo(
    () =>
      key && answers
        ? summarise(
            answers.filter((a) => dayKey(a.answered_at, tz) === key),
            stopDays.filter((d) => d === key).length,
          )
        : null,
    [key, answers, stopDays, tz],
  );

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

  useEffect(() => {
    if (open && canvas.current && summary && key)
      drawDaySummary(canvas.current, summary, key, community, logo, showImpact);
  }, [open, summary, key, community, logo, showImpact, fonts]);

  if (!answers) return null;
  if (day && !summary?.watched) return null; // event page: nothing yet
  if (!key || !summary) return null;

  const text = [
    `3 Minute Movie Challenge${community ? ` · ${community}` : ""} · ${dayLabel(key, true)}`,
    `${summary.watched} ${summary.watched === 1 ? "person" : "people"} watched the film`,
    summary.avg !== null
      ? `Average impact: ${summary.avg.toFixed(1)} / 10 (${summary.answered} answer${summary.answered === 1 ? "" : "s"})`
      : null,
    summary.languages.length > 1
      ? `Languages: ${list(summary.languages)}`
      : null,
    summary.films.length > 1 ? `Films: ${list(summary.films)}` : null,
    `Tapouts: ${summary.tapouts}`,
  ]
    .filter(Boolean)
    .join("\n");

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied("text");
    } catch {
      setCopied("failed");
    }
    setTimeout(() => setCopied(""), 2500);
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
      setCopied("image");
    } catch {
      setCopied("failed");
    }
    setTimeout(() => setCopied(""), 2500);
  }
  async function shareImage() {
    const file = new File([await blob()], `movie-challenge-${key}.png`, {
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
    <section className="mt-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">
          Day summary{day ? "" : `: ${dayLabel(key)}`}
        </h2>
        {!day && days.length > 1 && (
          <select
            value={key}
            onChange={(e) => setPicked(e.target.value)}
            aria-label="Which day"
            className="rounded-lg bg-white px-2 py-1 text-sm ring-1 ring-black/10"
          >
            {days.map((d) => (
              <option key={d} value={d}>
                {dayLabel(d)}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stat(String(summary.watched), "watched")}
        {stat(
          summary.avg !== null ? summary.avg.toFixed(1) : "–",
          "average impact /10",
        )}
        {stat(String(summary.languages.length), "languages")}
        {stat(String(summary.tapouts), "tapouts")}
      </div>
      <ViewsChart times={times} tz={tz} />
      {(summary.languages.length > 1 || summary.films.length > 1) && (
        <p className="mt-2 text-sm text-stone-600">
          {[
            summary.languages.length > 1 ? list(summary.languages) : null,
            summary.films.length > 1 ? list(summary.films) : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-xl bg-pink px-3.5 py-2 text-sm font-semibold text-navy hover:bg-pink-strong"
        >
          {open ? "Hide image" : "Make a post"}
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
          <label className="mt-2 flex items-center gap-2 text-xs text-stone-600">
            <input
              type="checkbox"
              checked={showImpact}
              onChange={(e) => setShowImpact(e.target.checked)}
            />
            Show the average impact on the image
          </label>
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
