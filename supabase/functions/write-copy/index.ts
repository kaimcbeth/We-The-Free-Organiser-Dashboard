// Writes social media copy for an event: a few options per platform, in the
// community's own voice (voice_examples) when it has some. Never posts
// anything: it only returns text for a person to pick, edit and copy.
//
// Needs the Edge Function secret ANTHROPIC_API_KEY (optional ANTHROPIC_MODEL).

import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const DAILY_LIMIT = 40; // generations per community per day

const PLATFORMS: Record<string, string> = {
  instagram: "Instagram caption: 40-120 words, short paragraphs, up to 3 relevant hashtags at the very end (optional).",
  facebook: "Post for local Facebook groups: 40-100 words, friendly and community-minded, never salesy, no hashtags, include the event link if given.",
  whatsapp: "WhatsApp message to the community chat: 15-60 words, casual, like a friend messaging the group, no hashtags.",
  story: "Instagram/Facebook story text overlay: under 15 words, punchy, no hashtags.",
};

const RULES = `Write like a real volunteer from this community, not a brand or marketer.
- Australian English spelling (organise, colour, favourite).
- Plain, warm, specific. Use the real details given. Never invent facts: no made-up numbers, quotes, names, prizes or claims.
- Never use: "thrilled", "excited to announce", "don't miss out", "unforgettable", "journey", "vibrant", "game-changer", "delve", "elevate", "embark", "we can't wait", "amazing opportunity", "join us for an incredible", "look no further", "in today's world".
- No em dashes or en dashes. Use commas, full stops or "and".
- At most 2 emoji per option, and none if the voice examples don't use them.
- No exclamation mark pile-ups. At most one per option.
- Don't start every option the same way. Make the options genuinely different (e.g. one personal, one straight to the point, one built around a detail).
- If voice examples are given, match their tone, length, emoji habits and sign-offs closely, but never copy sentences from them.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const {
      data: { user },
    } = await asUser.auth.getUser();
    if (!user) return json({ error: "Please log in again." }, 401);

    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) return json({ error: "The writing assistant isn't set up yet." }, 500);

    const { eventId, platforms, note } = await req.json();
    const wanted = ((platforms as string[]) ?? []).filter((p) => p in PLATFORMS);
    if (!eventId || wanted.length === 0) return json({ error: "Pick at least one place to post." }, 400);

    // Reading the event as the user checks they can see it.
    const { data: event } = await asUser
      .from("events")
      .select("id, team_id, title, starts_at, ends_at, venue, address, description, source_url, facebook_url, event_type:event_types(name, counts_as_outreach), team:teams(name, timezone)")
      .eq("id", eventId)
      .maybeSingle();
    if (!event) return json({ error: "Couldn't find that event." }, 404);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: me } = await admin.from("organisers").select("access, team_id, region_id").eq("id", user.id).maybeSingle();
    if (!me) return json({ error: "Only organisers and the Core Team can use this." }, 403);

    const since = new Date(Date.now() - 864e5).toISOString();
    const { count } = await admin
      .from("copy_generations")
      .select("id", { count: "exact", head: true })
      .eq("team_id", event.team_id)
      .gte("created_at", since);
    if ((count ?? 0) >= DAILY_LIMIT) return json({ error: "That's a lot of writing for one day. Try again tomorrow." }, 429);

    // deno-lint-ignore no-explicit-any
    const ev = event as any;
    const tz = ev.team?.timezone ?? "Australia/Sydney";
    const community = (ev.team?.name ?? "").replace(/, (Australia|New Zealand)$/, "");
    const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-AU", { timeZone: tz, ...o }).format(new Date(iso));
    const when = (e: { starts_at: string; ends_at: string | null }) =>
      `${fmt(e.starts_at, { weekday: "long", day: "numeric", month: "long" })}, ${fmt(e.starts_at, { hour: "numeric", minute: "2-digit" })}${e.ends_at ? ` to ${fmt(e.ends_at, { hour: "numeric", minute: "2-digit" })}` : ""}`;
    const past = Date.parse(ev.starts_at) < Date.now();

    const facts: string[] = [
      `Community: We The Free ${community}`,
      `Event: ${ev.title}${ev.event_type?.name ? ` (${ev.event_type.name})` : ""}`,
      `When: ${when(ev)}`,
      ev.venue || ev.address ? `Where: ${[ev.venue, ev.address].filter(Boolean).join(", ")}` : "",
      ev.description ? `About the event (from our website): ${String(ev.description).slice(0, 800)}` : "",
      ev.source_url ? `Event link: ${ev.source_url}` : "",
      ev.facebook_url ? `Facebook event link (use this one for Facebook and WhatsApp): ${ev.facebook_url}` : "",
    ];

    if (past) {
      // How it went (numbers only, no names).
      const { data: att } = await admin.from("attendance").select("person_id").eq("event_id", ev.id);
      const ids = (att ?? []).map((a) => a.person_id);
      let firsts = 0;
      if (ids.length) {
        const { data: earlier } = await admin
          .from("attendance")
          .select("person_id, event:events!inner(starts_at)")
          .in("person_id", ids)
          .lt("event.starts_at", ev.starts_at);
        const before = new Set((earlier ?? []).map((r) => r.person_id));
        const { data: ppl } = await admin.from("people").select("id, attended_before_app").in("id", ids);
        firsts = (ppl ?? []).filter((p) => !before.has(p.id) && !p.attended_before_app).length;
      }
      if (ids.length) facts.push(`Volunteers who came: ${ids.length}${firsts ? ` (${firsts} for the first time)` : ""}`);
      // The call to action: the next event or two.
      const { data: next } = await admin
        .from("events")
        .select("title, starts_at, ends_at, venue, source_url")
        .eq("team_id", ev.team_id)
        .gt("starts_at", new Date().toISOString())
        .order("starts_at")
        .limit(2);
      if (next?.length)
        facts.push(
          `Upcoming events to invite people to (end with a clear, friendly call to action for these):\n${next
            .map((n) => `- ${n.title}, ${when(n)}${n.venue ? `, ${n.venue}` : ""}${n.source_url ? ` (${n.source_url})` : ""}`)
            .join("\n")}`,
        );
    }
    if (note && String(note).trim()) facts.push(`From the organiser (use this, it's the heart of the post): ${String(note).slice(0, 600)}`);

    const { data: voice } = await admin
      .from("voice_examples")
      .select("platform, body")
      .eq("team_id", ev.team_id)
      .order("created_at", { ascending: false })
      .limit(10);

    const prompt = `${past ? "This event has happened. Write a post sharing how it went (photos will go with it), and invite people to the next event." : "This event is coming up. Write a post inviting people to come."}

FACTS
${facts.filter(Boolean).join("\n")}

${voice?.length ? `VOICE EXAMPLES (past posts by this community; match this voice)\n${voice.map((v, i) => `--- Example ${i + 1}${v.platform ? ` (${v.platform})` : ""}\n${v.body}`).join("\n")}` : "No voice examples: use a friendly, down-to-earth grassroots voice."}

WRITE 3 different options for each of these:
${wanted.map((p) => `- ${p}: ${PLATFORMS[p]}`).join("\n")}

Reply with JSON only, no other text, shaped like {${wanted.map((p) => `"${p}": ["...", "...", "..."]`).join(", ")}}.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-5-5",
        max_tokens: 2500,
        system: RULES,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      console.error(res.status, await res.text());
      return json({ error: "The writing assistant didn't answer. Try again in a moment." }, 502);
    }
    const out = await res.json();
    const text: string = (out.content ?? []).map((c: { text?: string }) => c.text ?? "").join("");
    const match = text.match(/\{[\s\S]*\}/);
    let options: Record<string, string[]> = {};
    try {
      options = JSON.parse(match ? match[0] : text);
    } catch {
      return json({ error: "That didn't come out right. Try again." }, 502);
    }
    // Belt and braces: no dashes as punctuation.
    for (const p of Object.keys(options))
      options[p] = (options[p] ?? []).map((s) => String(s).replace(/\s*[—–]\s*/g, ", ").trim()).slice(0, 3);

    await admin.from("copy_generations").insert({ team_id: ev.team_id, event_id: ev.id, user_id: user.id });
    return json({ options, past });
  } catch (e) {
    console.error(e);
    return json({ error: "Couldn't write that. Please try again." }, 500);
  }
});
