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
};

type Sum = {
  communities: number;
  using: number;
  started: number;
  checkins: number;
  prev: number;
  first: number;
  events: number;
  withAttendance: number;
  upcoming: number;
  people: number;
  accounts: number;
  organisers: number;
  pending: number;
  core: number;
  tasks: number;
};

const short = (name: string) => name.replace(/, [^,]+$/, "");
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

function sum(rows: Row[]): Sum {
  const s: Sum = {
    communities: rows.length,
    using: 0,
    started: 0,
    checkins: 0,
    prev: 0,
    first: 0,
    events: 0,
    withAttendance: 0,
    upcoming: 0,
    people: 0,
    accounts: 0,
    organisers: 0,
    pending: 0,
    core: 0,
    tasks: 0,
  };
  for (const r of rows) {
    if (r.checkins_30 > 0) s.using++;
    else if (r.last_attendance || r.accounts || r.organisers || r.pending_roles)
      s.started++;
    s.checkins += r.checkins_30;
    s.prev += r.checkins_prev_30;
    s.first += r.first_timers_30;
    s.events += r.events_30;
    s.withAttendance += r.events_with_attendance_30;
    s.upcoming += r.upcoming_30;
    s.people += r.people;
    s.accounts += r.accounts;
    s.organisers += r.organisers;
    s.pending += r.pending_roles;
    s.core += r.core_team;
    s.tasks += r.tasks_done_30;
  }
  return s;
}

function Trend({ now, prev }: { now: number; prev: number }) {
  if (!now && !prev) return null;
  const d = now - prev;
  if (d === 0) return <span className="text-stone-400">same</span>;
  return (
    <span className={d > 0 ? "text-[#15803d]" : "text-[#b91c1c]"}>
      {d > 0 ? "▲" : "▼"} {Math.abs(d)}
    </span>
  );
}

