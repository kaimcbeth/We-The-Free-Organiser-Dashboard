"use client";

import { useEffect, useState } from "react";

const dayIn = (ms: number, tz: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(ms));

function label(now: number, start: number, end: number): string | null {
  if (now >= end) return null;
  if (now >= start) {
    const left = Math.round((end - now) / 60000);
    return left >= 60
      ? `On now · ${Math.floor(left / 60)}h ${String(left % 60).padStart(2, "0")}m left`
      : `On now · ${left}m left`;
  }
  const s = Math.floor((start - now) / 1000);
  if (s < 60) return "Starting now";
  if (s < 3600)
    return `Starts in ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const m = Math.floor(s / 60);
  return `Starts in ${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
}

// A small live countdown on an event's card, only on the day of the event:
// "Starts in 2h 15m", then minutes and seconds in the last hour, then
// "On now · 45m left". Nothing once it's over.
export function Countdown({
  start,
  end,
  tz,
  dark = false,
  className = "",
}: {
  start: string;
  end: string | null;
  tz: string;
  dark?: boolean; // on a navy card
  className?: string;
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const first = setTimeout(() => setNow(Date.now()), 0);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);
  if (now === null) return null;
  const s = Date.parse(start);
  const e = end ? Date.parse(end) : s + 3 * 3600 * 1000;
  if (dayIn(s, tz) !== dayIn(now, tz) && !(now >= s && now < e)) return null;
  const text = label(now, s, e);
  if (!text) return null;
  const on = now >= s;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${
        on
          ? "bg-pink text-navy"
          : dark
            ? "bg-white/15 text-white"
            : "bg-yellow text-navy"
      } ${className}`}
    >
      {on && (
        <span className="relative flex h-1.5 w-1.5" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-navy opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-navy" />
        </span>
      )}
      {text}
    </span>
  );
}
