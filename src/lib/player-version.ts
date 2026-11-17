import { headers } from "next/headers";

// The movie player's version for people ("3.25"), read from the player file
// itself so it can't drift (Kai, 18 Nov 2026: show it by the download button).
export async function playerNumber(): Promise<string | null> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (!host) return null;
    const proto =
      h.get("x-forwarded-proto") ??
      (host.startsWith("localhost") ? "http" : "https");
    const res = await fetch(`${proto}://${host}/resources/movie-player.html`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const m = (await res.text()).match(/PLAYER_NUMBER = "?([\d.]+)"?/);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}
