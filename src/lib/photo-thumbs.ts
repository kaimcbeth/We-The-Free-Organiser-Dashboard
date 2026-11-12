import type { SupabaseClient } from "@supabase/supabase-js";

// Small copies of Photo Hub photos for the grid (Kai, 12 Nov 2026: the hub
// was slow, especially on phones, because every tile loaded the full photo).
// Stored at <team>/library/thumb-<id>-<n>.jpg so members can read them too.

export const THUMB_MAX = 480;

export async function makeThumb(source: Blob): Promise<Blob | null> {
  try {
    const img = await createImageBitmap(source);
    const scale = Math.min(1, THUMB_MAX / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
    img.close();
    return await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.75));
  } catch {
    return null;
  }
}

// Uploads a thumbnail and points the photo at it. Returns the new path.
export async function saveThumb(
  supabase: SupabaseClient,
  teamId: string,
  photoId: string,
  thumb: Blob,
): Promise<string | null> {
  const path = `${teamId}/library/thumb-${photoId}-${Date.now().toString(36)}.jpg`;
  const up = await supabase.storage
    .from("event-photos")
    .upload(path, thumb, { contentType: "image/jpeg" });
  if (up.error) return null;
  const { error } = await supabase
    .from("event_photos")
    .update({ thumb_path: path })
    .eq("id", photoId);
  return error ? null : path;
}

// Makes thumbnails for photos that don't have one yet, a few at a time,
// from the full photo (already signed). Used when an organiser or Core Team
// member opens the hub, so older photos get one once.
export async function fillThumbs(
  supabase: SupabaseClient,
  teamId: string,
  photos: { id: string; url: string; thumb?: string | null }[],
  onDone?: (id: string) => void,
) {
  const work = photos.filter((p) => !p.thumb);
  await Promise.all(
    Array.from({ length: 3 }, async () => {
      for (let p = work.shift(); p; p = work.shift()) {
        try {
          const res = await fetch(p.url);
          if (!res.ok) continue;
          const thumb = await makeThumb(await res.blob());
          if (thumb && (await saveThumb(supabase, teamId, p.id, thumb)))
            onDone?.(p.id);
        } catch {
          // Leave it for next time.
        }
      }
    }),
  );
}
