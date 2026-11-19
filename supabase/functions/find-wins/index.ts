// "Find wins" (Kai, 11 Nov 2026; own function since 19 Nov 2026, when Kai said
// it took too long): searches the web for recent wins for animals in a
// country and writes 3 messages sharing them. Results are kept per country
// for 3 days in wins_cache, so most opens are instant; "Search again" (fresh)
// or a note runs a new search. Every 15 minutes the cron calls { warm: true },
// which refreshes up to 2 countries with an open share-a-win action in an
// active community, so the first person to open it doesn't wait either.
// Needs ANTHROPIC_API_KEY. verify_jwt is off (for the cron); user calls check
// the login themselves.

import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
const DAILY_LIMIT = 40;
const KEEP_MS = 3 * 864e5; // cached wins are good for 3 days

const RULES = `Write like a real member of this community, not a brand or marketer.
- Call the people in the community members, never volunteers (Kai, 6 Nov 2026).
- Australian English spelling (organise, colour, favourite).
- Plain, warm, specific. Use the real details given. Never invent facts: no made-up numbers, quotes, names, prizes or claims.
- Never use: "thrilled", "excited to announce", "don't miss out", "unforgettable", "journey", "vibrant", "game-changer", "delve", "elevate", "embark", "we can't wait", "amazing opportunity", "join us for an incredible", "look no further", "in today's world".
- No em dashes or en dashes. Use commas, full stops or "and".
- Use emoji naturally and tastefully, the way a friendly member would: usually 2 to 4 per option (1 or 2 for a story or a very short message). Put them where they add warmth or meaning (food 🥗, animals 🐷, a wave 👋, a heart 💚), at the end of a sentence or beside the thing they mean. Never one on every line, never as bullet points, never several in a row. If voice examples are given, follow their emoji habits.
- No exclamation mark pile-ups. At most one per option.
- Don't start every option the same way. Make the options genuinely different (e.g. one personal, one straight to the point, one built around a detail).
- If voice examples are given, match their tone, length, sign-offs closely, but never copy sentences from them.
- Never add a details block: no separate lines listing the date, time and address, no "When:"/"Where:", no full street addresses. Mention when and where once, inside a normal sentence, the way a person would say it ("this Sunday arvo from 3 at Camperdown park", "Wednesday night at Mama B's"). Use the day name ("this Sunday", "tomorrow") when it's within the next week, not the full date. Shorten the place to what locals call it and skip the street. The event link is enough for anyone who wants the details.`;

const COUNTRY_CODES: Record<string, string> = {
  australia: "AU",
  "new zealand": "NZ",
  "united kingdom": "GB",
  uk: "GB",
  england: "GB",
  scotland: "GB",
  wales: "GB",
  ireland: "IE",
  "united states": "US",
  usa: "US",
  canada: "CA",
  japan: "JP",
  india: "IN",
  germany: "DE",
  france: "FR",
  netherlands: "NL",
  spain: "ES",
  italy: "IT",
  brazil: "BR",
  mexico: "MX",
  singapore: "SG",
  "south africa": "ZA",
  philippines: "PH",
  indonesia: "ID",
};

type Found = { options?: string[]; wins?: unknown[]; error?: string };