// God Mode, Insights with "All communities": the whole movement at a glance,
// then by region, then what needs attention.
export async function GlobalInsights({
  supabase,
  teams,
}: {
  supabase: SupabaseClient;
  teams: Team[];
}) {
  const [{ data, error }, { data: regions }, { data: roles }] =
    await Promise.all([
      supabase.rpc("region_insights", { p_team_ids: teams.map((t) => t.id) }),
      supabase.from("regions").select("id, name").order("sort_order"),
      supabase.rpc("list_roles"),
    ]);
  if (error) return <LoadError what="insights" />;
  // eslint-disable-next-line react-hooks/purity -- server component, rendered per request
  const now = Date.now();

  const rows = (data ?? []) as Row[];
  const regionOf = Object.fromEntries(teams.map((t) => [t.id, t.region_id]));
  const leads = new Map<string, string[]>();
  for (const r of (roles ?? []) as {
    role: string;
    region: string | null;
    name: string;
  }[])
    if (r.role === "regional_lead" && r.region)
      leads.set(r.region, [...(leads.get(r.region) ?? []), r.name]);

  const all = sum(rows);
  const byRegion = (regions ?? [])
    .map((g) => {
      const list = rows.filter((r) => regionOf[r.team_id] === g.id);
      return { ...g, rows: list, s: sum(list), leads: leads.get(g.name) ?? [] };
    })
    .filter((g) => g.rows.length > 0);

  const top = [...rows]
    .filter((r) => r.checkins_30 > 0)
    .sort((a, b) => b.checkins_30 - a.checkins_30)
    .slice(0, 6);
  const noAttendance = rows
    .filter((r) => r.events_30 > 0 && r.events_with_attendance_30 === 0)
    .sort((a, b) => b.events_30 - a.events_30);
  const quiet = rows.filter(
    (r) =>
      r.last_attendance &&
      now - Date.parse(r.last_attendance) > 30 * 864e5 &&
      r.checkins_30 === 0,
  );
  const noOrganiser = rows.filter(
    (r) => r.organisers === 0 && r.pending_roles === 0 && r.events_30 > 0,
  );

  const tiles: { value: string; label: string; note?: React.ReactNode }[] = [
    {
      value: `${all.using}/${all.communities}`,
      label: "using the Hub",
      note: `${all.started} getting started`,
    },
    {
      value: String(all.checkins),
      label: "check-ins",
      note: <Trend now={all.checkins} prev={all.prev} />,
    },
    { value: String(all.first), label: "first-timers" },
    {
      value: String(all.events),
      label: "events held",
      note: `${pct(all.withAttendance, all.events)}% with attendance`,
    },
    { value: String(all.upcoming), label: "events coming up" },
    {
      value: String(all.organisers),
      label: "organisers in the Hub",
      note: all.pending ? `+${all.pending} invited` : undefined,
    },
    { value: String(all.core), label: "Core Team" },
    {
      value: String(all.accounts),
      label: "member accounts",
      note: `of ${all.people} people`,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
        <p className="mt-1 text-sm text-stone-500">
          {all.communities} communities in {byRegion.length} regions · last 30
          days, compared with the 30 days before.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl bg-navy p-4 text-white">
            <p className="text-3xl font-semibold tabular-nums">{t.value}</p>
            <p className="text-sm text-white/75">{t.label}</p>
            {t.note && <p className="mt-0.5 text-xs text-white/60">{t.note}</p>}
          </div>
        ))}
      </div>

      <section>
        <h2 className="mb-2 font-semibold">By region</h2>
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-3 py-2">Region</th>
                <th className="px-3 py-2 text-right">Using Hub</th>
                <th className="px-3 py-2 text-right">Check-ins</th>
                <th className="px-3 py-2 text-right">First-timers</th>
                <th className="px-3 py-2 text-right">Events</th>
                <th className="px-3 py-2 text-right">Attendance taken</th>
                <th className="px-3 py-2 text-right">Organisers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {byRegion.map((g) => (
                <tr key={g.id}>
                  <td className="px-3 py-2">
                    <p className="font-medium">{g.name}</p>
                    <p className="text-xs text-stone-500">
                      {g.leads.length ? g.leads.join(" & ") : "No RSL yet"} ·{" "}
                      {g.s.communities} communities
                    </p>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {g.s.using}/{g.s.communities}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {g.s.checkins}{" "}
                    <span className="text-xs">
                      <Trend now={g.s.checkins} prev={g.s.prev} />
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {g.s.first}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {g.s.events}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {g.s.events
                      ? `${pct(g.s.withAttendance, g.s.events)}%`
                      : "–"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {g.s.organisers}
                    {g.s.pending ? (
                      <span className="text-xs text-stone-500">
                        {" "}
                        +{g.s.pending}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <List
          title="Most check-ins"
          empty="No check-ins yet."
          items={top.map((r) => ({
            id: r.team_id,
            name: short(r.name),
            detail: `${r.checkins_30} check-ins · ${r.first_timers_30} first-timers`,
          }))}
        />
        <List
          title="Running events, no attendance taken"
          hint="The best places to introduce the Hub"
          empty="Everyone running events is taking attendance."
          items={noAttendance.slice(0, 8).map((r) => ({
            id: r.team_id,
            name: short(r.name),
            detail: `${r.events_30} event${r.events_30 === 1 ? "" : "s"} in 30 days`,
          }))}
          more={noAttendance.length - 8}
        />
        <List
          title="Gone quiet"
          hint="Used the Hub before, nothing in the last 30 days"
          empty="Nobody has gone quiet."
          items={quiet.map((r) => ({
            id: r.team_id,
            name: short(r.name),
            detail: `last attendance ${Math.floor((now - Date.parse(r.last_attendance!)) / 864e5)} days ago`,
          }))}
        />
        <List
          title="Running events, no organiser in the Hub"
          hint="Give their organiser the role so they can get started"
          empty="Every active community has an organiser."
          items={noOrganiser.slice(0, 8).map((r) => ({
            id: r.team_id,
            name: short(r.name),
            detail: `${r.events_30} event${r.events_30 === 1 ? "" : "s"} in 30 days`,
          }))}
          more={noOrganiser.length - 8}
        />
      </div>

      <section className="space-y-2">
        <h2 className="font-semibold">Every community</h2>
        {byRegion.map((g) => (
          <details
            key={g.id}
            className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5"
          >
            <summary className="cursor-pointer px-4 py-3 font-medium">
              {g.name}{" "}
              <span className="text-sm font-normal text-stone-500">
                ({g.s.communities})
              </span>
            </summary>
            <div className="overflow-x-auto border-t border-black/5">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-stone-500">
                  <tr>
                    <th className="px-4 py-2">Community</th>
                    <th className="px-3 py-2 text-right">Check-ins</th>
                    <th className="px-3 py-2 text-right">First-timers</th>
                    <th className="px-3 py-2 text-right">Events</th>
                    <th className="px-3 py-2 text-right">Upcoming</th>
                    <th className="px-3 py-2 text-right">Organisers</th>
                    <th className="px-4 py-2 text-right">Accounts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {[...g.rows]
                    .sort(
                      (a, b) =>
                        b.checkins_30 - a.checkins_30 ||
                        b.events_30 - a.events_30 ||
                        a.name.localeCompare(b.name),
                    )
                    .map((r) => (
                      <tr key={r.team_id}>
                        <td className="px-4 py-1.5">{short(r.name)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">
                          {r.checkins_30}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums">
                          {r.first_timers_30}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums">
                          {r.events_30}
                          {r.events_30 > 0 && (
                            <span className="text-xs text-stone-400">
                              {" "}
                              ({r.events_with_attendance_30} ✓)
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums">
                          {r.upcoming_30}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums">
                          {r.organisers}
                          {r.pending_roles ? `+${r.pending_roles}` : ""}
                        </td>
                        <td className="px-4 py-1.5 text-right tabular-nums">
                          {r.accounts}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </details>
        ))}
      </section>
    </div>
  );
}

function List({
  title,
  hint,
  empty,
  items,
  more = 0,
}: {
  title: string;
  hint?: string;
  empty: string;
  items: { id: string; name: string; detail: string }[];
  more?: number;
}) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <h2 className="font-semibold">{title}</h2>
      {hint && <p className="text-xs text-stone-500">{hint}</p>}
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-stone-500">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm">
          {items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3">
              <span className="truncate font-medium">{i.name}</span>
              <span className="shrink-0 text-stone-500">{i.detail}</span>
            </li>
          ))}
          {more > 0 && (
            <li className="text-xs text-stone-400">and {more} more</li>
          )}
        </ul>
      )}
    </section>
  );
}
