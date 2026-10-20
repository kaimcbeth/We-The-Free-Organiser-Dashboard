import { requireOrganiser } from "@/lib/organiser";
import { LoadError } from "@/components/load-error";
import { TaskCard } from "@/components/task-card";
import { loadTeamTasks } from "@/lib/tasks";

export default async function TasksPage() {
  const { supabase, organiser } = await requireOrganiser();
  const [tasks, { data: people }] = await Promise.all([
    loadTeamTasks(supabase, organiser.team_id),
    supabase
      .from("people")
      .select("id, first_name, last_name")
      .eq("team_id", organiser.team_id)
      .not("user_id", "is", null)
      .order("first_name"),
  ]);
  if (!tasks) return <LoadError what="tasks" />;

  // eslint-disable-next-line react-hooks/purity -- server component, rendered per request
  const now = Date.now();
  const assignable = (people ?? []).map((p) => ({
    id: p.id,
    name: [p.first_name, p.last_name].filter(Boolean).join(" "),
  }));
  const minutes = tasks.open.reduce((n, t) => n + t.estimateMinutes, 0);
  const common = {
    tz: organiser.team.timezone,
    now,
    people: assignable,
    whatsappUrl: organiser.team.whatsapp_url,
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <p className="mt-1 text-sm text-stone-500">
          {tasks.open.length === 0
            ? "All done. New tasks appear here after each event."
            : `${tasks.open.length} to do · about ${minutes} min in total`}
        </p>
      </div>

      {tasks.open.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
            To do
          </h2>
          <ul className="space-y-3">
            {tasks.open.map((t) => (
              <TaskCard key={t.id} task={t} {...common} />
            ))}
          </ul>
        </section>
      )}

      {tasks.done.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
            Done recently
          </h2>
          <ul className="space-y-3">
            {tasks.done.map((t) => (
              <TaskCard key={t.id} task={t} {...common} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
