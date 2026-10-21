import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { LoadError } from "@/components/load-error";
import type { Team } from "@/lib/organiser";
import {
  dateInTz,
  formatEventDate,
  formatTimeRange,
  nowIso,
  todayInTz,
} from "@/lib/time";

type Row = {
  id: string;
  team_id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  venue: string | null;
  address: string | null;
  event_type: { name: string } | null;
  attendance: { count: number }[];
};

const short = (name: string) =>
  name.replace(/, (Australia|New Zealand|Canada)$/, "");

// Events page with "All communities": every community's events in one list.
// Dates and times are shown in each event's own community time zone.
export async function RegionEvents({
  supabase,
  teams,
}: {
  supabase: SupabaseClient;
  teams: Team[];
}) {
  const ids = teams.map((t) => t.id);
  const byId = Object.fromEntries(teams.map((t) => [t.id, t]));
  const now = nowIso();
  const dayAgo = new Date(Date.parse(now) - 864e5).toISOString();
  const select =
    "id, team_id, title, starts_at, ends_at, venue, address, event_type:event_types(name), attendance(count)";

  const [soon, past] = await Promise.all([
    supabase
      .from("events")
      .select(select)
      .in("team_id", ids)
      .gte("starts_at", dayAgo)
      .order("starts_at")
      .limit(60)
      .returns<Row[]>(),
    supabase
      .from("events")
      .select(select)
      .in("team_id", ids)
      .lt("starts_at", now)
      .order("starts_at", { ascending: false })
      .limit(40)
      .returns<Row[]>(),
  ]);
  if (soon.error || past.error) return <LoadError what="events" />;

  const tzOf = (e: Row) => byId[e.team_id]?.timezone;
  const isToday = (e: Row) =>
    dateInTz(e.starts_at, tzOf(e)) === todayInTz(tzOf(e));
  const today = (soon.data ?? []).filter(isToday);
  const upcoming = (soon.data ?? []).filter(
    (e) => !isToday(e) && e.starts_at > now,
  );
  const earlier = (past.data ?? []).filter((e) => !isToday(e)).slice(0, 25);
  const active = new Set((soon.data ?? []).map((e) => e.team_id));
  const quiet = teams.filter((t) => !active.has(t.id));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
        <p className="mt-1 text-sm text-stone-500">
          All {teams.length} communities. Pick one above to add events or see
          just theirs.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
          Today
        </h2>
        {today.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-500">
            No events today in any community.
          </p>
        ) : (
          <div className="space-y-3">
            {today.map((e) => (
              <Link
                key={e.id}
                href={`/events/${e.id}`}
                className="block rounded-2xl bg-navy p-5 text-white shadow-sm hover:bg-navy-2"
              >
                <p className="text-xs font-bold uppercase tracking-wider text-pink">
                  {short(byId[e.team_id]?.name ?? "")}
                </p>
                <p className="mt-1 text-sm text-cyan">
                  {formatTimeRange(e.starts_at, e.ends_at, tzOf(e))}
                  {e.venue || e.address ? ` · ${e.venue ?? e.address}` : ""}
                </p>
                <p className="mt-1 text-lg font-semibold leading-snug">
                  {e.title}
                </p>
                <p className="mt-3 text-sm text-white/80">
                  {e.attendance[0]?.count ?? 0} here
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <List
        title="Upcoming"
        events={upcoming}
        byId={byId}
        empty="Nothing scheduled yet."
      />

      {quiet.length > 0 && (
        <p className="rounded-2xl bg-yellow/25 px-4 py-3 text-sm text-navy">
          <span className="font-semibold">Nothing coming up:</span>{" "}
          {quiet.map((t) => short(t.name)).join(", ")}
        </p>
      )}

      <List
        title="Past"
        events={earlier}
        byId={byId}
        empty="No past events yet."
      />
    </div>
  );
}

function List({
  title,
  events,
  byId,
  empty,
}: {
  title: string;
  events: Row[];
  byId: Record<string, Team>;
  empty: string;
}) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
        {title}
      </h2>
      {events.length === 0 ? (
        <p className="text-sm text-stone-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-black/5 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          {events.map((e) => {
            const team = byId[e.team_id];
            return (
              <li key={e.id}>
                <Link
                  href={`/events/${e.id}`}
                  className="flex items-center gap-4 px-4 py-3.5 hover:bg-stone-50"
                >
                  <div className="w-16 shrink-0 text-sm font-medium text-stone-500">
                    {formatEventDate(e.starts_at, team?.timezone)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{e.title}</p>
                    <p className="truncate text-sm text-stone-500">
                      <span className="font-semibold text-pink-ink">
                        {short(team?.name ?? "")}
                      </span>
                      {" · "}
                      {e.event_type?.name ?? "No type"}
                    </p>
                  </div>
                  <div className="shrink-0 text-sm tabular-nums text-stone-500">
                    {e.attendance[0]?.count ?? 0}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
