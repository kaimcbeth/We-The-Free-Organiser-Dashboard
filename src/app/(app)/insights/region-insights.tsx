import type { SupabaseClient } from "@supabase/supabase-js";
import type { Team } from "@/lib/organiser";
import { LoadError } from "@/components/load-error";

type Row = {
  team_id: string;
  name: string;
  upcoming_30: number;
  events_30: number;
  events_with_attendance_30: number;
  checkins_30: number;
  checkins_prev_30: number;
  first_timers_30: number;
  last_attendance: string | null;
  people: number;
  accounts: number;
  organisers: number;
  pending_roles: number;
  core_team: number;
  tasks_done_30: number;
  last_import: string | null;
};

const short = (name: string) =>
  name.replace(/, (Australia|New Zealand|Canada)$/, "");

// Whether a community has started using the Movement Hub.
function hubStatus(r: Row) {
  if (r.checkins_30 > 0)
    return {
      rank: 0,
      label: "Using the Hub",
      tone: "bg-[#22c55e]/15 text-[#15803d]",
      dot: "bg-[#22c55e]",
    };
  if (
    r.last_attendance ||
    r.accounts > 0 ||
    r.organisers > 0 ||
    r.pending_roles > 0
  )
    return {
      rank: 1,
      label: r.last_attendance ? "Gone quiet" : "Getting started",
      tone: "bg-yellow/40 text-navy",
      dot: "bg-yellow",
    };
  return {
    rank: 2,
    label: "Not started yet",
    tone: "bg-stone-100 text-stone-500",
    dot: "bg-stone-300",
  };
}

function daysAgo(iso: string | null, now: number) {
  if (!iso) return null;
  const d = Math.floor((now - Date.parse(iso)) / 864e5);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
}

// Insights with "All communities": every community side by side, and who has
// started using the Movement Hub.
export async function RegionInsights({
  supabase,
  teams,
}: {
  supabase: SupabaseClient;
  teams: Team[];
}) {
  const { data, error } = await supabase.rpc("region_insights", {
    p_team_ids: teams.map((t) => t.id),
  });
  if (error) return <LoadError what="insights" />;
  // eslint-disable-next-line react-hooks/purity -- server component, rendered per request
  const now = Date.now();
  const rows = ((data ?? []) as Row[])
    .map((r) => ({ ...r, status: hubStatus(r) }))
    .sort(
      (a, b) =>
        a.status.rank - b.status.rank ||
        b.checkins_30 - a.checkins_30 ||
        a.name.localeCompare(b.name),
    );
  const using = rows.filter((r) => r.status.rank === 0).length;
  const started = rows.filter((r) => r.status.rank === 1).length;
  const total = rows.reduce(
    (t, r) => ({
      checkins: t.checkins + r.checkins_30,
      first: t.first + r.first_timers_30,
      events: t.events + r.events_30,
    }),
    { checkins: 0, first: 0, events: 0 },
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
        <p className="mt-1 text-sm text-stone-500">
          All {rows.length} communities, last 30 days.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat value={`${using}/${rows.length}`} label="using the Hub" accent />
        <Stat value={String(started)} label="getting started" />
        <Stat value={String(total.checkins)} label="check-ins" />
        <Stat value={String(total.first)} label="first-timers" />
      </div>

      <ul className="space-y-3">
        {rows.map((r) => {
          const trend = r.checkins_30 - r.checkins_prev_30;
          return (
            <li
              key={r.team_id}
              className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{short(r.name)}</p>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${r.status.tone}`}
                >
                  <span className={`h-2 w-2 rounded-full ${r.status.dot}`} />
                  {r.status.label}
                </span>
              </div>

              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Mini
                  value={r.checkins_30}
                  label="check-ins"
                  note={
                    r.checkins_prev_30 || r.checkins_30
                      ? trend === 0
                        ? "same as before"
                        : `${trend > 0 ? "▲" : "▼"} ${Math.abs(trend)}`
                      : undefined
                  }
                  good={trend > 0}
                  bad={trend < 0}
                />
                <Mini value={r.first_timers_30} label="first-timers" />
                <Mini
                  value={r.events_30}
                  label="events"
                  note={
                    r.events_30
                      ? `${r.events_with_attendance_30} with attendance`
                      : undefined
                  }
                />
              </dl>

              <p className="mt-3 text-xs text-stone-500">
                {[
                  `${r.organisers} organiser${r.organisers === 1 ? "" : "s"}${r.pending_roles ? ` (+${r.pending_roles} invited)` : ""}`,
                  `${r.core_team} Core Team`,
                  `${r.accounts} of ${r.people} people with accounts`,
                  r.tasks_done_30 ? `${r.tasks_done_30} tasks done` : null,
                  r.last_attendance
                    ? `last attendance ${daysAgo(r.last_attendance, now)}`
                    : "no attendance taken yet",
                  `${r.upcoming_30} upcoming`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-stone-400">
        “Using the Hub” means attendance was taken in the last 30 days. “Getting
        started” means organisers or members have accounts, or roles have been
        given, but no attendance yet.
      </p>
    </div>
  );
}

function Stat({
  value,
  label,
  accent = false,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-navy p-4 text-white">
      <p
        className={`text-3xl font-semibold tabular-nums ${accent ? "text-pink" : ""}`}
      >
        {value}
      </p>
      <p className="text-sm text-white/75">{label}</p>
    </div>
  );
}

function Mini({
  value,
  label,
  note,
  good,
  bad,
}: {
  value: number;
  label: string;
  note?: string;
  good?: boolean;
  bad?: boolean;
}) {
  return (
    <div className="rounded-xl bg-stone-50 px-2 py-2">
      <dd className="text-xl font-semibold tabular-nums">{value}</dd>
      <dt className="text-xs text-stone-500">{label}</dt>
      {note && (
        <p
          className={`text-[11px] font-medium ${good ? "text-[#15803d]" : bad ? "text-[#b91c1c]" : "text-stone-400"}`}
        >
          {note}
        </p>
      )}
    </div>
  );
}
