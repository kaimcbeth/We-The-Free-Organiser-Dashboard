import type { SupabaseClient } from "@supabase/supabase-js";

export const photoPath = (personId: string) => `${personId}.jpg`;

// Short-lived links to the photos of the given people (only those who have one).
export async function signPhotos(
  supabase: SupabaseClient,
  people: { id: string; photo_updated_at: string | null }[],
): Promise<Record<string, string>> {
  const withPhoto = people.filter((p) => p.photo_updated_at);
  if (withPhoto.length === 0) return {};
  const { data } = await supabase.storage
    .from("avatars")
    .createSignedUrls(withPhoto.map((p) => photoPath(p.id)), 60 * 60 * 6);
  const urls: Record<string, string> = {};
  (data ?? []).forEach((d, i) => {
    if (d.signedUrl) urls[withPhoto[i].id] = d.signedUrl;
  });
  return urls;
}
