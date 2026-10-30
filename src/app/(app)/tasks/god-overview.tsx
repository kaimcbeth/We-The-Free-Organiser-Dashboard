import type { SupabaseClient } from "@supabase/supabase-js";
import type { Team } from "@/lib/organiser";
import { LoadError } from "@/components/load-error";
import { formatEventDate } from "@/lib/time";
import type { TaskRow } from "@/components/task-card";
import { RegionActions } from "./region-actions";

type CheckIn = {
  team_id: string;
  period: string | null;
  due_at: string;
  done_at: string | null;
  outcome: string | null;
  show_from: string | null;
  dismissed_at: string | null;
  created_at: string;
};

const short = (name: string) =>
  name.replace(/, (Australia|New Zealand|Canada|USA|India|Japan|Israel)$/, "");

// God Mode, Tasks with "All communities": a quiet overview of how each
// region's Regional Support Lead is going with their check-ins. Nothing to
// action here; it's for keeping an eye on things.
export async function GodOverview({
  supabase,
  teams,
  regionTasks = [],
}: {
  supabase: SupabaseClient;
  teams: Team[];
  regionTasks?: TaskRow[]; // their own region-wide actions (God who's also an RSL)
}) {
  // eslint-disable-next-line react-hooks/purity -- server component, rendered per request
  const now = Date.now();
  const since = new Date(now - 120 * 864e5).toISOString();
  const [
    { data: regions },
    { data: rows, error },
    { data: waits },
    { data: roles },
  ] = await Promise.all([
    supabase.from("regions").select("id, name").order("sort_order"),
    supabase
      .from("tasks")
      .select(
        "team_id, period, due_at, done_at, outcome, show_from, dismissed_at, created_at, kind:task_kinds!inner(audience)",
      )
      .eq("kind.audience", "regional")
      .not("team_id", "is", null) // (region-wide actions aren't check-ins)
      .gte("created_at", since)
      .order("created_at", { ascending: false }),
    supabase
      .from("teams")
      .select("id, connect_waiting_since")
      .not("connect_waiting_since", "is", null),
    supabase.rpc("list_roles"),
  ]);
  if (error) return <LoadError what="tasks" />;
  const month = new Date(now).toISOString().slice(0, 7);

  const latest = new Map<string, CheckIn>();
  for (const r of (rows ?? []) as CheckIn[])
    if (!latest.has(r.team_id)) latest.set(r.team_id, r);
  const lastDone = new Map<string, string>();
  for (const r of (rows ?? []) as CheckIn[])
    if (r.done_at && r.outcome !== "no_reply" && !lastDone.has(r.team_id))
      lastDone.set(r.team_id, r.done_at);
  const waiting = new Map(
    ((waits ?? []) as { id: string; connect_waiting_since: string }[]).map(
      (w) => [w.id, w.connect_waiting_since],
    ),
  );
  const leads = new Map<string, string[]>();
  for (const r of (roles ?? []) as {
    role: string;
    region: string | null;
    name: string;
  }[])
    if (r.role === "regional_lead" && r.region)
      leads.set(r.region, [...(leads.get(r.region) ?? []), r.name]);

  function status(team: Team) {
    const tz = team.timezone;
    const w = waiting.get(team.id);
    if (w)
      return {
        rank: 1,
        dot: "bg-yellow",
        text: `Waiting to hear back since ${formatEventDate(w, tz)}`,
      };
    const t = latest.get(team.id);
    if (!t) return { rank: 3, dot: "bg-stone-200", text: "No check-in yet" };
    if (t.done_at)
      return {
        rank: 0,
        dot: "bg-[#22c55e]",
        text: `Checked in ${formatEventDate(t.done_at, tz)}`,
      };
    if (t.dismissed_at)
      return { rank: 2, dot: "bg-stone-300", text: "Skipped this month" };
    if (t.show_from && Date.parse(t.show_from) > now)
      return {
        rank: 2,
        dot: "bg-stone-300",
        text: `Moved to ${formatEventDate(t.show_from, tz)}`,
      };
    const hours = (Date.parse(t.due_at) - now) / 36e5;
    return {
      rank: 2,
      dot:
        hours <= 24
          ? "bg-[#ef4444]"
          : hours <= 72
            ? "bg-[#f97316]"
            : "bg-yellow",
      text: `To do, due ${formatEventDate(t.due_at, tz)}`,
    };
  }

  const sections = (regions ?? [])
    .map((r) => {
      const list = teams
        .filter((t) => t.region_id === r.id)
        .map((t) => ({ team: t, s: status(t), last: lastDone.get(t.id) }))
        .sort(
          (a, b) =>
            a.s.rank - b.s.rank || a.team.name.localeCompare(b.team.name),
        );
      const doneThisMonth = list.filter((x) => {
        const d = latest.get(x.team.id)?.done_at;
        return d && d.slice(0, 7) === month;
      }).length;
      return {
        id: r.id,
        name: r.name,
        list,
        doneThisMonth,
        waiting: list.filter((x) => waiting.has(x.team.id)).length,
        leads: leads.get(r.name) ?? [],
      };
    })
    .filter((r) => r.list.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Actions</h1>
        <p className="mt-1 text-sm text-stone-500">
          How each region&apos;s Regional Support Lead is going with their
          monthly check-ins.
        </p>
      </div>

      <RegionActions
        tasks={regionTasks}
        tz="Australia/Sydney"
        now={now}
        title="For you as Regional Support Lead"
      />

      {sections.map((r) => {
        const pct = r.list.length ? (r.doneThisMonth / r.list.length) * 100 : 0;
        return (
          <section
            key={r.id}
            className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold">
                {r.name}
                <span className="ml-2 text-sm font-normal text-stone-500">
                  {r.leads.length
                    ? r.leads.join(" & ")
                    : "No Regional Support Lead yet"}
                </span>
              </h2>
              <p className="text-xs text-stone-500">
                {r.doneThisMonth} of {r.list.length} checked in this month
                {r.waiting ? ` · ${r.waiting} waiting to hear back` : ""}
              </p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-[#22c55e]"
                style={{ width: `${pct}%` }}
              />
            </div>
            <ul className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              {r.list.map(({ team, s }) => (
                <li key={team.id} className="flex min-w-0 items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
                  <span className="truncate">
                    <span className="font-medium">{short(team.name)}</span>
                    <span className="text-stone-500"> · {s.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
