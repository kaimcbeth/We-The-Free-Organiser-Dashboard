// Member feedback summary, written so organisers can share it in the
// community chat (Kai, 19 Nov 2026: "more natural language to be more able
// to be shared in community chats"). Moved out of write-copy, which is too
// big to redeploy from a cloud session. Organisers only; counts towards the
// community's daily writing-assistant limit (copy_generations).
//
// Needs the Edge Function secret ANTHROPIC_API_KEY (optional ANTHROPIC_MODEL).

import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const DAILY_LIMIT = 40;

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
    if (!user) return json({ error: "Sign in to the Hub to use this." }, 401);
    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) return json({ error: "The writing assistant isn't set up yet." }, 500);

    const body = await req.json();
    const teamId = body?.teamId;
    const responses = Array.isArray(body?.responses) ? body.responses.slice(0, 200) : [];
    if (!teamId || responses.length === 0) return json({ error: "No responses to summarise yet." }, 400);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: me } = await admin
      .from("organisers")
      .select("access, team_id, organiser_team_id")
      .eq("id", user.id)
      .maybeSingle();
    if (
      !me ||
      !(me.access === "god" || me.access === "regional_lead" || me.team_id === teamId || me.organiser_team_id === teamId)
    )
      return json({ error: "Only organisers can use this." }, 403);
    const since = new Date(Date.now() - 864e5).toISOString();
    const { count } = await admin
      .from("copy_generations")
      .select("id", { count: "exact", head: true })
      .eq("team_id", teamId)
      .gte("created_at", since);
    if ((count ?? 0) >= DAILY_LIMIT) return json({ error: "That's a lot of writing for one day. Try again tomorrow." }, 429);

    const { data: team } = await admin.from("teams").select("name").eq("id", teamId).maybeSingle();
    const city = String(team?.name ?? "").split(",")[0].trim();

    const clip = (v: unknown) => String(v ?? "").trim().slice(0, 2000);
    const text = responses
      .map((r: Record<string, unknown>, i: number) =>
        [
          `--- Response ${i + 1}${r.rating ? ` (how they're finding it: ${clip(r.label)})` : ""}`,
          r.message ? `Message: ${clip(r.message)}` : "",
          r.going_well ? `Working well: ${clip(r.going_well)}` : "",
          r.better ? `Make it better: ${clip(r.better)}` : "",
        ]
          .filter(Boolean)
          .join("\n"))
      .join("\n");

    const prompt = `These are answers from members of We The Free${city ? ` ${city}` : ""} (a grassroots animal rights community) to a short feedback form: how they're finding it, what's working well, what would make it better.

${text}

Write a summary the organisers can paste straight into the community group chat, so members see they were heard. Write it the way a friendly organiser would talk to the group: warm, plain, natural sentences, "you" for the members and "we" for the community.

Rules:
- Be faithful: only say what the responses say. Don't make things sound better or worse than they are.
- No numbers, scores, ratings, fractions or counts like "(1 of 3)" or "2 of 3 members". Use natural words instead: "a few of you", "one of you", "lots of you", "someone mentioned".
- Never name or hint at who said what. If a response thanks someone by name, you can pass on the thanks to that person.
- Turn criticism into something kind and constructive; never single anyone out for doing something wrong.
- Call people in the community members, never volunteers. Australian spelling. No em or en dashes. At most 3 emoji in the whole thing, only where they fit.

Reply with JSON only, shaped like:
{"overall": "1-2 sentences on how people are finding it, in chat language", "working": ["one natural sentence", ...], "better": ["one natural sentence", ...], "ideas": ["something the community could try, phrased as an idea, not a promise", ...], "message": "the whole thing as one chat message: a short thank-you opener, what's going well, what we heard could be better, a couple of ideas we're thinking about, and an invitation to share more. Short paragraphs, no headings, no bullet symbols other than simple line breaks, under 170 words."}
"working" and "better" 1-4 items each, each under 25 words. "ideas" at most 3.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-5-5",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      console.error(res.status, await res.text());
      return json({ error: "The writing assistant didn't answer. Try again in a moment." }, 502);
    }
    const out = await res.json();
    const raw: string = (out.content ?? []).map((c: { text?: string }) => c.text ?? "").join("");
    const match = raw.match(/\{[\s\S]*\}/);
    try {
      const s = JSON.parse(match ? match[0] : raw);
      const tidy = (v: unknown) =>
        String(v ?? "")
          .replace(/\s*[—–]\s*/g, ", ")
          .replace(/\s*\(\d+ of \d+\)/g, "")
          .trim();
      const list = (v: unknown) => (Array.isArray(v) ? v.map(tidy).filter(Boolean).slice(0, 4) : []);
      const message = String(s.message ?? "")
        .replace(/\s*[—–]\s*/g, ", ")
        .replace(/\s*\(\d+ of \d+\)/g, "")
        .trim();
      await admin.from("copy_generations").insert({ team_id: teamId, event_id: null, user_id: user.id });
      return json({
        summary: {
          overall: tidy(s.overall),
          working: list(s.working),
          better: list(s.better),
          ideas: list(s.ideas).slice(0, 3),
          message,
        },
      });
    } catch {
      return json({ error: "That didn't come out right. Try again." }, 502);
    }
  } catch (e) {
    console.error(e);
    return json({ error: "Something went wrong. Try again." }, 500);
  }
});
