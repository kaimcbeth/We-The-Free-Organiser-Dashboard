"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Player = {
  device: string;
  laptop: string;
  state: "idle" | "playing" | "paused" | "survey";
  film: string | null;
  language: string | null;
  seconds_left: number | null;
  duration: number | null;
  viewers: number | null;
  ends_at: string | null;
  updated_at: string;
};

const WARN = 10; // seconds before the end to alert
const OFFLINE = 45; // seconds without a word from a laptop

const mmss = (s: number) => {
  const t = Math.max(0, Math.ceil(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

// A short two-tone beep (needs a tap on "Turn on alerts" first).
function beep(ctx: AudioContext) {
  [0, 0.22].forEach((at, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = i ? 1046 : 784;
    g.gain.setValueAtTime(0.0001, ctx.currentTime + at);
    g.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.2);
    o.connect(g).connect(ctx.destination);
    o.start(ctx.currentTime + at);
    o.stop(ctx.currentTime + at + 0.22);
  });
}

// Live screen for the event: each laptop's film and countdown, with an alert
// just before a film ends so a volunteer can be there for the chat.
export function LivePlayers({ teamId }: { teamId: string }) {
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [skew, setSkew] = useState(0); // server clock minus this phone's clock
  const [now, setNow] = useState(0);
  const [alertsOn, setAlertsOn] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const lock = useRef<WakeLockSentinel | null>(null);
  const alerted = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    const { data } = await createClient().rpc("live_players", {
      p_team_id: teamId,
    });
    const d = data as { now: string; players: Player[] } | null;
    if (!d) return;
    setSkew(new Date(d.now).getTime() - Date.now());
    setPlayers(d.players);
  }, [teamId]);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 3000);
    const tick = setInterval(() => setNow(Date.now()), 250);
    return () => {
      clearTimeout(first);
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [load]);

  const serverNow = now + skew;
  const left = (p: Player) =>
    p.ends_at ? (new Date(p.ends_at).getTime() - serverNow) / 1000 : null;
  const offline = (p: Player) =>
    serverNow - new Date(p.updated_at).getTime() > OFFLINE * 1000;

  // Alert once per film, as it crosses the warning line.
  useEffect(() => {
    if (!players || !now) return;
    for (const p of players) {
      const s = left(p);
      if (p.state !== "playing" || s === null || offline(p)) continue;
      const key = `${p.device}|${p.ends_at?.slice(0, 19)}`;
      if (s <= WARN && s > -5 && !alerted.current.has(key)) {
        alerted.current.add(key);
        if (!alertsOn) continue;
        if (audio.current) beep(audio.current);
        navigator.vibrate?.([200, 100, 200]);
        if ("Notification" in window && Notification.permission === "granted") {
          navigator.serviceWorker?.ready
            .then((r) =>
              r.showNotification(`${p.laptop} is finishing`, {
                body: `${p.film ?? "Film"} ends in ${Math.max(0, Math.round(s))} seconds`,
                tag: `player-${p.device}`,
              }),
            )
            .catch(() => {});
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, players, alertsOn]);

  async function turnOnAlerts() {
    try {
      audio.current ??= new AudioContext();
      await audio.current.resume();
      beep(audio.current);
    } catch {}
    try {
      if ("Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission();
      }
    } catch {}
    try {
      lock.current = await navigator.wakeLock.request("screen");
    } catch {}
    setAlertsOn(true);
  }

  // Keep the screen awake again after switching back to this tab.
  useEffect(() => {
    const again = async () => {
      if (alertsOn && document.visibilityState === "visible") {
        try {
          lock.current = await navigator.wakeLock.request("screen");
        } catch {}
      }
    };
    document.addEventListener("visibilitychange", again);
    return () => document.removeEventListener("visibilitychange", again);
  }, [alertsOn]);

  if (!players) return null;

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Live at the event
        </h2>
        {players.length > 0 &&
          (alertsOn ? (
            <span className="text-xs font-medium text-stone-500">
              Alerts on · keep this page open
            </span>
          ) : (
            <button
              type="button"
              onClick={turnOnAlerts}
              className="rounded-full bg-pink px-3.5 py-1.5 text-xs font-semibold text-navy hover:bg-pink-strong"
            >
              Turn on alerts
            </button>
          ))}
      </div>
      {players.length === 0 ? (
        <p className="mt-1 text-sm text-stone-600">
          Laptops show here while the player is open and online (a phone hotspot
          is fine), with a countdown for each film and an alert {WARN} seconds
          before it ends. Each laptop asks for its name (A, B, C…) when the
          player opens at an event.
        </p>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {players.map((p) => {
            const s = left(p);
            const off = offline(p);
            const ending =
              !off && p.state === "playing" && s !== null && s <= WARN;
            const tone = off
              ? "bg-stone-100 text-stone-500 ring-stone-200"
              : ending
                ? "bg-pink text-navy ring-4 ring-pink/40 motion-safe:animate-[ring_1s_ease-in-out_infinite]"
                : p.state === "playing" || p.state === "paused"
                  ? "bg-navy text-white ring-navy"
                  : p.state === "survey"
                    ? "bg-cyan/25 text-navy ring-cyan"
                    : "bg-white text-navy ring-black/5";
            const what = off
              ? "Offline"
              : p.state === "playing"
                ? ending
                  ? s! > 0
                    ? `Finishing in ${Math.ceil(s!)}s`
                    : "Finishing now"
                  : `${mmss(s ?? 0)} left`
                : p.state === "paused"
                  ? `Paused · ${mmss(p.seconds_left ?? 0)} left`
                  : p.state === "survey"
                    ? "Answering the question"
                    : "Free";
            return (
              <li
                key={p.device}
                className={`rounded-2xl p-4 shadow-sm ring-1 ${tone}`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-2xl font-bold">{p.laptop}</span>
                  <span className="text-lg font-semibold tabular-nums">
                    {what}
                  </span>
                </div>
                <p className="mt-1 text-sm opacity-80">
                  {off
                    ? "Not heard from it for a while (hotspot or player closed?)."
                    : p.film && p.state !== "idle"
                      ? [
                          p.film,
                          p.language && p.language !== "English"
                            ? p.language
                            : null,
                          p.viewers ? `${p.viewers} watching` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : "On the menu"}
                </p>
                {!off &&
                  (p.state === "playing" || p.state === "paused") &&
                  p.duration && (
                    <Progress
                      left={
                        p.state === "playing" ? (s ?? 0) : (p.seconds_left ?? 0)
                      }
                      total={p.duration}
                      ending={ending}
                    />
                  )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// How far along the film is: a bar plus "1:48 / 3:12".
function Progress({
  left,
  total,
  ending,
}: {
  left: number;
  total: number;
  ending: boolean;
}) {
  const done = Math.min(total, Math.max(0, total - left));
  return (
    <div className="mt-3">
      <div
        className={`h-2.5 overflow-hidden rounded-full ${ending ? "bg-navy/20" : "bg-white/15"}`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 ease-linear ${ending ? "bg-navy" : "bg-pink"}`}
          style={{ width: `${(done / total) * 100}%` }}
        />
      </div>
      <p className="mt-1 text-xs tabular-nums opacity-75">
        {mmss(done)} / {mmss(total)}
      </p>
    </div>
  );
}
