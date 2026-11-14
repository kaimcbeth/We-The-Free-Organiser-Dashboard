"use server";

import {
  isShortMapsLink,
  spotFromMapsUrl,
  type LinkSpot,
} from "@/lib/map-link";
import { createClient } from "@/lib/supabase/server";

// Follows a short Google Maps share link (maps.app.goo.gl/…) to the full
// address and reads the spot from it. Browsers can't do this themselves
// (Google doesn't allow it across sites). Only Google addresses are fetched.
export async function resolveMapsLink(link: string): Promise<LinkSpot | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isShortMapsLink(link)) return null;

  let url = link.trim();
  for (let i = 0; i < 6; i++) {
    const found = spotFromMapsUrl(url);
    if (found) return found;
    let next: string | null = null;
    try {
      const res = await fetch(url, {
        redirect: "manual",
        headers: { "User-Agent": "Mozilla/5.0 (Movement Hub map link)" },
        signal: AbortSignal.timeout(6000),
      });
      next = res.headers.get("location");
      if (!next && res.ok) {
        // Some answers carry the address in the page instead of a redirect.
        const html = (await res.text()).slice(0, 200_000);
        const m = html.match(
          /https:\/\/www\.google\.[a-z.]+\/maps\/[^"'\s<>]+/,
        );
        return m ? spotFromMapsUrl(m[0].replace(/\\u0026/g, "&")) : null;
      }
    } catch {
      return null;
    }
    if (!next) return null;
    const nextUrl = new URL(next, url);
    if (!/(^|\.)(google\.[a-z.]+|goo\.gl)$/i.test(nextUrl.hostname))
      return null;
    url = nextUrl.toString();
  }
  return spotFromMapsUrl(url);
}
