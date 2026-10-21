import type { SupabaseClient } from "@supabase/supabase-js";
import type { TaskRow } from "@/components/task-card";

type Raw = {
  id: string;
  due_at: string;
  done_at: string | null;
  assigned_to: string | null;
  kind: {
    kind: string;
    sort_order: number;
    title: string;
    description: string | null;
    estimate_minutes: number;
    estimate_max_minutes: number | null;
  } | null;
  event: {
    id: string;
    title: string;
    starts_at: string;
    event_type_id: string | null;
    event_type: { name: string } | null;
  } | null;
  assignee: { first_name: string; last_name: string | null } | null;
};

const SELECT =
  "id, due_at, done_at, assigned_to, kind:task_kinds(kind, sort_order, title, description, estimate_minutes, estimate_max_minutes), event:events(id, title, starts_at, event_type_id, event_type:event_types(name)), assignee:people!tasks_assigned_to_fkey(first_name, last_name)";

function toRow(t: Raw): TaskRow {
  return {
    id: t.id,
    kind: t.kind?.kind ?? "",
    sortOrder: t.kind?.sort_order ?? 0,
    eventId: t.event?.id ?? null,
    eventTypeId: t.event?.event_type_id ?? null,
    eventTypeName: t.event?.event_type?.name ?? null,
    title: t.kind?.title ?? "Task",
    description: t.kind?.description ?? null,
    // Ranges ("5–10 min") count as their middle for totals.
    estimateMinutes: Math.ceil(
      ((t.kind?.estimate_minutes ?? 5) +
        (t.kind?.estimate_max_minutes ?? t.kind?.estimate_minutes ?? 5)) /
        2,
    ),
    estimateLabel: t.kind?.estimate_max_minutes
      ? `${t.kind.estimate_minutes}–${t.kind.estimate_max_minutes}`
      : String(t.kind?.estimate_minutes ?? 5),
    dueAt: t.due_at,
    doneAt: t.done_at,
    eventTitle: t.event?.title ?? null,
    eventAt: t.event?.starts_at ?? null,
    assignedTo: t.assigned_to,
    assigneeName: t.assignee
      ? [t.assignee.first_name, t.assignee.last_name].filter(Boolean).join(" ")
      : null,
  };
}

// A team's open tasks (soonest due first) and the last fortnight's done ones.
export async function loadTeamTasks(supabase: SupabaseClient, teamId: string) {
  const since = new Date(Date.now() - 14 * 864e5).toISOString();
  const [open, done] = await Promise.all([
    supabase
      .from("tasks")
      .select(SELECT)
      .eq("team_id", teamId)
      .is("done_at", null)
      .is("dismissed_at", null)
      .order("due_at")
      .returns<Raw[]>(),
    supabase
      .from("tasks")
      .select(SELECT)
      .eq("team_id", teamId)
      .is("dismissed_at", null)
      .gte("done_at", since)
      .order("done_at", { ascending: false })
      .returns<Raw[]>(),
  ]);
  if (open.error || done.error) return null;
  return {
    open: (open.data ?? []).map(toRow),
    done: (done.data ?? []).map(toRow),
  };
}

// Open tasks assigned to one person (their own page).
export async function loadMyTasks(supabase: SupabaseClient, personId: string) {
  const { data } = await supabase
    .from("tasks")
    .select(SELECT)
    .eq("assigned_to", personId)
    .is("done_at", null)
    .is("dismissed_at", null)
    .order("due_at")
    .returns<Raw[]>();
  return (data ?? []).map(toRow);
}
