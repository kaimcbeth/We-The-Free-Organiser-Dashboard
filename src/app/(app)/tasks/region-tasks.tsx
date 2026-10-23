import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Team } from "@/lib/organiser";
import { LoadError } from "@/components/load-error";
import { TaskCard } from "@/components/task-card";
import { loadTeamTasks } from "@/lib/tasks";
import { loadConnectContext } from "@/lib/connect";
import { ConnectIdeas } from "@/components/connect-ideas";
import { WaitingList } from "./waiting-list";
import { formatEventDate } from "@/lib/time";

const short = (name: string) =>
  name.replace(/, (Australia|New Zealand|Canada)$/, "");

// Regional Support Lead tasks (e.g. monthly check-ins) for the chosen
// communities. God Mode with "All communities" also sees how each community
// is going with its own tasks.
export async function RegionTasks({
  supabase,
  teams,
  showCommunities,
}: {
  supabase: SupabaseClient;
  teams: Team[];
  showCommunities: boolean; // God Mode: also how each community's own tasks are going
}) {
  const ids = teams.map((t) => t.id);
  const [tasks, connect, { data: waitRows }] = await Promise.all([
    loadTeamTasks(supabase, ids, { regional: true }),
    loadConnectContext(supabase, teams),
    supabase
      .from("teams")
      .select("id, connect_waiting_since")
      .in("id", ids)
      .not("connect_waiting_since", "is", null),
  ]);
  if (!tasks) return <LoadError what="tasks" />;
  // eslint-disable-next-line react-hooks/purity -- server component, rendered per request
  const now = Date.now();
  const byId = Object.fromEntries(teams.map((t) => [t.id, t]));
  const waiting = (
    (waitRows ?? []) as { id: string; connect_waiting_since: string }[]
  )
    .map((w) => ({
      id: w.id,
      name: short(byId[w.id]?.name ?? ""),
      since: w.connect_waiting_since,
      weeks: Math.floor((now - Date.parse(w.connect_waiting_since)) / 6048e5),
    }))
    .sort((a, b) => a.since.localeCompare(b.since));

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
        <h1 className="text-2xl font-semibold tracking-tight">Actions</h1>
        <p className="mt-1 text-sm text-stone-500">
          {checkIns.length === 0
            ? "All your Regional Support Lead actions are done."
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
                  removable
                  moveEvents={connect[t.teamId]?.upcoming}
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

      <WaitingList teams={waiting} />

      {tasks.later.filter((t) => t.regional).length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
            Moved for later
          </h2>
          <ul className="divide-y divide-black/5 overflow-hidden rounded-2xl bg-white text-sm shadow-sm ring-1 ring-black/5">
            {tasks.later
              .filter((t) => t.regional)
              .map((t) => (
                <li
                  key={t.id}
                  className="flex justify-between gap-3 px-4 py-2.5"
                >
                  <span className="truncate">
                    {t.title}
                    {`: ${short(byId[t.teamId]?.name ?? "")}`}
                  </span>
                  <span className="shrink-0 text-stone-500">
                    {formatEventDate(t.showFrom!, byId[t.teamId]?.timezone)}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      )}

      {showCommunities && (
        <section>
          <h2 className="mb-1 font-semibold">Communities&apos; own actions</h2>
          <p className="mb-3 text-sm text-stone-500">
            Pick a community above to see or help with its actions.
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
      )}

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
