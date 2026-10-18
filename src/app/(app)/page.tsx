import Link from "next/link";
import { LoadError } from "@/components/load-error";
import { ImportStatus } from "./import-status";
import { TeamLinkButton } from "./team-link";
import { describeImport } from "@/lib/import-status";
import { requireOrganiser } from "@/lib/organiser";
import {
  dayBoundsUtc,
  formatEventDate,
  formatTimeRange,
  nowIso,
  todayInTz,
} from "@/lib/time";

type EventRow = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  venue: string | null;
  address: string | null;
  event_type: { name: string } | null;
  attendance: { count: number }[];
};

export default async function EventsPage() {
  const { supabase, organiser } = await requireOrganiser();
  const { start: todayStart, end: todayEnd } = dayBoundsUtc(todayInTz());

  const select =
    "id, title, starts_at, ends_at, venue, address, event_type:event_types(name), attendance(count)";

  const [today, upcoming, past, lastRun, lastOk, teamLink] = await Promise.all([
    supabase
      .from("events")
      .select(select)
      .eq("team_id", organiser.team_id)
      .gte("starts_at", todayStart)
      .lt("starts_at", todayEnd)
      .order("starts_at")
      .returns<EventRow[]>(),
    supabase
      .from("events")
      .select(select)
      .eq("team_id", organiser.team_id)
      .gte("starts_at", todayEnd)
      .order("starts_at")
      .limit(10)
      .returns<EventRow[]>(),
    supabase
      .from("events")
      .select(select)
      .eq("team_id", organiser.team_id)
      .lt("starts_at", todayStart)
      .order("starts_at", { ascending: false })
      .limit(20)
      .returns<EventRow[]>(),
    supabase
      .from("import_runs")
      .select("ran_at, ok, added, updated, message")
      .eq("team_id", organiser.team_id)
      .order("ran_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("import_runs")
      .select("ran_at, ok, added, updated, message")
      .eq("team_id", organiser.team_id)
      .eq("ok", true)
      .order("ran_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("checkin_links")
      .select("token, expires_at")
      .eq("team_id", organiser.team_id)
      .is("revoked_at", null)
      .gt("expires_at", nowIso())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (today.error || upcoming.error || past.error)
    return <LoadError what="events" />;
  const todays = today.data ?? [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
        <div className="flex gap-2">
          <TeamLinkButton initial={teamLink.data ?? null} />
          <Link
            href="/events/new"
            className="rounded-xl bg-pink px-4 py-2.5 text-sm font-semibold text-navy hover:bg-pink-strong"
          >
            Add event
          </Link>
        </div>
      </div>

      <ImportStatus
        {...describeImport(lastRun.data ?? null, lastOk.data ?? null)}
      />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
          Today
        </h2>
        {todays.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-500">
            No events today.
          </p>
        ) : (
          <div className="space-y-3">
            {todays.map((e) => (
              <Link
                key={e.id}
                href={`/events/${e.id}`}
                className="block rounded-2xl bg-navy p-5 text-white shadow-sm hover:bg-navy-2"
              >
                <p className="text-sm text-cyan">
                  {formatTimeRange(e.starts_at, e.ends_at)}
                  {e.venue || e.address ? ` · ${e.venue ?? e.address}` : ""}
                </p>
                <p className="mt-1 text-lg font-semibold leading-snug">
                  {e.title}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-white/80">
                    {e.attendance[0]?.count ?? 0} here
                  </span>
                  <span className="rounded-lg bg-pink px-3 py-1.5 text-sm font-semibold text-navy">
                    Take attendance →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <EventList
        title="Upcoming"
        events={upcoming.data ?? []}
        empty="Nothing scheduled yet."
      />
      <EventList
        title="Past"
        events={past.data ?? []}
        empty="No past events yet."
      />
    </div>
  );
}

function EventList({
  title,
  events,
  empty,
}: {
  title: string;
  events: EventRow[];
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
          {events.map((e) => (
            <li key={e.id}>
              <Link
                href={`/events/${e.id}`}
                className="flex items-center gap-4 px-4 py-3.5 hover:bg-stone-50"
              >
                <div className="w-16 shrink-0 text-sm font-medium text-stone-500">
                  {formatEventDate(e.starts_at)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{e.title}</p>
                  <p className="truncate text-sm text-stone-500">
                    {e.event_type?.name ?? "No type"}
                    {e.venue || e.address ? ` · ${e.venue ?? e.address}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-sm tabular-nums text-stone-500">
                  {e.attendance[0]?.count ?? 0}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