// deno-lint-ignore no-explicit-any
async function search(
  admin: any,
  key: string,
  o: {
    country: string;
    place: string;
    tz: string;
    forOrganisers: boolean;
    note?: string;
  },
): Promise<Found> {
  const { country, place, tz, forOrganisers, note } = o;
  const code = COUNTRY_CODES[country.toLowerCase()];
  const today = new Intl.DateTimeFormat("en-AU", {
    timeZone: tz,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  // What organisers marked "Not our vibe" (everyone's, newest first): shown as
  // examples to avoid, and those links are never offered again.
  const { data: nope } = await admin
    .from("win_feedback")
    .select("headline, url")
    .order("created_at", { ascending: false })
    .limit(40);
  const blocked = new Set(
    (nope ?? [])
      .map((n) => String(n.url ?? "").replace(/\/$/, ""))
      .filter(Boolean),
  );
  const avoid = (nope ?? [])
    .slice(0, 25)
    .map((n) => `- ${n.headline}`)
    .join("\n");

  const audience = forOrganisers
    ? `the WhatsApp group chat for We The Free organisers across ${place}. Upbeat, a reminder that the movement is winning.`
    : `a We The Free member WhatsApp group chat in ${country || place}. Casual, like a friend sharing good news with the group. Don't name a city or community (the same messages go to every community in the country).`;
  const prompt = `Today is ${today}. We The Free is a grassroots vegan animal rights movement. Search the web for real, recent wins for animals and write messages sharing them in ${audience}

FINDING WINS
- Only wins in ${country || place} (Kai, 11 Nov 2026: local wins only). Nothing from other countries, even big ones. State, council and national news all count.
- Prefer the last 30 days; if there aren't enough, look back up to 3 months and say roughly how long ago.

WHAT COUNTS (Kai picked these from real examples, 11 Nov 2026)
- Industries using animals being ended, cut back, closed or defunded: racing (greyhounds, horses), fur, fishing, live export, rodeos, circuses, labs and animal testing. e.g. a greyhound track running its last race, a state's plan to end greyhound racing, a government scrapping a kids' fishing program, a council going fur-free.
- A cruel practice in farming being ended or phased out: e.g. steps to end male chick culling, vets calling for mulesing to be phased out.
- Wildlife protection: e.g. new money to protect koalas, a cull or hunt stopped, a harmful poison recommended for a ban.
- Cultivated meat approvals and big shifts in the food system (a national chain or big retailer going plant-based, not one cafe opening).
- Wins for activists: court cases won, activists cleared, protest rights upheld, open rescues.
- Real steps forward that aren't final (a bill introduced, a regulator's recommendation, a government commitment) are welcome when they affect lots of animals. Mark them as "progress" and word them honestly ("a step closer", not "banned").
- Pets and companion animals: only big state-wide or national law changes. Never single court cases or sentences.

NEVER
- "Humane", "higher welfare" or "free range" labels or certifications, bigger cages, kinder slaughter methods.
- Polls and surveys, however good the number (they read as more negative than a win).
- Niche news few people would care about (e.g. an inquiry into one small issue).
- Anything that's mostly bad news with a small upside, or a cruelty case.
${avoid ? `- Organisers marked these as not our vibe. Skip them and anything like them:\n${avoid}\n` : ""}- Only use what you found in the search results. Never invent or guess details, numbers or dates. Every win needs the link of the page you found it on.
${note && String(note).trim() ? `- From the organiser: ${String(note).slice(0, 400)}\n` : ""}
WRITING
- 3 messages, each 25-70 words. Make them different: e.g. one about the biggest win, one about another win, one quick roundup of 2-3 wins.
- Say plainly what happened, where and roughly when, and why it matters for animals. Upbeat but not over the top. Naming the MP, party or group behind it is fine.
- Just the news: no call to action, no "see you at the next event", no asking people to do anything.
- End each message with the source link on its own line (a roundup can list up to 3 links, one per line).
- No hashtags.

Reply with JSON only, no other text, shaped like:
{"wins": [{"headline": "short, under 15 words", "where": "place", "when": "e.g. 28 Oct", "kind": "win" or "progress", "url": "https://...", "source": "site name"}], "messages": ["...", "...", "..."]}
List 3 to 8 wins, newest first. If you only find 1 or 2, that's fine: never pad with other countries.`;

  const tool: Record<string, unknown> = {
    type: "web_search_20250305",
    name: "web_search",
    max_uses: 4,
  };
  if (code)
    tool.user_location = { type: "approximate", country: code, timezone: tz };
  // deno-lint-ignore no-explicit-any
  const messages: any[] = [{ role: "user", content: prompt }];
  // deno-lint-ignore no-explicit-any
  let blocks: any[] = [];
  for (let turn = 0; turn < 3; turn++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: Deno.env.get("SEARCH_MODEL") ?? "claude-sonnet-5-5",
        max_tokens: 3000,
        system: RULES,
        tools: [tool],
        messages,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error(res.status, t);
      if (/web.?search/i.test(t))
        return {
          error: "Web search isn't switched on for the writing assistant yet.",
        };
      return {
        error: "The writing assistant didn't answer. Try again in a moment.",
      };
    }
    const out = await res.json();
    blocks = blocks.concat(out.content ?? []);
    if (out.stop_reason !== "pause_turn") break;
    // A long search: hand it back so it carries on.
    messages.push({ role: "assistant", content: out.content });
  }

  // Every link the search returned.
  const seen = new Set<string>();
  for (const b of blocks)
    if (b.type === "web_search_tool_result" && Array.isArray(b.content))
      for (const r of b.content)
        if (r?.url) seen.add(String(r.url).replace(/\/$/, ""));
  const clean = (u: string) =>
    String(u)
      .trim()
      .replace(/[).,]+$/, "")
      .replace(/\/$/, "");
  const real = (u: string) => seen.has(clean(u)) && !blocked.has(clean(u));

  const text = blocks
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");
  // The JSON is at the end; any words before it (while searching) are skipped.
  const start =
    text.indexOf('{"wins"') >= 0 ? text.indexOf('{"wins"') : text.indexOf("{");
  let parsed: { wins?: unknown[]; messages?: unknown[] } = {};
  try {
    parsed = JSON.parse(text.slice(start, text.lastIndexOf("}") + 1));
  } catch {
    return { error: "That didn't come out right. Try again." };
  }
  const tidy = (v: unknown) =>
    String(v ?? "")
      .replace(/\s*[—–]\s*/g, ", ")
      .trim();
  const wins = (Array.isArray(parsed.wins) ? parsed.wins : [])
    // deno-lint-ignore no-explicit-any
    .map((w: any) => ({
      headline: tidy(w?.headline),
      where: tidy(w?.where),
      when: tidy(w?.when),
      kind: w?.kind === "progress" ? "progress" : "win",
      url: String(w?.url ?? "").trim(),
      source: tidy(w?.source),
    }))
    .filter((w) => w.headline && w.url && real(w.url))
    .slice(0, 8);
  // Keep messages whose every link came from the search.
  const options: string[] = (
    Array.isArray(parsed.messages) ? parsed.messages : []
  )
    .map(tidy)
    .filter((m) => {
      const links = m.match(/https?:\/\/[^\s)]+/g) ?? [];
      return links.length > 0 && links.every(real);
    })
    .slice(0, 3);
  if (!options.length && !wins.length)
    return {
      error: "Couldn't find any recent wins right now. Try again in a bit.",
    };
  return { options, wins };
}

