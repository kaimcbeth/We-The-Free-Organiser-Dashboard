// "Next up" slide at the end of an event's carousel (Kai, 11 Nov 2026: "have
// the last slide of the carousel auto generate as the details of the next
// event of the same type"). The carousel's first photo, dimmed in navy, with
// the next event's name, day, time and place on top.

import type { SupabaseClient } from "@supabase/supabase-js";
import { grain, loadPosterFonts } from "@/components/graphic-poster";
import { fitLines, spaced } from "@/components/graphic-teaser";
import {
  fmt,
  loadPhotoStyleFonts,
  place,
  shortTitle,
  timeRange,
  where,
} from "@/components/graphic-photo-styles";
import { eventKind } from "@/lib/insight-charts";

const NAVY = "#071130";
const PINK = "#ff47b9";
const YELLOW = "#ffd90f";
const DISPLAY = '"WTF Display", "Arial Black", sans-serif';
const BODY = '"WTF Body", "Helvetica Neue", Arial, sans-serif';
const BOLD = '"WTF Bold", "Helvetica Neue", Arial, sans-serif';

export type NextEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  venue: string | null;
  address: string | null;
  typeName: string | null;
  community: string | null;
  tz: string;
  handle: string | null;
};

type Row = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  venue: string | null;
  address: string | null;
  event_type_id: string | null;
  time_unknown: boolean | null;
  event_type: { name: string } | null;
};

// The next upcoming event of the same type as this one (same event type, or
// the same kind of event when it has no type), or null.
export async function loadNextEvent(
  supabase: SupabaseClient,
  eventId: string,
): Promise<NextEvent | null> {
  const cols =
    "id, title, starts_at, ends_at, venue, address, event_type_id, time_unknown, event_type:event_types(name)";
  const { data: ev } = await supabase
    .from("events")
    .select(`${cols}, team_id, team:teams(name, timezone, instagram_handle)`)
    .eq("id", eventId)
    .maybeSingle<
      Row & {
        team_id: string;
        team: {
          name: string;
          timezone: string;
          instagram_handle: string | null;
        } | null;
      }
    >();
  if (!ev?.team) return null;
  const teamId = ev.team_id;
  const after = new Date(
    Math.max(Date.now(), Date.parse(ev.starts_at) + 60_000),
  ).toISOString();
  const { data: later } = await supabase
    .from("events")
    .select(cols)
    .eq("team_id", teamId)
    .gt("starts_at", after)
    .order("starts_at")
    .limit(60)
    .returns<Row[]>();
  const kind = eventKind(ev.event_type?.name ?? null, ev.title);
  const next = (later ?? []).find(
    (e) =>
      !e.time_unknown &&
      (ev.event_type_id
        ? e.event_type_id === ev.event_type_id
        : eventKind(e.event_type?.name ?? null, e.title) === kind),
  );
  if (!next) return null;
  return {
    id: next.id,
    title: next.title,
    startsAt: next.starts_at,
    endsAt: next.ends_at,
    venue: next.venue,
    address: next.address,
    typeName: next.event_type?.name ?? ev.event_type?.name ?? null,
    community: ev.team.name,
    tz: ev.team.timezone,
    handle: ev.team.instagram_handle,
  };
}

export const loadNextEventFonts = () =>
  Promise.all([loadPosterFonts(), loadPhotoStyleFonts()]);

// Draws the slide: w × h, the photo (if any) dimmed behind.
export function drawNextEvent(
  canvas: HTMLCanvasElement,
  e: NextEvent,
  w: number,
  h: number,
  photo: HTMLImageElement | null,
  mark: HTMLImageElement | null,
) {
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, w, h);
  if (photo) {
    const s = Math.max(w / photo.naturalWidth, h / photo.naturalHeight);
    const pw = photo.naturalWidth * s;
    const ph = photo.naturalHeight * s;
    ctx.globalAlpha = 0.3;
    ctx.drawImage(photo, (w - pw) / 2, (h - ph) / 2, pw, ph);
    ctx.globalAlpha = 1;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(7,17,48,0.55)");
    g.addColorStop(0.6, "rgba(7,17,48,0.85)");
    g.addColorStop(1, "rgba(7,17,48,0.97)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  grain(ctx, w, h);

  if (mark) {
    const mh = 72;
    const mw = (mark.naturalWidth / mark.naturalHeight) * mh;
    ctx.drawImage(mark, w - 44 - mw, 44, mw, mh);
  }

  // Sized for 1080 × 1350; shorter slides (square, wide) scale it down.
  const k = Math.min(1, h / 1350);
  const r = (n: number) => Math.round(n * k);
  const x = 72;
  const max = w - 2 * x;
  const footTop = h - r(150);
  ctx.textBaseline = "alphabetic";
  const fit = fitLines(
    ctx,
    shortTitle(e.title, e.community).toUpperCase(),
    (s) => `${s}px ${DISPLAY}`,
    r(110),
    r(44),
    max,
    3,
    1.05,
    h * 0.34,
  );
  const spot = [place(e), where(e)].filter(Boolean).join(", ");
  // The words as one block, centred between the top and the footer.
  const block =
    r(34) +
    r(24) +
    fit.lines.length * fit.size * 1.05 +
    r(105) +
    r(68) +
    (spot ? r(56) : 0);
  let y = Math.max(r(150), (footTop - block) / 2 + r(34));

  ctx.font = `${r(34)}px ${BOLD}`;
  ctx.fillStyle = PINK;
  const type = e.typeName?.trim();
  spaced(ctx, `NEXT ${type ? type.toUpperCase() : "EVENT"}`, x, y, r(7));
  ctx.font = `${fit.size}px ${DISPLAY}`;
  ctx.fillStyle = "#ffffff";
  y += r(24);
  for (const l of fit.lines) {
    y += fit.size * 1.05;
    ctx.fillText(l, x - 4, y);
  }
  y += r(105);
  ctx.font = `${r(52)}px ${BOLD}`;
  ctx.fillStyle = YELLOW;
  ctx.fillText(
    fmt(e.startsAt, e.tz, {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).toUpperCase(),
    x,
    y,
    max,
  );
  y += r(68);
  ctx.font = `${r(40)}px ${BODY}`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(timeRange(e, e.tz), x, y, max);
  if (spot) {
    y += r(56);
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillText(spot, x, y, max);
  }

  ctx.font = `${r(30)}px ${BOLD}`;
  ctx.fillStyle = PINK;
  spaced(ctx, "COME ALONG", x, h - r(118), r(5));
  // No logo (the "No WTF logo" tick) also leaves the website off.
  const foot = [e.handle ? `@${e.handle}` : "", mark ? "www.activism.wtf" : ""]
    .filter(Boolean)
    .join(" · ");
  ctx.font = `${r(30)}px ${BODY}`;
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  if (foot) ctx.fillText(foot, x, h - r(70), max);
}
