// Imports each team's events from its activism.wtf calendar feed.
// Runs every hour (pg_cron) on the communities checked longest ago, a batch at
// a time so it stays inside the time limit with 200+ communities, and for one
// community when an organiser taps "Import now" ({ teamId }).
// Adds new events and updates changed ones; never deletes, and never
// overwrites an event type an organiser has chosen.

import { createClient } from "npm:@supabase/supabase-js@2";
import { cleanTitle, guessType, parseIcs, splitLocation } from "./ics.ts";

const LOOKBACK_DAYS = 14;
const BATCH = 70; // communities per scheduled run
const TIME_BUDGET_MS = 100_000; // stop starting new ones after this

type Team = { id: string; name: string; activism_team_url: string; timezone: string };

Deno.serve(async (req) => {
  const started = Date.now();
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const body = await req.json().catch(() => ({}));
  const teamId: string | null = typeof body?.teamId === "string" ? body.teamId : null;

  let teamsQuery = supabase
    .from("teams")
    .select("id, name, activism_team_url, timezone, last_import_at")
    .not("activism_team_url", "is", null);
  if (teamId) {
    teamsQuery = teamsQuery.eq("id", teamId);
  } else {
    teamsQuery = teamsQuery.order("last_import_at", { ascending: true, nullsFirst: true }).limit(BATCH);
  }
  const [{ data: teams }, { data: types }] = await Promise.all([
    teamsQuery,
    supabase.from("event_types").select("id, name"),
  ]);
  // Don't re-import one community more than once a minute.
  if (teamId) {
    const t = (teams ?? [])[0] as (Team & { last_import_at: string | null }) | undefined;
    if (t?.last_import_at && Date.now() - Date.parse(t.last_import_at) < 60_000)
      return Response.json({ skipped: "ran less than a minute ago" });
  }
  const typeId = new Map((types ?? []).map((t) => [t.name as string, t.id as string]));
  const cutoff = Date.now() - LOOKBACK_DAYS * 864e5;
  const results = [];

  for (const team of (teams ?? []) as Team[]) {
    if (!teamId && Date.now() - started > TIME_BUDGET_MS) break;
    const run = { team_id: team.id, ok: true, found: 0, added: 0, updated: 0, message: null as string | null };
    try {
      const feedUrl = team.activism_team_url.replace(/\/+$/, "") + "/events.ics";
      const res = await fetch(feedUrl, { headers: { "User-Agent": "WTF-Organiser-Import/1.0" } });
      if (!res.ok) throw new Error(`Feed returned ${res.status}`);
      const text = await res.text();
      if (!text.includes("BEGIN:VCALENDAR")) throw new Error("Feed isn't a calendar");

      const events = parseIcs(text, team.timezone).filter((e) => Date.parse(e.startsAt) >= cutoff);
      run.found = events.length;

      const { data: existing } = await supabase
        .from("events")
        .select("id, source_uid, title, starts_at, ends_at, venue, address, description, source_url")
        .eq("team_id", team.id)
        .not("source_uid", "is", null);
      const byUid = new Map((existing ?? []).map((e) => [e.source_uid as string, e]));

      for (const e of events) {
        const split = splitLocation(e.location);
        const venue = e.venueName && e.venueName !== e.location ? e.venueName : split.venue;
        const address = e.venueName ? e.location : split.address;
        const row = {
          title: cleanTitle(e.summary),
          starts_at: e.startsAt,
          ends_at: e.endsAt,
          venue,
          address,
          description: e.description?.slice(0, 8000) ?? null,
          source_url: e.url,
        };
        const prev = byUid.get(e.uid);
        if (!prev) {
          const guessed = guessType(e.summary);
          const { error } = await supabase.from("events").insert({
            ...row,
            team_id: team.id,
            source_uid: e.uid,
            source: "imported",
            event_type_id: guessed ? (typeId.get(guessed) ?? null) : null,
          });
          if (error) throw new Error(`Adding "${row.title}": ${error.message}`);
          run.added++;
        } else {
          const changed =
            prev.title !== row.title ||
            Date.parse(prev.starts_at) !== Date.parse(row.starts_at) ||
            (prev.ends_at ? Date.parse(prev.ends_at) : null) !== (row.ends_at ? Date.parse(row.ends_at) : null) ||
            prev.venue !== row.venue ||
            prev.address !== row.address ||
            prev.description !== row.description ||
            prev.source_url !== row.source_url;
          if (changed) {
            const { error } = await supabase
              .from("events")
              .update({ ...row, updated_at: new Date().toISOString() })
              .eq("id", prev.id);
            if (error) throw new Error(`Updating "${row.title}": ${error.message}`);
            run.updated++;
          }
        }
      }
    } catch (err) {
      run.ok = false;
      run.message = err instanceof Error ? err.message : String(err);
    }
    await supabase.from("import_runs").insert(run);
    await supabase.from("teams").update({ last_import_at: new Date().toISOString() }).eq("id", team.id);
    results.push({ team: team.name, ...run });
  }

  return Response.json({ results });
});
