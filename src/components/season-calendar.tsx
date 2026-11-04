"use client";

import { useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/sheet";
import { ChatMessageSheet } from "@/components/incident-form-sheet";
import { createClient } from "@/lib/supabase/client";
import { grain, loadPosterFonts } from "@/components/graphic-poster";
import {
  DISPLAY,
  H,
  NAVY,
  PINK,
  W,
  YELLOW,
  bodyFont,
  communityLabel,
  fit,
  loadImage,
  logo,
  wrap,
} from "@/components/recap-maker";

// Seasonal calendar (Kai, 5 Nov 2026; action promo_season_calendar, 0183):
// one 4:5 graphic with the season's highlights. Kept short (MAX rows):
// special events first, then trainings, collabs and new one-off events;
// regular repeats (e.g. weekly co-working) become one "Every Wednesday" row.

export const MAX_ROWS = 8;
const URL_TEXT = "www.activism.wtf";
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
const SOUTH: Record<number, string> = {
  12: "Summer",
  3: "Autumn",
  6: "Winter",
  9: "Spring",
};
const NORTH: Record<number, string> = {
  12: "Winter",
  3: "Spring",
  6: "Summer",
  9: "Autumn",
};

export type SeasonEvent = {
  id: string;
  title: string;
  starts_at: string;
  venue: string | null;
  address: string | null;
  description: string | null;
  special_event_id: string | null;
  time_unknown: boolean | null;
  event_type: { name: string } | null;
};

export type Tag = "Special" | "Training" | "Collab" | "New" | null;
export type Row = {
  key: string;
  title: string;
  first: string; // starts_at of the first date
  dates: number; // how many dates this season
  weekday: string | null; // "Wednesday" when every date is on the same day
  place: string | null;
  tag: Tag;
  score: number;
};

const norm = (t: string) =>
  t
    .toLowerCase()
    .replace(/^wtf[:\s-]*/, "")
    .replace(/\d+(st|nd|rd|th)?/g, "")
    .replace(
      /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/g,
      "",
    )
    .replace(/[^a-z]+/g, " ")
    .trim();

const isTraining = (e: SeasonEvent) =>
  /workshop|training|masterclass|skill ?share|bootcamp/i.test(
    `${e.event_type?.name ?? ""} ${e.title}`,
  );
const isCollab = (e: SeasonEvent) =>
  /\b(collab|collaboration|partnered|partnering|in partnership|co-?hosted|joint)\b|\s[x×]\s/i.test(
    `${e.title} ${(e.description ?? "").slice(0, 400)}`,
  ) || /\bwith\s+[A-Z]/.test(e.title.replace(/^WTF[:\s-]*/i, ""));

const TAG_SCORE: Record<string, number> = {
  Special: 5,
  Training: 4,
  Collab: 3,
  New: 2,
};

const weekly = (list: SeasonEvent[]) => {
  if (list.length < 3) return false;
  const gaps = list
    .slice(1)
    .map((x, i) => Date.parse(x.starts_at) - Date.parse(list[i].starts_at));
  return gaps.filter((g) => g <= 8 * 864e5).length >= gaps.length * 0.7;
};

// Group the season's events into rows and rank them.
export function seasonRows(
  events: SeasonEvent[],
  pastTitles: Set<string>,
  tz: string,
): Row[] {
  const dayName = new Intl.DateTimeFormat("en-AU", {
    timeZone: tz,
    weekday: "long",
  });
  const groups = new Map<string, SeasonEvent[]>();
  for (const e of [...events].sort((a, b) =>
    a.starts_at.localeCompare(b.starts_at),
  )) {
    const k = norm(e.title) || e.id;
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }
  const rows: Row[] = [];
  for (const [key, list] of groups) {
    const e = list[0];
    const days = new Set(
      list.map((x) => dayName.format(new Date(x.starts_at))),
    );
    const tag: Tag = list.some((x) => x.special_event_id)
      ? "Special"
      : list.some(isTraining)
        ? "Training"
        : list.some(isCollab)
          ? "Collab"
          : list.length === 1 && !pastTitles.has(key)
            ? "New"
            : null;
    rows.push({
      key,
      title: e.title.replace(/^WTF[:\s-]*/i, "").trim(),
      first: e.starts_at,
      dates: list.length,
      // "Every Wednesday" only for weekly repeats (most gaps a week; a
      // holiday break is fine).
      weekday: weekly(list) && days.size === 1 ? [...days][0] : null,
      place: e.venue || (e.address ? e.address.split(",")[0] : null),
      tag,
      score: tag ? TAG_SCORE[tag] : list.length > 1 ? 0 : 1,
    });
  }
  return rows;
}

// The rows ticked to start with: highest priority first, then soonest.
export function pickRows(rows: Row[], max = MAX_ROWS) {
  return new Set(
    [...rows]
      .sort((a, b) => b.score - a.score || a.first.localeCompare(b.first))
      .slice(0, max)
      .map((r) => r.key),
  );
}

export function seasonOf(
  start: { year: number; month: number },
  south: boolean,
) {
  const name = (south ? SOUTH : NORTH)[start.month] ?? "Season";
  const endMonth = ((start.month + 1) % 12) + 1;
  return {
    name,
    range: `${MONTHS[start.month - 1]} – ${MONTHS[endMonth - 1]}`,
  };
}

export function drawSeason(
  ctx: CanvasRenderingContext2D,
  d: {
    season: string;
    range: string;
    rows: Row[];
    more: number;
    community: string;
    tz: string;
    mark: HTMLImageElement | null;
  },
) {
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, W, H);
  grain(ctx, W, H);
  logo(ctx, d.mark);
  const x = 72;
  const width = W - 2 * x;
  const font = bodyFont();
  ctx.textBaseline = "alphabetic";
  ctx.font = `800 32px ${font}`;
  ctx.letterSpacing = "6px";
  ctx.fillStyle = PINK;
  ctx.fillText("WHAT'S ON THIS", x, 180);
  ctx.letterSpacing = "0px";
  const title = d.season.toUpperCase();
  const size = fit(
    ctx,
    title,
    (s) => `${s}px ${DISPLAY}`,
    width - 160,
    128,
    80,
  );
  ctx.fillStyle = "#ffffff";
  ctx.fillText(title, x - 4, 180 + size + 4);
  ctx.font = `600 32px ${font}`;
  ctx.letterSpacing = "3px";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText(d.range.toUpperCase(), x, 180 + size + 58);
  ctx.letterSpacing = "0px";
  let y = 180 + size + 104;

  const rows = [...d.rows].sort((a, b) => a.first.localeCompare(b.first));
  if (!rows.length) {
    ctx.font = `500 40px ${font}`;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (const l of wrap(
      ctx,
      `New events are on the way. Find them at ${URL_TEXT}`,
      width,
      3,
    )) {
      y += 56;
      ctx.fillText(l, x, y);
    }
  }
  const bottom = H - 180 - (d.more ? 44 : 0);
  const rowH = Math.min(
    130,
    Math.floor((bottom - y) / Math.max(1, rows.length)),
  );
  const big = Math.min(56, rowH - 50);
  const mon = new Intl.DateTimeFormat("en-AU", {
    timeZone: d.tz,
    month: "short",
  });
  const day = new Intl.DateTimeFormat("en-AU", {
    timeZone: d.tz,
    day: "numeric",
  });
  for (const r of rows) {
    const at = new Date(r.first);
    ctx.font = `800 22px ${font}`;
    ctx.letterSpacing = "3px";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText(r.weekday ? "EVERY" : mon.format(at).toUpperCase(), x, y + 26);
    ctx.letterSpacing = "0px";
    ctx.font = `${r.weekday ? Math.round(big * 0.85) : big}px ${DISPLAY}`;
    ctx.fillStyle = YELLOW;
    ctx.fillText(
      r.weekday ? r.weekday.slice(0, 3).toUpperCase() : day.format(at),
      x,
      y + 26 + big,
    );
    const tx = x + 150;
    let tw = width - 150;
    // Tag pill on the right of the title line.
    if (r.tag) {
      ctx.font = `800 20px ${font}`;
      ctx.letterSpacing = "2px";
      const label = r.tag.toUpperCase();
      const pw = ctx.measureText(label).width + 28;
      const px = W - x - pw;
      ctx.fillStyle =
        r.tag === "Special"
          ? PINK
          : r.tag === "Training"
            ? "#5ce1e6"
            : r.tag === "Collab"
              ? YELLOW
              : "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.roundRect(px, y + 6, pw, 34, 17);
      ctx.fill();
      ctx.fillStyle = NAVY;
      ctx.fillText(label, px + 14, y + 30);
      ctx.letterSpacing = "0px";
      tw -= pw + 16;
    }
    ctx.font = `700 ${rowH < 100 ? 32 : 38}px ${font}`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(wrap(ctx, r.title, tw, 1)[0], tx, y + 36);
    ctx.font = `500 ${rowH < 100 ? 24 : 28}px ${font}`;
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    const sub = [
      r.weekday ? `${r.weekday}s` : r.dates > 1 ? `${r.dates} dates` : null,
      r.place,
    ]
      .filter(Boolean)
      .join("  ·  ");
    if (sub)
      ctx.fillText(
        wrap(ctx, sub, width - 150, 1)[0],
        tx,
        y + (rowH < 100 ? 70 : 76),
      );
    y += rowH;
  }
  if (d.more) {
    ctx.font = `600 28px ${font}`;
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText(`+ ${d.more} more at ${URL_TEXT}`, x, H - 182);
  }
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, H - 150);
  ctx.lineTo(W - x, H - 150);
  ctx.stroke();
  ctx.font = `700 34px ${font}`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(URL_TEXT, x, H - 86);
  ctx.font = `600 26px ${font}`;
  ctx.letterSpacing = "3px";
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  const cw = ctx.measureText(d.community).width;
  ctx.fillText(d.community, W - x - cw, H - 88);
  ctx.letterSpacing = "0px";
}

