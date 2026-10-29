import type { SupabaseClient } from "@supabase/supabase-js";

export type SetupKind = {
  kind: string;
  title: string;
  estimate: number; // minutes per event (middle of a range)
  label: string; // e.g. "5" or "5–10"
  blurb: string | null; // very short description
  when:
    | "before"
    | "during"
    | "after"
    | "weekly"
    | "monthly"
    | "quarterly"
    | "newcomer";
  timesPerWeek: number | null; // weekly/monthly tasks; null = once per event
  custom: boolean; // made by this community's organisers
  defaultOn: boolean; // on until an organiser says otherwise (the newer role actions start off)
  appliesTo: string | null; // which events it's made for ("All events", "Outreach events", a type)
};

export type TaskSetup = {
  kinds: SetupKind[];
  enabled: string[]; // kinds switched on for this community
  configured: boolean; // has an organiser chosen yet?
  eventsPerWeek: number;
  delegates: Record<string, string>; // "kind|eventTypeId" -> person who gets it every time
};

// Which tasks a community has switched on, and how often it runs events.
export async function loadTaskSetup(
  supabase: SupabaseClient,
  teamId: string,
): Promise<TaskSetup> {
  const now = Date.now();
  const [kinds, settings, delegates, events] = await Promise.all([
    supabase
      .from("task_kinds")
      .select(
        "kind, title, blurb, estimate_minutes, estimate_max_minutes, anchor, due_after_hours, team_id, schedule, default_enabled, outreach_only, needs_team_newcomers, needs_newcomers, event_type:event_types(name)",
      )
      .is("archived_at", null)
      .eq("audience", "community")
      // Follow-ups come from another action, and special-event ones from
      // "Plan later": neither is chosen here.
      .not("schedule", "in", "(follow_up,special)")
      .or(`team_id.is.null,team_id.eq.${teamId}`)
      .order("sort_order"),
    supabase
      .from("team_task_kinds")
      .select("kind, enabled")
      .eq("team_id", teamId),
    supabase
      .from("task_delegates")
      .select("kind, event_type_id, person_id")
      .eq("team_id", teamId),
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("team_id", teamId)
      .gte("starts_at", new Date(now - 28 * 864e5).toISOString())
      .lt("starts_at", new Date(now + 28 * 864e5).toISOString()),
  ]);
  const rows = settings.data ?? [];
  const all: SetupKind[] = (kinds.data ?? []).map((k) => ({
    kind: k.kind,
    title: k.title,
    estimate: Math.ceil(
      (k.estimate_minutes + (k.estimate_max_minutes ?? k.estimate_minutes)) / 2,
    ),
    label: k.estimate_max_minutes
      ? `${k.estimate_minutes}–${k.estimate_max_minutes}`
      : String(k.estimate_minutes),
    when:
      k.schedule === "weekly"
        ? "weekly"
        : k.schedule === "monthly"
          ? "monthly"
          : k.schedule === "quarterly"
            ? "quarterly"
            : k.schedule === "month_end"
              ? "monthly"
              : k.schedule === "newcomer"
                ? "newcomer"
                : k.anchor === "end"
                  ? "after"
                  : k.due_after_hours > 0
                    ? "during"
                    : "before",
    timesPerWeek:
      k.schedule === "weekly"
        ? 1
        : k.schedule === "monthly"
          ? 0.25
          : k.schedule === "quarterly"
            ? 1 / 13
            : k.schedule === "month_end"
              ? 0.25
              : k.schedule === "newcomer"
                ? 0.5
                : null,
    custom: !!k.team_id,
    defaultOn: k.default_enabled !== false,
    appliesTo:
      k.schedule !== "event"
        ? null
        : (k.event_type as unknown as { name: string } | null)?.name
          ? `${(k.event_type as unknown as { name: string }).name} only`
          : k.outreach_only
            ? "Outreach events"
            : k.needs_newcomers
              ? "Events where someone new comes"
              : k.needs_team_newcomers
                ? "Events, when you have newcomers"
                : "All events",
    blurb: k.blurb ?? null,
  }));
  const saved = new Map(rows.map((r) => [r.kind, r.enabled]));
  return {
    kinds: all,
    enabled: all
      .filter((k) => saved.get(k.kind) ?? k.defaultOn)
      .map((k) => k.kind),
    configured: rows.length > 0,
    eventsPerWeek: Math.max(1, Math.round(((events.count ?? 0) / 8) * 2) / 2),
    delegates: Object.fromEntries(
      (delegates.data ?? [])
        .filter((d) => d.person_id)
        .map((d) => [
          `${d.kind}|${d.event_type_id ?? ""}`,
          d.person_id as string,
        ]),
    ),
  };
}
