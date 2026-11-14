// Reading a spot out of a Google Maps link (Kai, 14 Nov 2026: the map search
// couldn't find a small shop). Shared by the browser (full links) and the
// server action that follows short maps.app.goo.gl links.

export type LinkSpot = { lat: number; lng: number; name: string | null };

const ok = (lat: number, lng: number) =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  Math.abs(lat) <= 90 &&
  Math.abs(lng) <= 180 &&
  !(lat === 0 && lng === 0);

// "-33.8731, 151.2061" typed or pasted straight in.
export function spotFromCoords(text: string): LinkSpot | null {
  const m = text.trim().match(/^(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  return ok(lat, lng) ? { lat, lng, name: null } : null;
}

export function isMapsLink(text: string) {
  return /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|(www\.)?google\.[a-z.]+\/maps|maps\.google\.[a-z.]+)/i.test(
    text.trim(),
  );
}

export function isShortMapsLink(text: string) {
  return /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps)\//i.test(text.trim());
}

// A full Google Maps address. The place's own pin (!3d…!4d…) beats the
// map's middle (@lat,lng), which can be off to one side.
export function spotFromMapsUrl(raw: string): LinkSpot | null {
  let url = raw.trim();
  try {
    // Consent pages wrap the real address in ?continue=
    const u = new URL(url);
    const cont = u.searchParams.get("continue");
    if (cont) url = cont;
  } catch {
    return null;
  }
  const text = decodeURIComponent(url);
  let name: string | null = null;
  const place = text.match(/\/maps\/place\/([^/@?]+)/);
  if (place) name = place[1].replace(/\+/g, " ").trim() || null;

  const pins = [...text.matchAll(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/g)];
  const pin = pins[pins.length - 1];
  if (pin && ok(Number(pin[1]), Number(pin[2])))
    return { lat: Number(pin[1]), lng: Number(pin[2]), name };

  for (const re of [
    /[?&](?:q|query|ll|center|destination)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/,
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
  ]) {
    const m = text.match(re);
    if (m && ok(Number(m[1]), Number(m[2])))
      return { lat: Number(m[1]), lng: Number(m[2]), name };
  }
  return null;
}