type Team = { name: string; timezone: string; lat: number | null };

// "Make the calendar" on the Seasonal calendar posted action.
export function SeasonCalendarButton({
  teamId,
  dueAt,
  className,
}: {
  teamId: string;
  dueAt: string; // the day before the season starts
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        Make the calendar
      </button>
      {open && (
        <Sheet title="Seasonal calendar" onClose={() => setOpen(false)}>
          <SeasonCalendar teamId={teamId} dueAt={dueAt} />
        </Sheet>
      )}
    </>
  );
}

export function SeasonCalendar({
  teamId,
  dueAt,
  initial,
}: {
  teamId: string;
  dueAt: string;
  initial?: { team: Team; events: SeasonEvent[]; past: string[] }; // tests
}) {
  const [team, setTeam] = useState<Team | null>(initial?.team ?? null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [mark, setMark] = useState<HTMLImageElement | null>(null);
  const [fonts, setFonts] = useState(false);
  const [msg, setMsg] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);

  const tz = team?.timezone ?? "Australia/Sydney";
  // The season starts the day after the action is due.
  const startParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
  })
    .format(new Date(Date.parse(dueAt) + 36 * 36e5))
    .split("-")
    .map(Number);
  const start = { year: startParts[0], month: startParts[1] };
  const south =
    team?.lat != null
      ? team.lat < 0
      : /^(Australia|Pacific\/Auckland|Antarctica)/.test(tz);
  const season = seasonOf(start, south);

  useEffect(() => {
    let live = true;
    loadPosterFonts()?.then(() => live && setFonts(true));
    loadImage("/brand/wtf-mark.png")
      .then((img) => live && setMark(img))
      .catch(() => {});
    const done = (t: Team, events: SeasonEvent[], past: string[]) => {
      if (!live) return;
      const r = seasonRows(events, new Set(past.map(norm)), t.timezone);
      setTeam(t);
      setRows(r);
      setPicked(pickRows(r));
    };
    if (initial) {
      done(initial.team, initial.events, initial.past);
      return () => {
        live = false;
      };
    }
    (async () => {
      const db = createClient();
      const { data: t } = await db
        .from("teams")
        .select("name, timezone, lat")
        .eq("id", teamId)
        .maybeSingle<Team>();
      if (!t) return;
      const from = new Date(Date.UTC(start.year, start.month - 1, 1) - 864e5);
      const to = new Date(Date.UTC(start.year, start.month + 2, 1) + 864e5);
      const ym = new Intl.DateTimeFormat("en-CA", {
        timeZone: t.timezone,
        year: "numeric",
        month: "2-digit",
      });
      const inSeason = (iso: string) => {
        const [y, m] = ym.format(new Date(iso)).split("-").map(Number);
        const n = (y - start.year) * 12 + (m - start.month);
        return n >= 0 && n < 3;
      };
      const [{ data: ev }, { data: past }] = await Promise.all([
        db
          .from("events")
          .select(
            "id, title, starts_at, venue, address, description, special_event_id, time_unknown, event_type:event_types(name)",
          )
          .eq("team_id", teamId)
          .gte("starts_at", from.toISOString())
          .lt("starts_at", to.toISOString())
          .order("starts_at")
          .returns<SeasonEvent[]>(),
        db
          .from("events")
          .select("title")
          .eq("team_id", teamId)
          .lt("starts_at", from.toISOString())
          .gte(
            "starts_at",
            new Date(from.getTime() - 365 * 864e5).toISOString(),
          )
          .returns<{ title: string }[]>(),
      ]);
      done(
        t,
        (ev ?? []).filter((e) => inSeason(e.starts_at)),
        (past ?? []).map((p) => p.title),
      );
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once
  }, [teamId]);

  const shown = (rows ?? []).filter((r) => picked.has(r.key));
  const more = (rows ?? []).length - shown.length;
  const community = communityLabel(team?.name ?? "");

  useEffect(() => {
    const c = canvas.current;
    if (!c || !rows) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    drawSeason(ctx, {
      season: season.name,
      range: season.range,
      rows: shown,
      more,
      community,
      tz,
      mark,
    });
  });

  function toggle(key: string) {
    const next = new Set(picked);
    if (next.has(key)) next.delete(key);
    else if (next.size >= MAX_ROWS) {
      setMsg(`Up to ${MAX_ROWS} fit. Untick one first.`);
      return;
    } else next.add(key);
    setMsg("");
    setPicked(next);
  }

  async function blob() {
    return new Promise<Blob | null>((r) =>
      canvas.current?.toBlob(r, "image/png"),
    );
  }
  async function share() {
    const b = await blob();
    if (!b) return;
    const file = new File([b], `${season.name.toLowerCase()}-calendar.png`, {
      type: "image/png",
    });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return;
      } catch {
        return;
      }
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = file.name;
    a.click();
  }
  async function copyText() {
    const day = new Intl.DateTimeFormat("en-AU", {
      timeZone: tz,
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    const lines = [...shown]
      .sort((a, b) => a.first.localeCompare(b.first))
      .map(
        (r) =>
          `• ${r.weekday ? `Every ${r.weekday}` : day.format(new Date(r.first))}: ${r.title}${r.place ? ` (${r.place})` : ""}`,
      );
    await navigator.clipboard
      .writeText(
        [
          `What's on this ${season.name.toLowerCase()} 🗓️`,
          "",
          ...lines,
          ...(more ? ["", `+ ${more} more at ${URL_TEXT}`] : []),
        ].join("\n"),
      )
      .then(() => setMsg("Copied the list."))
      .catch(() => setMsg("Couldn't copy. Try again?"));
  }

  const fmt = new Intl.DateTimeFormat("en-AU", {
    timeZone: tz,
    day: "numeric",
    month: "short",
  });
  const sorted = [...(rows ?? [])].sort(
    (a, b) => b.score - a.score || a.first.localeCompare(b.first),
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600">
        {season.name} ({season.range}): the season&apos;s highlights as one
        post. Up to {MAX_ROWS} events fit, so special events, trainings, collabs
        and new events go first. Tick to swap.
      </p>
      {!rows ? (
        <p className="text-sm text-stone-400">
          Loading the season&apos;s events…
        </p>
      ) : (
        <>
          <canvas
            ref={canvas}
            width={W}
            height={H}
            data-fonts={fonts ? "1" : "0"}
            className="mx-auto block w-full max-w-[360px] rounded-xl shadow"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={share}
              className="rounded-xl bg-pink px-3 py-1.5 text-sm font-semibold text-navy hover:bg-pink-strong"
            >
              Share or download
            </button>
            <button
              type="button"
              onClick={copyText}
              className="rounded-xl bg-navy/5 px-3 py-1.5 text-sm font-semibold text-navy hover:bg-navy/10"
            >
              Copy as text
            </button>
          </div>
          {msg && <p className="text-sm text-stone-600">{msg}</p>}
          <ul className="divide-y divide-black/5 rounded-xl ring-1 ring-black/5">
            {sorted.length === 0 && (
              <li className="p-3 text-sm text-stone-500">
                No events in {season.range} yet. Add them on activism.wtf and
                they&apos;ll show here within the hour.
              </li>
            )}
            {sorted.map((r) => (
              <li key={r.key}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={picked.has(r.key)}
                    onChange={() => toggle(r.key)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-navy">
                      {r.title}
                    </span>
                    <span className="block text-xs text-stone-500">
                      {r.weekday
                        ? `Every ${r.weekday} (${r.dates} dates)`
                        : r.dates > 1
                          ? `${r.dates} dates from ${fmt.format(new Date(r.first))}`
                          : fmt.format(new Date(r.first))}
                    </span>
                  </span>
                  {r.tag && (
                    <span className="shrink-0 rounded-full bg-navy/5 px-2 py-0.5 text-xs font-semibold text-navy">
                      {r.tag}
                    </span>
                  )}
                </label>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// The season an action is for: the one starting `daysBefore` days after it's
// due (southern hemisphere by time zone).
export function seasonForDue(dueAt: string, tz: string, daysBefore: number) {
  const [y, m] = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
  })
    .format(new Date(Date.parse(dueAt) + (daysBefore + 0.5) * 864e5))
    .split("-")
    .map(Number);
  return seasonOf(
    { year: y, month: m },
    /^(Australia|Pacific\/Auckland|Antarctica)/.test(tz),
  );
}

// "Event hosts asked for next season" (0184, Kai): ready-made messages for
// the community chat.
export function SeasonHostsSheet({
  teamId,
  dueAt,
  tz,
  className,
}: {
  teamId: string;
  dueAt: string; // 3 weeks before the season starts
  tz: string;
  className?: string;
}) {
  const { name, range } = seasonForDue(dueAt, tz, 21);
  const season = name.toLowerCase();
  return (
    <ChatMessageSheet
      teamId={teamId}
      className={className}
      purpose="season_hosts"
      title={`Hosts for ${season}`}
      canWrite={false}
      placeholder=""
      presets={[
        `Hey everyone! We're working on our ${season} calendar 🗓️ Does anyone want to host an event? A potluck, a hike, a picnic, a workshop, a movie night or a collab with another group, anything goes. Reply here or message one of the organisers :)`,
        `Planning ${season} (${range}) now! ☀️ If you've got an idea for an event you'd love to run, or a place you'd be happy to host at, let us know this week and we'll pop it on the calendar. We'll help with the rest.`,
        `Got an event idea? 💡 We're putting the ${season} calendar together and would love more community-run events: socials, sanctuary visits, skill-shares, anything. Reply here if you'd like to host one and we'll sort the details together.`,
      ]}
    />
  );
}
