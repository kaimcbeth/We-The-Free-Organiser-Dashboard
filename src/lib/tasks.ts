import type { SupabaseClient } from "@supabase/supabase-js";
import type { TaskRow } from "@/components/task-card";

type Raw = {
  id: string;
  due_at: string;
  done_at: string | null;
  assigned_to: string | null;
  kind: {
    title: string;
    description: string | null;
    estimate_minutes: number;
  } | null;
  event: { title: string; starts_at: string } | null;
  assignee: { first_name: string; last_name: string | null } | null;
};

const SELECT =
  "id, due_at, done_at, assigned_to, kind:task_kinds(title, description, estimate_minutes), event:events(title, starts_at), assignee:people!tasks_assigned_to_fkey(first_name, last_name)";

function toRow(t: Raw): TaskRow {
  return {
    id: t.id,
    title: t.kind?.title ?? "Task",
    description: t.kind?.description ?? null,
    estimateMinutes: t.kind?.estimate_minutes ?? 5,
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
      .order("due_at")
      .returns<Raw[]>(),
    supabase
      .from("tasks")
      .select(SELECT)
      .eq("team_id", teamId)
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
    .order("due_at")
    .returns<Raw[]>();
  return (data ?? []).map(toRow);
}
