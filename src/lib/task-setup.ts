import type { SupabaseClient } from "@supabase/supabase-js";

export type TaskSetup = {
  kinds: { kind: string; title: string; estimate: number }[];
  enabled: string[]; // kinds switched on for this community
  configured: boolean; // has an organiser chosen yet?
  eventsPerWeek: number;
};

// Which follow-up tasks a community has switched on, and how often it runs events.
export async function loadTaskSetup(
  supabase: SupabaseClient,
  teamId: string,
): Promise<TaskSetup> {
  const now = Date.now();
  const [kinds, settings, events] = await Promise.all([
    supabase
      .from("task_kinds")
      .select("kind, title, estimate_minutes")
      .order("sort_order"),
    supabase
      .from("team_task_kinds")
      .select("kind, enabled")
      .eq("team_id", teamId),
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("team_id", teamId)
      .gte("starts_at", new Date(now - 28 * 864e5).toISOString())
      .lt("starts_at", new Date(now + 28 * 864e5).toISOString()),
  ]);
  const rows = settings.data ?? [];
  const all = (kinds.data ?? []).map((k) => ({
    kind: k.kind,
    title: k.title,
    estimate: k.estimate_minutes,
  }));
  const off = new Set(rows.filter((r) => !r.enabled).map((r) => r.kind));
  return {
    kinds: all,
    enabled: all.filter((k) => !off.has(k.kind)).map((k) => k.kind),
    configured: rows.length > 0,
    eventsPerWeek: Math.max(1, Math.round(((events.count ?? 0) / 8) * 2) / 2),
  };
}
