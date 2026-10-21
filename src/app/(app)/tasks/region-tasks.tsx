import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Team } from "@/lib/organiser";
import { LoadError } from "@/components/load-error";
import { TaskCard } from "@/components/task-card";
import { loadTeamTasks } from "@/lib/tasks";
import { loadConnectContext } from "@/lib/connect";
import { ConnectIdeas } from "@/components/connect-ideas";

const short = (name: string) =>
  name.replace(/, (Australia|New Zealand|Canada)$/, "");

// Tasks with "All communities": the Regional Support Lead's own check-ins for
// every community, then how each community is going with its own tasks.
export async function RegionTasks({
  supabase,
  teams,
}: {
  supabase: SupabaseClient;
  teams: Team[];
}) {
  const ids = teams.map((t) => t.id);
  const [tasks, connect] = await Promise.all([
    loadTeamTasks(supabase, ids, { regional: true }),
    loadConnectContext(supabase, teams),
  ]);
  if (!tasks) return <LoadError what="tasks" />;
  // eslint-disable-next-line react-hooks/purity -- server component, rendered per request
  const now = Date.now();
  const byId = Object.fromEntries(teams.map((t) => [t.id, t]));

  const checkIns = tasks.open.filter((t) => t.regional);
  const doneCheckIns = tasks.done.filter((t) => t.regional);
  const community = tasks.open.filter((t) => !t.regional);
  const summary = teams
    .map((t) => {
      const open = community.filter((x) => x.teamId === t.id);
      return {
        team: t,
        open: open.length,
        today: open.filter((x) => Date.parse(x.dueAt) - now <= 864e5).length,
      };
    })
    .sort((a, b) => b.today - a.today || b.open - a.open);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <p className="mt-1 text-sm text-stone-500">
          {checkIns.length === 0
            ? "All your check-ins are done this month."
            : `${checkIns.length} check-in${checkIns.length === 1 ? "" : "s"} to do this month`}
        </p>
      </div>

      {checkIns.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold">Check in with organisers</h2>
          <ul className="space-y-3">
            {checkIns.map((t) => {
              const team = byId[t.teamId];
              return (
                <TaskCard
                  key={t.id}
                  task={{
                    ...t,
                    title: `${t.title}: ${short(team?.name ?? "")}`,
                  }}
                  tz={team?.timezone ?? "Australia/Sydney"}
                  now={now}
                  whatsappUrl={null}
                  extra={
                    connect[t.teamId] && (
                      <ConnectIdeas ctx={connect[t.teamId]} />
                    )
                  }
                />
              );
            })}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-1 font-semibold">Communities&apos; own tasks</h2>
        <p className="mb-3 text-sm text-stone-500">
          Pick a community above to see or help with its tasks.
        </p>
        <ul className="divide-y divide-black/5 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          {summary.map((s) => (
            <li
              key={s.team.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <span className="font-medium">{short(s.team.name)}</span>
              <span className="flex items-center gap-2 text-sm text-stone-500">
                {s.today > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ef4444]/10 px-2 py-0.5 text-xs font-semibold text-[#b91c1c]">
                    <span className="h-2 w-2 rounded-full bg-[#ef4444]" />
                    {s.today} do today
                  </span>
                )}
                {s.open === 0 ? "All done" : `${s.open} open`}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {doneCheckIns.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
            Done recently
          </h2>
          <ul className="space-y-3">
            {doneCheckIns.map((t) => (
              <TaskCard
                key={t.id}
                task={{
                  ...t,
                  title: `${t.title}: ${short(byId[t.teamId]?.name ?? "")}`,
                }}
                tz={byId[t.teamId]?.timezone ?? "Australia/Sydney"}
                now={now}
                whatsappUrl={null}
              />
            ))}
          </ul>
        </section>
      )}
      <p className="text-xs text-stone-400">
        <Link href="/calendar" className="hover:underline">
          See every community&apos;s events on the calendar →
        </Link>
      </p>
    </div>
  );
}
