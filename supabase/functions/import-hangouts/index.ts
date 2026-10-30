// Imports Organiser Hangouts (activism.wtf/hangouts/...) every hour.
// activism.wtf has no hangouts list or calendar feed, so the hangout pages are
// found in the site's sitemap. Each page gives the title, exact start/end
// (data-starts-at / data-ends-at, UTC), "For organizers in ..." and the host.
// The database works out which communities and regions the audience means.
// Upcoming hangouts that drop out of the sitemap are marked removed.

import { createClient } from "npm:@supabase/supabase-js@2";

const SITE = "https://activism.wtf";
const UA = { "User-Agent": "WTF-Organiser-Import/1.0" };

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

export function parseHangout(html: string) {
  const title = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1];
  const starts = html.match(/data-starts-at="([^"]+)"/)?.[1];
  const ends = html.match(/data-ends-at="([^"]+)"/)?.[1];
  const audience = html.match(/<span>\s*For organi[sz]ers in ([^<]+)<\/span>/i)?.[1];
  const host = html.match(/<span>\s*Hosted by ([^<]+)<\/span>/i)?.[1];
  if (!title || !starts || Number.isNaN(Date.parse(starts))) return null;
  return {
    title: decode(title.replace(/<[^>]+>/g, "")),
    starts_at: new Date(starts).toISOString(),
    ends_at: ends && !Number.isNaN(Date.parse(ends)) ? new Date(ends).toISOString() : null,
    audience: audience ? decode(audience) : null,
    host: host ? decode(host) : null,
  };
}

Deno.serve(async () => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const res = await fetch(`${SITE}/sitemap.xml`, { headers: UA });
  if (!res.ok) return Response.json({ error: `Sitemap returned ${res.status}` }, { status: 502 });
  const xml = await res.text();
  // English pages only (the /es/ and /nl/ copies are the same hangouts).
  const urls = [
    ...new Set(
      [...xml.matchAll(/<loc>\s*(https:\/\/activism\.wtf\/hangouts\/[^<\s]+)\s*<\/loc>/g)].map((m) =>
        m[1].replace(/[?#].*$/, ""),
      ),
    ),
  ];

  const results: { url: string; ok: boolean; message?: string }[] = [];
  const now = new Date().toISOString();
  for (const url of urls) {
    try {
      const page = await fetch(url, { headers: UA });
      if (!page.ok) throw new Error(`Page returned ${page.status}`);
      const h = parseHangout(await page.text());
      if (!h) throw new Error("Couldn't read the hangout's title or time");
      const { error } = await supabase
        .from("hangouts")
        .upsert(
          { source_url: url, ...h, removed_at: null, last_seen_at: now, updated_at: now },
          { onConflict: "source_url" },
        );
      if (error) throw new Error(error.message);
      results.push({ url, ok: true });
    } catch (err) {
      results.push({ url, ok: false, message: err instanceof Error ? err.message : String(err) });
    }
  }

  // Upcoming ones no longer listed have been taken down (cancelled). Only when
  // the sitemap read cleanly, so a bad fetch doesn't hide everything.
  if (urls.length > 0 || xml.includes("<urlset")) {
    const seen = new Set(urls);
    const { data: upcoming } = await supabase
      .from("hangouts")
      .select("id, source_url")
      .is("removed_at", null)
      .gt("starts_at", now);
    const gone = (upcoming ?? []).filter((h) => !seen.has(h.source_url)).map((h) => h.id);
    if (gone.length) await supabase.from("hangouts").update({ removed_at: now }).in("id", gone);
  }

  return Response.json({ found: urls.length, results });
});
