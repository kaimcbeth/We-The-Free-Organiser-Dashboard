import { requireOrganiser } from "@/lib/organiser";
import { LoadError } from "@/components/load-error";
import { TaskCard } from "@/components/task-card";
import { loadTeamTasks } from "@/lib/tasks";
import { loadTaskSetup } from "@/lib/task-setup";
import { ChooseTasks } from "./choose-tasks";
import { RemoveEventTasks } from "./remove-event-tasks";
import { formatEventDate } from "@/lib/time";
import { loadConnectContext } from "@/lib/connect";
import { ConnectIdeas } from "@/components/connect-ideas";
import { RegionTasks } from "./region-tasks";
import { CoreTeamTasks } from "./core-team-tasks";
import { CORE_ROLE_LABEL, type CoreRole } from "@/lib/roles";

export default async function TasksPage() {
  const { supabase, organiser } = await requireOrganiser();
  const regionalStaff =
    organiser.role === "god" || organiser.role === "regional_lead";
  // Regional Support Leads only get their own tasks (the communities' tasks
  // are for the communities). God Mode sees both.
  if (organiser.role === "regional_lead" || organiser.allCommunities)
    return (
      <RegionTasks
        supabase={supabase}
        teams={organiser.allCommunities ? organiser.teams : [organiser.team]}
        showCommunities={organiser.role === "god"}
      />
    );
  const [tasks, { data: people }, setup, connect, { data: leadRows }] =
    await Promise.all([
      loadTeamTasks(supabase, organiser.team_id, { regional: regionalStaff }),
      supabase
        .from("people")
        .select("id, first_name, last_name")
        .eq("team_id", organiser.team_id)
        .not("user_id", "is", null)
        .order("first_name"),
      loadTaskSetup(supabase, organiser.team_id),
      regionalStaff
        ? loadConnectContext(supabase, [organiser.team])
        : Promise.resolve(null),
      supabase
        .from("person_core_roles")
        .select("person_id, core_role")
        .eq("team_id", organiser.team_id)
        .is("ended_at", null),
    ]);
  if (!tasks) return <LoadError what="tasks" />;

  // eslint-disable-next-line react-hooks/purity -- server component, rendered per request
  const now = Date.now();
  const assignable = (people ?? []).map((p) => ({
    id: p.id,
    name: [p.first_name, p.last_name].filter(Boolean).join(" "),
  }));
  // Tasks with someone on them (Core Team or a helper) are shown separately,
  // so the main list is just what's left for the organisers.
  const covered = tasks.open.filter((t) => !t.regional && t.assignedTo);
  const leadsOf = new Map<string, string[]>();
  for (const r of (leadRows ?? []) as {
    person_id: string;
    core_role: CoreRole;
  }[])
    leadsOf.set(r.person_id, [
      ...(leadsOf.get(r.person_id) ?? []),
      CORE_ROLE_LABEL[r.core_role],
    ]);
  const crew = [
    ...new Set([
      ...covered.map((t) => t.assignedTo!),
      ...tasks.done.filter((t) => t.assignedTo).map((t) => t.assignedTo!),
      ...leadsOf.keys(),
    ]),
  ]
    .map((id) => ({
      id,
      name:
        assignable.find((p) => p.id === id)?.name ??
        covered.find((t) => t.assignedTo === id)?.assigneeName ??
        "Someone",
      leads: leadsOf.get(id) ?? [],
      open: covered
        .filter((t) => t.assignedTo === id)
        .sort((a, b) => a.dueAt.localeCompare(b.dueAt)),
      done: tasks.done.filter((t) => t.assignedTo === id).length,
    }))
    .sort(
      (a, b) => b.leads.length - a.leads.length || a.name.localeCompare(b.name),
    );
  const minutes = tasks.open
    .filter((t) => !t.regional && !t.assignedTo)
    .reduce((n, t) => n + t.estimateMinutes, 0);
  // Regional Support Lead check-ins sit on their own, above the community's tasks.
  const checkIns = tasks.open.filter((t) => t.regional);

  // Open tasks grouped by event: the event due soonest first, then the
  // tasks in their usual order (WhatsApp, Facebook, Instagram…).
  const byEvent = new Map<
    string,
    { key: string; title: string; at: string | null; tasks: typeof tasks.open }
  >();
  for (const t of tasks.open.filter((t) => !t.regional && !t.assignedTo)) {
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
          {groups.reduce((n, g) => n + g.tasks.length, 0) === 0
            ? "Nothing left for the organisers. New tasks appear here after each event."
            : `${groups.reduce((n, g) => n + g.tasks.length, 0)} for the organisers · about ${minutes} min in total`}
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

      {checkIns.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold">
            For you as Regional Support Lead
          </h2>
          <ul className="space-y-3">
            {checkIns.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                tz={common.tz}
                now={now}
                whatsappUrl={null}
                removable
                moveEvents={connect?.[t.teamId]?.upcoming}
                extra={
                  connect?.[t.teamId] && (
                    <ConnectIdeas ctx={connect[t.teamId]} />
                  )
                }
              />
            ))}
          </ul>
        </section>
      )}

      <CoreTeamTasks crew={crew} now={now} tz={common.tz} />

      {groups.map((g) => (
        <section key={g.key}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="min-w-0 truncate font-semibold">
              {g.title}
              {g.at && (
                <span className="font-normal text-stone-500">
                  {" "}
                  · {formatEventDate(g.at)}
                </span>
              )}
            </h2>
            <span className="ml-auto shrink-0 text-xs text-stone-500">
              {g.tasks.length} to do · ~
              {g.tasks.reduce((n, t) => n + t.estimateMinutes, 0)} min
            </span>
            {g.key !== "other" && (
              <RemoveEventTasks eventId={g.key} count={g.tasks.length} />
            )}
          </div>
          <ul className="space-y-3">
            {g.tasks.map((t) => (
              <TaskCard key={t.id} task={t} {...common} hideEvent />
            ))}
          </ul>
        </section>
      ))}

      {tasks.later.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
            Moved for later
          </h2>
          <ul className="divide-y divide-black/5 overflow-hidden rounded-2xl bg-white text-sm shadow-sm ring-1 ring-black/5">
            {tasks.later.map((t) => (
              <li key={t.id} className="flex justify-between gap-3 px-4 py-2.5">
                <span className="truncate">
                  {t.title}
                  {t.eventTitle ? ` · ${t.eventTitle}` : ""}
                </span>
                <span className="shrink-0 text-stone-500">
                  {formatEventDate(t.showFrom!, common.tz)}
                </span>
              </li>
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
