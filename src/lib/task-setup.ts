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
  importance: number | null; // God's ranking (0196): 1 = most important, null = unranked
  tier: 1 | 2 | 3 | null; // 0197: Essential / Good to do / Above and beyond
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
      .select(KIND_COLUMNS)
      .is("archived_at", null)
      .eq("audience", "community")
      // Follow-ups come from another action, and special-event ones from
      // "Plan later": neither is chosen here.
      .not("schedule", "in", "(follow_up,special,pod)")
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
  const all: SetupKind[] = ((kinds.data ?? []) as unknown as KindRow[]).map(
    toSetupKind,
  );
  const saved = new Map(rows.map((r) => [r.kind, r.enabled]));
  return {
    kinds: all,
    enabled: all
      .filter((k) => saved.get(k.kind) ?? k.defaultOn)
      .map((k) => k.kind),
    configured: rows.length > 0,
    eventsPerWeek: Math.max(0.5, Math.round(((events.count ?? 0) / 8) * 2) / 2),
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

export const KIND_COLUMNS =
  "kind, title, blurb, estimate_minutes, estimate_max_minutes, anchor, due_after_hours, team_id, schedule, default_enabled, outreach_only, needs_team_newcomers, needs_newcomers, importance, tier, event_type:event_types(name)";

export type KindRow = {
  kind: string;
  title: string;
  blurb: string | null;
  estimate_minutes: number;
  estimate_max_minutes: number | null;
  anchor: string | null;
  due_after_hours: number;
  team_id: string | null;
  schedule: string;
  default_enabled: boolean | null;
  outreach_only: boolean | null;
  needs_team_newcomers: boolean | null;
  needs_newcomers: boolean | null;
  importance: number | null;
  tier: number | null;
  event_type: unknown;
};

// Time at the events themselves counts towards an organiser's week (Kai,
// 6 Nov 2026: "the average event is 3 hours … that should count"), and
// actions done during an event don't add anything on top of it.
export const EVENT_MINUTES = 180;
export const eventMinutes = (eventsPerWeek: number) =>
  EVENT_MINUTES * eventsPerWeek;

// "How much time do you have each week?" is a slider (Kai, 6 Nov 2026):
// from 2 hours a week up to the time every action would take, events included.
export const MIN_WEEK_MINUTES = 120;
export const SLIDER_STEP = 30;
export function maxWeekMinutes(kinds: SetupKind[], eventsPerWeek: number) {
  const all =
    eventMinutes(eventsPerWeek) +
    kinds.reduce((n, k) => n + weeklyMinutes(k, eventsPerWeek), 0);
  return Math.max(
    MIN_WEEK_MINUTES + SLIDER_STEP,
    Math.ceil(all / SLIDER_STEP) * SLIDER_STEP,
  );
}

// Extra minutes a week an action takes on top of the events (per-event ones
// × events a week; during-event ones are part of the event, so 0).
export const weeklyMinutes = (k: SetupKind, eventsPerWeek: number) =>
  k.when === "during" ? 0 : k.estimate * (k.timesPerWeek ?? eventsPerWeek);

export const eventsLabel = (n: number) =>
  n === 0.5 ? "1 event a fortnight" : `${n} event${n === 1 ? "" : "s"} a week`;

// Most important first: the community's own actions, then God's ranking
// (0196), then unranked ones.
export const byImportance = (a: SetupKind, b: SetupKind) =>
  Number(b.custom) - Number(a.custom) ||
  (a.tier ?? 4) - (b.tier ?? 4) ||
  (a.importance ?? 1e6) - (b.importance ?? 1e6);

// What "How much time do you have?" suggests: every Essential action, always;
// then, with the events' own hours counted first, going down the ranking,
// every action that still fits (during-event actions cost nothing extra, so
// they fit whenever there's any time left).
export function suggestForBudget(
  kinds: SetupKind[],
  minutes: number,
  eventsPerWeek: number,
) {
  const next = new Set<string>();
  let used = eventMinutes(eventsPerWeek);
  for (const k of [...kinds].sort(byImportance)) {
    const cost = weeklyMinutes(k, eventsPerWeek);
    // Essential (tier 1) actions are always suggested (Kai, 6 Nov 2026).
    if (k.tier === 1 || next.size === 0 || used + cost <= minutes) {
      next.add(k.kind);
      used += cost;
    }
  }
  return next;
}

export function toSetupKind(k: KindRow): SetupKind {
  return {
    kind: k.kind,
    title: k.title,
    estimate: Math.ceil(
      (k.estimate_minutes + (k.estimate_max_minutes ?? k.estimate_minutes)) / 2,
    ),
    label: k.estimate_max_minutes
      ? `${k.estimate_minutes}–${k.estimate_max_minutes}`
      : String(k.estimate_minutes),
    when:
      k.schedule === "weekly" || k.schedule === "fortnightly"
        ? "weekly"
        : k.schedule === "monthly"
          ? "monthly"
          : k.schedule === "quarterly" || k.schedule === "season"
            ? "quarterly"
            : k.schedule === "month_end" || k.schedule === "birthday"
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
        : k.schedule === "fortnightly"
          ? 0.5
          : k.schedule === "monthly"
            ? 0.25
            : k.schedule === "quarterly" || k.schedule === "season"
              ? 1 / 13
              : k.schedule === "month_end" || k.schedule === "birthday"
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
    importance: k.importance ?? null,
    tier: (k.tier as 1 | 2 | 3 | null) ?? null,
  };
}
