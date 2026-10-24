import type { SupabaseClient } from "@supabase/supabase-js";

export type EventPhoto = {
  id: string;
  url: string; // signed, valid for an hour
  favourite: boolean;
  noPromo: boolean;
  eventId: string;
};

type Row = {
  id: string;
  path: string;
  favourite: boolean;
  no_promo: boolean;
  event_id: string;
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
    }));
}

const COLS = "id, path, favourite, no_promo, event_id";

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
