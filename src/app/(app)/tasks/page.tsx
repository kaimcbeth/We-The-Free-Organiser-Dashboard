import { requireOrganiser } from "@/lib/organiser";
import { LoadError } from "@/components/load-error";
import { TaskCard } from "@/components/task-card";
import { loadTeamTasks } from "@/lib/tasks";
import { loadTaskSetup } from "@/lib/task-setup";
import { ChooseTasks } from "./choose-tasks";
import { formatEventDate } from "@/lib/time";

export default async function TasksPage() {
  const { supabase, organiser } = await requireOrganiser();
  const [tasks, { data: people }, setup] = await Promise.all([
    loadTeamTasks(supabase, organiser.team_id),
    supabase
      .from("people")
      .select("id, first_name, last_name")
      .eq("team_id", organiser.team_id)
      .not("user_id", "is", null)
      .order("first_name"),
    loadTaskSetup(supabase, organiser.team_id),
  ]);
  if (!tasks) return <LoadError what="tasks" />;

  // eslint-disable-next-line react-hooks/purity -- server component, rendered per request
  const now = Date.now();
  const assignable = (people ?? []).map((p) => ({
    id: p.id,
    name: [p.first_name, p.last_name].filter(Boolean).join(" "),
  }));
  const minutes = tasks.open.reduce((n, t) => n + t.estimateMinutes, 0);

  // Open tasks grouped by event: the event due soonest first, then the
  // tasks in their usual order (WhatsApp, Facebook, Instagram…).
  const byEvent = new Map<
    string,
    { key: string; title: string; at: string | null; tasks: typeof tasks.open }
  >();
  for (const t of tasks.open) {
    const key = t.eventId ?? "other";
    const g = byEvent.get(key) ?? {
      key,
      title: t.eventTitle ?? "Other tasks",
      at: t.eventAt,
      tasks: [],
    };
    g.tasks.push(t);
    byEvent.set(key, g);
  }
  const groups = [...byEvent.values()]
    .map((g) => ({
      ...g,
      tasks: g.tasks.sort((a, b) => a.sortOrder - b.sortOrder),
    }))
    .sort((a, b) => (a.at ?? "").localeCompare(b.at ?? ""));
  const common = {
    tz: organiser.team.timezone,
    now,
    standing: setup.delegates,
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
        <div className="mt-3">
          <ChooseTasks
            setup={setup}
            communityName={organiser.team.name.replace(
              /, (Australia|New Zealand)$/,
              "",
            )}
          />
        </div>
      </div>

      {groups.map((g) => (
        <section key={g.key}>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="min-w-0 truncate font-semibold">
              {g.title}
              {g.at && (
                <span className="font-normal text-stone-500">
                  {" "}
                  · {formatEventDate(g.at)}
                </span>
              )}
            </h2>
            <span className="shrink-0 text-xs text-stone-500">
              {g.tasks.length} to do · ~
              {g.tasks.reduce((n, t) => n + t.estimateMinutes, 0)} min
            </span>
          </div>
          <ul className="space-y-3">
            {g.tasks.map((t) => (
              <TaskCard key={t.id} task={t} {...common} hideEvent />
            ))}
          </ul>
        </section>
      ))}

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