const cacheKey = (forOrganisers: boolean, country: string) =>
  `${forOrganisers ? "org" : "team"}:${country.toLowerCase()}`;

// deno-lint-ignore no-explicit-any
async function save(admin: any, k: string, country: string, r: Found) {
  if (r.error) return;
  await admin.from("wins_cache").upsert({
    key: k,
    country,
    result: { options: r.options, wins: r.wins },
    found_at: new Date().toISOString(),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key)
      return json({ error: "The writing assistant isn't set up yet." }, 500);
    const body = await req.json().catch(() => ({}));

    if (body?.warm) {
      const { data: due } = await admin.rpc("wins_warm_due");
      const picks = ((due ?? []) as { country: string; tz: string }[]).slice(
        0,
        2,
      );
      const done = await Promise.all(
        picks.map(async (p) => {
          const r = await search(admin, key, {
            country: p.country,
            place: p.country,
            tz: p.tz,
            forOrganisers: false,
          });
          await save(admin, cacheKey(false, p.country), p.country, r);
          return `${p.country}: ${r.error ?? (r.wins?.length ?? 0) + " wins"}`;
        }),
      );
      return json({ warmed: done });
    }

    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: {
        headers: { Authorization: req.headers.get("Authorization") ?? "" },
      },
    });
    const {
      data: { user },
    } = await asUser.auth.getUser();
    if (!user) return json({ error: "Please log in again." }, 401);

    const { teamId, regionId, note, fresh } = body ?? {};
    if (!teamId && !regionId)
      return json({ error: "Pick a community first." }, 400);
    const { data: me } = await admin
      .from("organisers")
      .select("access, team_id, organiser_team_id, region_id, lead_region_id")
      .eq("id", user.id)
      .maybeSingle();
    const forOrganisers = !teamId;
    const ok =
      !!me &&
      (me.access === "god" ||
        me.access === "regional_lead" ||
        (!forOrganisers &&
          (me.team_id === teamId || me.organiser_team_id === teamId)));
    if (!ok)
      return json(
        {
          error: forOrganisers
            ? "Only Regional Support Leads can use this."
            : "Only organisers and the Core Team can use this.",
        },
        403,
      );

    let place = "";
    let tz = "Australia/Sydney";
    let country = "";
    if (teamId) {
      const { data: team } = await asUser
        .from("teams")
        .select("id, name, timezone")
        .eq("id", teamId)
        .maybeSingle();
      if (!team) return json({ error: "Couldn't find that community." }, 404);
      const [city, ...rest] = String(team.name)
        .split(",")
        .map((x: string) => x.trim());
      country = rest.join(", ");
      place = country ? `${city}, ${country}` : city;
      tz = team.timezone ?? tz;
    } else {
      const { data: region } = await admin
        .from("regions")
        .select("name, extra_countries")
        .eq("id", regionId)
        .maybeSingle();
      if (!region) return json({ error: "Couldn't find that region." }, 404);
      place = [region.name, ...(region.extra_countries ?? [])].join(" + ");
      const { data: teams } = await admin
        .from("teams")
        .select("name, timezone")
        .eq("region_id", regionId)
        .limit(200);
      const counts = new Map<string, number>();
      for (const t of teams ?? []) {
        const c = String(t.name).split(",").slice(1).join(",").trim();
        if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
      }
      country = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
      tz = (teams ?? [])[0]?.timezone ?? tz;
    }

    const noted = !!(note && String(note).trim());
    const k = cacheKey(forOrganisers, country || place);
    if (!fresh && !noted) {
      const { data: hit } = await admin
        .from("wins_cache")
        .select("result, found_at")
        .eq("key", k)
        .maybeSingle();
      if (hit && Date.now() - new Date(hit.found_at).getTime() < KEEP_MS)
        return json({ ...hit.result, foundAt: hit.found_at });
    }

    if (teamId) {
      const since = new Date(Date.now() - 864e5).toISOString();
      const { count } = await admin
        .from("copy_generations")
        .select("id", { count: "exact", head: true })
        .eq("team_id", teamId)
        .gte("created_at", since);
      if ((count ?? 0) >= DAILY_LIMIT)
        return json(
          {
            error: "That's a lot of searching for one day. Try again tomorrow.",
          },
          429,
        );
    }
    const r = await search(admin, key, {
      country,
      place,
      tz,
      forOrganisers,
      note,
    });
    if (r.error) return json({ error: r.error }, 502);
    if (!noted) await save(admin, k, country || place, r);
    if (teamId)
      await admin
        .from("copy_generations")
        .insert({ team_id: teamId, event_id: null, user_id: user.id });
    return json({
      options: r.options,
      wins: r.wins,
      foundAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error(e);
    return json({ error: "Couldn't find wins right now. Try again." }, 500);
  }
});
