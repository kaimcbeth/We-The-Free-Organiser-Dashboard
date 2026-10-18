// Imports each team's events from its activism.wtf calendar feed.
// Runs twice a day (pg_cron) and when an organiser taps "Import now".
// Adds new events and updates changed ones; never deletes, and never
// overwrites an event type an organiser has chosen.

import { createClient } from "npm:@supabase/supabase-js@2";
import { cleanTitle, guessType, parseIcs, splitLocation } from "./ics.ts";

const LOOKBACK_DAYS = 14;

type Team = { id: string; name: string; activism_team_url: string; timezone: string };

Deno.serve(async () => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Don't run more than once a minute.
  const { data: last } = await supabase
    .from("import_runs")
    .select("ran_at")
    .order("ran_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (last && Date.now() - Date.parse(last.ran_at) < 60_000) {
    return Response.json({ skipped: "ran less than a minute ago" });
  }

  const [{ data: teams }, { data: types }] = await Promise.all([
    supabase.from("teams").select("id, name, activism_team_url, timezone").not("activism_team_url", "is", null),
    supabase.from("event_types").select("id, name"),
  ]);
  const typeId = new Map((types ?? []).map((t) => [t.name as string, t.id as string]));
  const cutoff = Date.now() - LOOKBACK_DAYS * 864e5;
  const results = [];

  for (const team of (teams ?? []) as Team[]) {
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
    results.push({ team: team.name, ...run });
  }

  return Response.json({ results });
});
