// Fingerprints for spotting duplicate photos (Photo Hub "Find duplicates").
// A 64-bit difference hash: the photo shrunk to 9 x 8 greys, one bit per
// "is this pixel brighter than the one to its right". The same photo uploaded
// twice (even re-saved, resized or slightly re-compressed) gives the same or a
// very close hash; different photos differ in many bits.

import type { SupabaseClient } from "@supabase/supabase-js";

// Bits that may differ for two photos to still count as the same one.
export const SAME_PHOTO = 6;

function hashCanvas(src: CanvasImageSource, w: number, h: number): string {
  // Two steps (big to small) so the browser averages rather than samples.
  const mid = document.createElement("canvas");
  mid.width = 64;
  mid.height = 64;
  const m = mid.getContext("2d")!;
  m.imageSmoothingQuality = "high";
  m.drawImage(src, 0, 0, w, h, 0, 0, 64, 64);
  const small = document.createElement("canvas");
  small.width = 9;
  small.height = 8;
  const s = small.getContext("2d", { willReadFrequently: true })!;
  s.imageSmoothingQuality = "high";
  s.drawImage(mid, 0, 0, 9, 8);
  const px = s.getImageData(0, 0, 9, 8).data;
  const grey = (x: number, y: number) => {
    const i = (y * 9 + x) * 4;
    return px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114;
  };
  let hex = "";
  for (let y = 0; y < 8; y++) {
    let byte = 0;
    for (let x = 0; x < 8; x++)
      byte = (byte << 1) | (grey(x, y) > grey(x + 1, y) ? 1 : 0);
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
}

// From an uploaded file or blob.
export async function hashBlob(blob: Blob): Promise<string | null> {
  try {
    const bmp = await createImageBitmap(blob);
    const h = hashCanvas(bmp, bmp.width, bmp.height);
    bmp.close();
    return h;
  } catch {
    return null;
  }
}

// From a (signed) photo URL.
export function hashUrl(url: string): Promise<string | null> {
  return new Promise((done) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        done(hashCanvas(img, img.naturalWidth, img.naturalHeight));
      } catch {
        done(null);
      }
    };
    img.onerror = () => done(null);
    img.src = url;
  });
}

// How many bits two hashes differ by.
export function distance(a: string, b: string): number {
  let d = 0;
  for (let i = 0; i < a.length; i += 2) {
    let x = parseInt(a.slice(i, i + 2), 16) ^ parseInt(b.slice(i, i + 2), 16);
    while (x) {
      d += x & 1;
      x >>= 1;
    }
  }
  return d;
}

// Sets of photos that look the same (each set has 2 or more ids).
export function duplicateSets(
  items: { id: string; hash: string }[],
  max = SAME_PHOTO,
): string[][] {
  const parent = new Map(items.map((i) => [i.id, i.id]));
  const root = (id: string): string => {
    const p = parent.get(id)!;
    if (p === id) return id;
    const r = root(p);
    parent.set(id, r);
    return r;
  };
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++)
      if (distance(items[i].hash, items[j].hash) <= max)
        parent.set(root(items[j].id), root(items[i].id));
  const sets = new Map<string, string[]>();
  for (const i of items) {
    const r = root(i.id);
    sets.set(r, [...(sets.get(r) ?? []), i.id]);
  }
  return [...sets.values()].filter((s) => s.length > 1);
}

// The community's saved fingerprints (photos still in the hub).
export async function loadHashes(
  supabase: SupabaseClient,
  teamId: string,
): Promise<Map<string, string>> {
  const { data } = await supabase
    .from("event_photos")
    .select("id, phash")
    .eq("team_id", teamId)
    .is("archived_at", null)
    .not("phash", "is", null)
    .limit(2000);
  return new Map((data ?? []).map((r) => [r.id as string, r.phash as string]));
}
