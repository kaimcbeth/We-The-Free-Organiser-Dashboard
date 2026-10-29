import type { SupabaseClient } from "@supabase/supabase-js";

export type PhotoTag =
  | "outreach"
  | "group"
  | "volunteers"
  | "watching"
  | "community"
  | "sign"
  | "training";
// short: the tiny label on photo thumbnails.
export const PHOTO_TAGS: { id: PhotoTag; label: string; short: string }[] = [
  { id: "outreach", label: "Outreach", short: "Outreach" },
  { id: "group", label: "Group photo", short: "Group" },
  { id: "volunteers", label: "Volunteers", short: "Volunteers" },
  { id: "watching", label: "Watching", short: "Watching" },
  { id: "community", label: "Community event", short: "Community" },
  { id: "sign", label: "Holding sign", short: "Sign" },
  { id: "training", label: "Training", short: "Training" },
];

export type EventPhoto = {
  id: string;
  url: string; // signed, valid for an hour
  favourite: boolean;
  noPromo: boolean;
  eventId: string | null; // null: a community photo, not from one event
  takenYear: number | null;
  takenMonth: number | null; // 1-12
  caption: string | null;
  tags: PhotoTag[];
  cropped: boolean; // the original is kept and can be restored
};

type Row = {
  id: string;
  path: string;
  favourite: boolean;
  no_promo: boolean;
  event_id: string | null;
  taken_year: number | null;
  taken_month: number | null;
  caption: string | null;
  tags: PhotoTag[] | null;
  original_path: string | null;
};

async function sign(supabase: SupabaseClient, rows: Row[]) {
  if (rows.length === 0) return [];
  const { data } = await supabase.storage.from("event-photos").createSignedUrls(
    rows.map((r) => r.path),
    3600,
  );
  const url = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return rows
    .filter((r) => url.get(r.path))
    .map((r) => ({
      id: r.id,
      url: url.get(r.path)!,
      favourite: r.favourite,
      noPromo: r.no_promo,
      eventId: r.event_id,
      takenYear: r.taken_year,
      takenMonth: r.taken_month,
      caption: r.caption,
      tags: r.tags ?? [],
      cropped: !!r.original_path,
    }));
}

const COLS =
  "id, path, favourite, no_promo, event_id, taken_year, taken_month, caption, tags, original_path";

// One event's photos, newest first.
export async function loadEventPhotos(
  supabase: SupabaseClient,
  eventId: string,
): Promise<EventPhoto[]> {
  const { data } = await supabase
    .from("event_photos")
    .select(COLS)
    .eq("event_id", eventId)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .returns<Row[]>();
  return sign(supabase, data ?? []);
}

// A community's photos that can go on promo graphics: favourites first, then
// the most recent.
export async function loadPromoPhotos(
  supabase: SupabaseClient,
  teamId: string,
  limit = 24,
): Promise<EventPhoto[]> {
  const { data } = await supabase
    .from("event_photos")
    .select(COLS)
    .eq("team_id", teamId)
    .eq("no_promo", false)
    .is("archived_at", null)
    .order("favourite", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<Row[]>();
  return sign(supabase, data ?? []);
}

// Community photos (not from one event): newest rough date first, then
// undated ones.
export async function loadCommunityPhotos(
  supabase: SupabaseClient,
  teamId: string,
): Promise<EventPhoto[]> {
  const { data } = await supabase
    .from("event_photos")
    .select(COLS)
    .eq("team_id", teamId)
    .is("event_id", null)
    .is("archived_at", null)
    .order("taken_year", { ascending: false, nullsFirst: false })
    .order("taken_month", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(500)
    .returns<Row[]>();
  return sign(supabase, data ?? []);
}

// Promo photos from a community's events in one month (in its time zone),
// in event order. For the monthly recap carousel.
export async function loadMonthPhotos(
  supabase: SupabaseClient,
  teamId: string,
  year: number,
  month: number, // 1-12
  tz: string,
): Promise<EventPhoto[]> {
  // A day either side covers any time zone; the exact month is checked below.
  const from = new Date(Date.UTC(year, month - 1, 1) - 864e5).toISOString();
  const to = new Date(Date.UTC(year, month, 1) + 864e5).toISOString();
  const { data } = await supabase
    .from("event_photos")
    .select(`${COLS}, event:events!inner(starts_at)`)
    .eq("team_id", teamId)
    .eq("no_promo", false)
    .is("archived_at", null)
    .gte("event.starts_at", from)
    .lt("event.starts_at", to)
    .returns<(Row & { event: { starts_at: string } })[]>();
  const ym = (iso: string) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
    }).format(new Date(iso));
  const want = `${year}-${String(month).padStart(2, "0")}`;
  const rows = (data ?? [])
    .filter((r) => ym(r.event.starts_at) === want)
    .sort((a, b) => a.event.starts_at.localeCompare(b.event.starts_at));
  return sign(supabase, rows);
}

// Community photos that were removed (kept, so they can be restored).
export async function loadRemovedCommunityPhotos(
  supabase: SupabaseClient,
  teamId: string,
): Promise<EventPhoto[]> {
  const { data } = await supabase
    .from("event_photos")
    .select(COLS)
    .eq("team_id", teamId)
    .is("event_id", null)
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false })
    .limit(200)
    .returns<Row[]>();
  return sign(supabase, data ?? []);
}
