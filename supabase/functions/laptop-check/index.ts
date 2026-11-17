// Is this laptop good for the Movie Challenge? (Kai, 17 Nov 2026: "put a link
// or upload a screenshot or simply model name of a device and it will tell if
// it's good … $150 AUD or under, domestic postage, battery that lasts at least
// 3 hours".) Claude with web search looks up the model's specs and the
// listing. Organisers and Core Team only; counts towards the community's
// daily writing-assistant limit (copy_generations).
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
const COUNTRY_CODES: Record<string, string> = {
  australia: "AU", "new zealand": "NZ", "united kingdom": "GB", uk: "GB", england: "GB", scotland: "GB",
  wales: "GB", ireland: "IE", "united states": "US", usa: "US", canada: "CA", japan: "JP", india: "IN",
  germany: "DE", france: "FR", netherlands: "NL", spain: "ES", italy: "IT", brazil: "BR", mexico: "MX",
  singapore: "SG", "south africa": "ZA", philippines: "PH", indonesia: "ID",
};
const RULES = ["price", "postage", "battery"] as const;

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
    if (!user) return json({ error: "Sign in to the Hub to use the laptop checker." }, 401);
    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) return json({ error: "The checker isn't set up yet." }, 500);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: me } = await admin
      .from("organisers")
      .select("access, team_id, organiser_team_id")
      .eq("id", user.id)
      .maybeSingle();
    if (!me) return json({ error: "Only organisers and the Core Team can use this." }, 403);

    const body = await req.json();
    const link = String(body?.link ?? "").trim().slice(0, 1000);
    const model = String(body?.model ?? "").trim().slice(0, 300);
    const image = body?.image && typeof body.image.data === "string" ? body.image : null;
    if (!link && !model && !image) return json({ error: "Add a link, a screenshot or a model name." }, 400);
    if (link && !/^https?:\/\//i.test(link))
      return json({ error: "That link doesn't look right. It should start with https://" }, 400);
    if (image && (image.data.length > 7_000_000 || !/^image\/(jpeg|png|webp|gif)$/.test(String(image.media_type))))
      return json({ error: "That screenshot is too big or not a picture. Try a smaller one." }, 400);

    // Their community's country, for the price and postage.
    const teamId = me.organiser_team_id ?? me.team_id;
    let country = "Australia";
    let tz = "Australia/Sydney";
    if (teamId) {
      const { data: team } = await admin.from("teams").select("name, timezone").eq("id", teamId).maybeSingle();
      const c = String(team?.name ?? "").split(",").slice(1).join(",").trim();
      if (c) country = c;
      tz = team?.timezone ?? tz;
      const since = new Date(Date.now() - 864e5).toISOString();
      const { count } = await admin
        .from("copy_generations")
        .select("id", { count: "exact", head: true })
        .eq("team_id", teamId)
        .gte("created_at", since);
      if ((count ?? 0) >= DAILY_LIMIT) return json({ error: "That's a lot of checks for one day. Try again tomorrow." }, 429);
    }
    // Facebook Marketplace is local pick-up (Kai, 17 Nov 2026: "If on FB
    // marketplace it's likely local").
    const marketplace = /facebook\.com\/(marketplace|commerce)|fb\.com\/marketplace/i.test(link);
    const budget = country === "Australia" ? "A$150" : `A$150 (convert it to the local currency of ${country})`;

    const prompt = `A We The Free community in ${country} is buying laptops to play short films to the public at a street outreach stall (the "Movie Challenge"). Each laptop plays a 3 minute MP4 from a USB stick over and over for an afternoon, in a web browser, with headphones plugged in. Nothing fancy: any working laptop that can play a video is fine.

Check whether this device is good for it:
${link ? `- Listing link: ${link}\n` : ""}${model ? `- Model or description given: ${model}\n` : ""}${image ? "- A screenshot of the listing is attached.\n" : ""}
THE THREE RULES (from Kai, the organiser)
1. Price: ${budget} or under for the laptop, including postage if there is any.
2. Postage: it must ship from within ${country} (or be picked up locally). Sellers posting from overseas are a no. Facebook Marketplace listings are local pick-up, so they pass this rule (detail: "Facebook Marketplace, local pick-up"). That includes a screenshot that looks like Facebook Marketplace.${marketplace ? "\n   This link IS a Facebook Marketplace listing: postage passes." : ""}
3. Battery: lasts at least 3 hours playing video on its own battery.

HOW TO CHECK
- Use web search to find the model's battery life (manufacturer specs, reviews) and, if there's a link, what the listing says (price, where it ships from, condition). If the link can't be opened (e.g. Facebook Marketplace needs a login), say so in the summary and work from the model name or screenshot.
- Read the price, postage and seller location off the screenshot if there is one.
- Second-hand and refurbished laptops: batteries wear down. If the listing gives battery health or hours, use that. If not, judge from the original battery life and the laptop's age (one rated 8 hours or more new is usually still fine after a few years; one rated 4 hours new probably isn't), and say to ask the seller about battery health.
- If only a model name is given, there's no price or postage to read: mark those "unknown" and say what it usually sells for second-hand or refurbished in ${country}.
- Never invent numbers. If you can't find something, mark it "unknown".
- Also note anything else that matters for this use, briefly: no headphone jack, no USB port for the stick, an operating system too old to run a current Chrome or Edge, a cracked screen, a screen under 13 inches. At most 4 short notes; none if nothing matters.

Reply with JSON only, no other text:
{"device": "make and model as best you can tell", "summary": "one or two plain sentences", "checks": [{"rule": "price", "result": "pass" | "fail" | "unknown", "detail": "short, e.g. A$120 plus A$15 postage = A$135"}, {"rule": "postage", "result": ..., "detail": ...}, {"rule": "battery", "result": ..., "detail": ...}], "notes": ["short note"]}
Australian spelling, plain words, no em or en dashes.`;

    // deno-lint-ignore no-explicit-any
    const content: any[] = [];
    if (image) content.push({ type: "image", source: { type: "base64", media_type: image.media_type, data: image.data } });
    content.push({ type: "text", text: prompt });
    const code = COUNTRY_CODES[country.toLowerCase()];
    const search: Record<string, unknown> = { type: "web_search_20250305", name: "web_search", max_uses: 5 };
    if (code) search.user_location = { type: "approximate", country: code, timezone: tz };
    const fetchTool = { type: "web_fetch_20250910", name: "web_fetch", max_uses: 2 };

    // deno-lint-ignore no-explicit-any
    const messages: any[] = [{ role: "user", content }];
    // deno-lint-ignore no-explicit-any
    let blocks: any[] = [];
    let withFetch = !!link; // read the listing page itself, where the account allows it
    for (let turn = 0; turn < 4; turn++) {
      const headers: Record<string, string> = {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      };
      if (withFetch) headers["anthropic-beta"] = "web-fetch-2025-09-10";
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-5-5",
          max_tokens: 3000,
          tools: withFetch ? [search, fetchTool] : [search],
          messages,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        console.error(res.status, t);
        if (withFetch && /fetch/i.test(t)) {
          // No web fetch on this account: carry on with search only.
          withFetch = false;
          turn--;
          continue;
        }
        if (/web.?search/i.test(t)) return json({ error: "Web search isn't switched on for the assistant yet." }, 502);
        return json({ error: "The checker didn't answer. Try again in a moment." }, 502);
      }
      const out = await res.json();
      blocks = blocks.concat(out.content ?? []);
      if (out.stop_reason !== "pause_turn") break;
      messages.push({ role: "assistant", content: out.content });
    }

    const text = blocks.filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
    const start = text.indexOf('{"device"') >= 0 ? text.indexOf('{"device"') : text.indexOf("{");
    // deno-lint-ignore no-explicit-any
    let parsed: any = {};
    try {
      parsed = JSON.parse(text.slice(start, text.lastIndexOf("}") + 1));
    } catch {
      return json({ error: "That didn't come out right. Try again." }, 502);
    }
    const tidy = (v: unknown) => String(v ?? "").replace(/\s*[—–]\s*/g, ", ").trim();
    const checks = RULES.map((rule) => {
      // deno-lint-ignore no-explicit-any
      const c = (Array.isArray(parsed.checks) ? parsed.checks : []).find((x: any) => x?.rule === rule) ?? {};
      if (rule === "postage" && marketplace && c.result !== "pass")
        return { rule, result: "pass", detail: "Facebook Marketplace, local pick-up" };
      const result = c.result === "pass" || c.result === "fail" ? c.result : "unknown";
      return { rule, result, detail: tidy(c.detail) };
    });
    // The verdict follows the checks.
    const verdict = checks.some((c) => c.result === "fail")
      ? "not_good"
      : checks.every((c) => c.result === "pass")
        ? "good"
        : "check";
    if (teamId) await admin.from("copy_generations").insert({ team_id: teamId, event_id: null, user_id: user.id });
    return json({
      device: tidy(parsed.device) || model || "This laptop",
      verdict,
      summary: tidy(parsed.summary),
      checks,
      notes: (Array.isArray(parsed.notes) ? parsed.notes : []).map(tidy).filter(Boolean).slice(0, 4),
      country,
    });
  } catch (e) {
    console.error(e);
    return json({ error: "Something went wrong. Try again." }, 500);
  }
});
