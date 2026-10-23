import type { SupabaseClient } from "@supabase/supabase-js";

export type UpcomingAction = {
  eventId: string;
  kind: string;
  description: string | null;
  minutes: string; // "5" or "5–10"
  eventTitle: string;
  eventAt: string;
  title: string;
  appearsAt: string;
};

// Actions that will appear for the community's events in the next week but
// haven't yet (e.g. "Prizes purchased" shows up a week before a Movie
// Challenge). Mirrors how private.create_event_tasks decides.
export async function loadUpcomingActions(
  supabase: SupabaseClient,
  teamId: string,
  enabled: string[],
  now: number,
): Promise<UpcomingAction[]> {
  const DAY = 864e5;
  const [{ data: events }, { data: kinds }] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, starts_at, ends_at, event_type_id")
      .eq("team_id", teamId)
      .gte("starts_at", new Date(now).toISOString())
      .lte("starts_at", new Date(now + 21 * DAY).toISOString()),
    supabase
      .from("task_kinds")
      .select(
        "kind, title, description, estimate_minutes, estimate_max_minutes, anchor, appear_hours, event_type_id, team_id",
      )
      .is("archived_at", null)
      .eq("audience", "community")
      .eq("schedule", "event")
      .or(`team_id.is.null,team_id.eq.${teamId}`),
  ]);
  if (!events?.length || !kinds?.length) return [];
  const { data: made } = await supabase
    .from("tasks")
    .select("event_id, kind")
    .in(
      "event_id",
      events.map((e) => e.id),
    );
  const exists = new Set((made ?? []).map((t) => `${t.event_id}|${t.kind}`));
  const on = new Set(enabled);
  const out: UpcomingAction[] = [];
  for (const e of events)
    for (const k of kinds) {
      if (!on.has(k.kind) || exists.has(`${e.id}|${k.kind}`)) continue;
      if (k.event_type_id && k.event_type_id !== e.event_type_id) continue;
      const anchor = Date.parse(
        k.anchor === "end" ? (e.ends_at ?? e.starts_at) : e.starts_at,
      );
      const appears = anchor + Number(k.appear_hours) * 36e5;
      if (appears > now && appears <= now + 7 * DAY)
        out.push({
          eventId: e.id,
          kind: k.kind,
          description: k.description ?? null,
          minutes: k.estimate_max_minutes
            ? `${k.estimate_minutes}–${k.estimate_max_minutes}`
            : String(k.estimate_minutes),
          eventTitle: e.title,
          eventAt: e.starts_at,
          title: k.title,
          appearsAt: new Date(appears).toISOString(),
        });
    }
  return out.sort((a, b) => a.appearsAt.localeCompare(b.appearsAt));
}
