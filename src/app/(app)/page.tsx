import Link from "next/link";
import { CalendarFeed } from "@/components/add-to-calendar";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoadError } from "@/components/load-error";
import { ImportStatus } from "./import-status";
import { TeamLinkButton } from "./team-link";
import { describeImport } from "@/lib/import-status";
import { requireOrganiser } from "@/lib/organiser";
import { RegionEvents } from "./region-events";
import { SetupChecklist, type SetupStatus } from "./setup-checklist";
import { SuggestedEvents } from "./suggested-events";
import type { Suggestion } from "@/lib/special-events";
import {
  dayBoundsUtc,
  daysUntilLabel,
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
  source_url: string | null;
  attendance: { count: number }[];
};

// An Organiser Hangout (activism.wtf/hangouts): listed so organisers know
// it's on, but no attendance or actions.
type HangoutRow = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  audience: string | null;
  url: string;
};

// Quick link to an event's open actions.
function ActionsLink({
  eventId,
  count,
  className,
}: {
  eventId: string;
  count: number;
  className: string;
}) {
  if (!count) return null;
  return (
    <Link
      href={`/tasks?event=${eventId}`}
      title="See this event's actions"
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold hover:underline ${className}`}
    >
      <svg
        viewBox="0 0 16 16"
        className="h-3 w-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <path
          d="M2 4l1.5 1.5L6 3M2 10l1.5 1.5L6 9M9 4.5h5M9 10.5h5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {count}
      <span className="hidden sm:inline"> action{count === 1 ? "" : "s"}</span>
    </Link>
  );
}

// A small, quiet link to the event's page on the We The Free website.
function WebsiteLink({ url, className }: { url: string; className: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title="Open on the We The Free website"
      aria-label="Open on the We The Free website"
      data-tour="website-link"
      className={`rounded-md px-1.5 py-0.5 text-xs hover:underline ${className}`}
    >
      <span className="hidden sm:inline">activism.wtf </span>↗
    </a>
  );
}

export default async function EventsPage({ searchParams }: PageProps<"/">) {
  const { setup: justToured } = await searchParams;
  const { supabase, organiser } = await requireOrganiser();
  // Last time they chose the calendar view.
  if ((await cookies()).get("events_view")?.value === "calendar")
    redirect("/calendar");
  if (organiser.allCommunities)
    return <RegionEvents supabase={supabase} teams={organiser.teams} />;
  const { start: todayStart, end: todayEnd } = dayBoundsUtc(todayInTz());

  const select =
    "id, title, starts_at, ends_at, venue, address, source_url, event_type:event_types(name), attendance(count)";

  const [today, upcoming, past, lastRun, lastOk, teamLink, openActions] =
    await Promise.all([
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
      // Open actions per event, for the "N actions" links.
      supabase
        .from("tasks")
        .select("event_id, show_from")
        .eq("team_id", organiser.team_id)
        .is("done_at", null)
        .is("dismissed_at", null)
        .not("event_id", "is", null),
    ]);
  const actionsFor = new Map<string, number>();
  for (const t of openActions.data ?? [])
    if (!t.show_from || t.show_from <= nowIso())
      actionsFor.set(t.event_id!, (actionsFor.get(t.event_id!) ?? 0) + 1);

  if (today.error || upcoming.error || past.error)
    return <LoadError what="events" />;
  const todays = today.data ?? [];
  const next = upcoming.data?.[0] ?? null;

  const { data: cal } = await supabase
    .from("teams")
    .select("calendar_token")
    .eq("id", organiser.team_id)
    .maybeSingle();
  const calendarToken = (cal?.calendar_token as string | undefined) ?? null;
  const { data: setupData } = organiser.exampleMode
    ? { data: null }
    : await supabase.rpc("team_setup_status", { p_team_id: organiser.team_id });
  const setup = setupData as SetupStatus | null;
  const [{ data: suggestData }, { data: suggestOn }, { data: hangoutData }] =
    await Promise.all([
      supabase.rpc("suggested_events", { p_team_id: organiser.team_id }),
      supabase
        .from("teams")
        .select("suggest_events")
        .eq("id", organiser.team_id)
        .maybeSingle(),
      organiser.exampleMode
        ? Promise.resolve({ data: [] })
        : supabase.rpc("team_hangouts", {
            p_team_id: organiser.team_id,
            p_from: todayStart,
            p_to: new Date(Date.parse(todayStart) + 183 * 864e5).toISOString(),
          }),
    ]);
  // Hangouts within the stretch the Upcoming list covers (it shows 10 events).
  const shownUpcoming = upcoming.data ?? [];
  const lastShown =
    shownUpcoming.length >= 10
      ? shownUpcoming[shownUpcoming.length - 1].starts_at
      : null;
  const hangouts = ((hangoutData ?? []) as HangoutRow[]).filter(
    (h) => !lastShown || h.starts_at <= lastShown,
  );
  const suggestions = (suggestData ?? []) as Suggestion[];
  const canManageSpecial =
    organiser.role === "god" || organiser.role === "regional_lead";

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
          {calendarToken && <CalendarFeed token={calendarToken} />}
        </div>
        <div className="flex gap-2">
          <TeamLinkButton
            initial={teamLink.data ?? null}
            tz={organiser.team.timezone}
          />
          <Link
            href="/events/new"
            className="rounded-xl bg-pink px-4 py-2.5 text-sm font-semibold text-navy hover:bg-pink-strong"
          >
            Add event
          </Link>
        </div>
      </div>

      {setup &&
        !setup.dismissed &&
        (organiser.role === "organiser" ||
          organiser.role === "regional_lead" ||
          organiser.role === "god") && (
          <div>
            <SetupChecklist
              teamId={organiser.team_id}
              community={organiser.team.name.replace(
                /, (Australia|New Zealand)$/,
                "",
              )}
              status={setup}
              autoOpen={justToured === "1"}
            />
          </div>
        )}

      <ImportStatus
        teamId={organiser.team_id}
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
          <div data-tour="today-event" className="space-y-3">
            {todays.map((e) => (
              <div key={e.id} className="relative">
                <span className="absolute right-3 top-3 z-10 flex items-center gap-1">
                  <ActionsLink
                    eventId={e.id}
                    count={actionsFor.get(e.id) ?? 0}
                    className="bg-white/10 text-white hover:bg-white/20"
                  />
                  {e.source_url && (
                    <WebsiteLink
                      url={e.source_url}
                      className="text-white/45 hover:text-white"
                    />
                  )}
                </span>
                <Link
                  href={`/events/${e.id}`}
                  data-follow
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
              </div>
            ))}
          </div>
        )}
      </section>

      {next && <NextUp event={next} actions={actionsFor.get(next.id) ?? 0} />}

      <SuggestedEvents
        teamId={organiser.team_id}
        suggestions={suggestions}
        on={suggestOn?.suggest_events ?? true}
        canManage={canManageSpecial}
      />

      <EventList
        title="Upcoming"
        events={upcoming.data ?? []}
        hangouts={hangouts}
        empty="Nothing scheduled yet."
        nextId={next?.id}
        actions={actionsFor}
      />
      <EventList
        title="Past"
        events={past.data ?? []}
        empty="No past events yet."
        actions={actionsFor}
      />
    </div>
  );
}

// The next event after today, shown big so it's easy to find.
function NextUp({ event: e, actions }: { event: EventRow; actions: number }) {
  return (
    <section data-tour="next-event">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
        Next up
      </h2>
      <div className="relative">
        <span className="absolute bottom-4 right-4 z-10 flex items-center gap-1">
          <ActionsLink
            eventId={e.id}
            count={actions}
            className="bg-pink/15 text-pink-ink hover:bg-pink/25"
          />
          {e.source_url && (
            <WebsiteLink
              url={e.source_url}
              className="text-stone-400 hover:text-navy"
            />
          )}
        </span>
        <Link
          href={`/events/${e.id}`}
          data-follow
          className="block rounded-2xl bg-white p-5 shadow-sm ring-2 ring-pink transition-transform hover:-translate-y-0.5"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-pink-ink">
              {formatEventDate(e.starts_at)} ·{" "}
              {formatTimeRange(e.starts_at, e.ends_at)}
            </p>
            <span className="shrink-0 rounded-full bg-yellow px-2.5 py-0.5 text-xs font-semibold text-navy">
              {daysUntilLabel(e.starts_at)}
            </span>
          </div>
          <p className="mt-1 text-lg font-semibold leading-snug">{e.title}</p>
          <p className="mt-0.5 text-sm text-stone-500">
            {[e.event_type?.name, e.venue ?? e.address]
              .filter(Boolean)
              .join(" · ") || "No details yet"}
          </p>
          {/* Room for the actions / activism.wtf links in the corner. */}
          <div className="h-6" aria-hidden />
        </Link>
      </div>
    </section>
  );
}

function EventList({
  title,
  events,
  empty,
  nextId,
  actions,
  hangouts = [],
}: {
  actions?: Map<string, number>;
  title: string;
  events: EventRow[];
  hangouts?: HangoutRow[];
  empty: string;
  nextId?: string;
}) {
  // Events and hangouts together, in date order.
  const rows = [
    ...events.map((e) => ({ at: e.starts_at, event: e, hangout: null })),
    ...hangouts.map((h) => ({ at: h.starts_at, event: null, hangout: h })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-stone-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-black/5 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          {rows.map(({ event: e, hangout: h }) =>
            h ? (
              <li
                key={`h-${h.id}`}
                className="flex items-center hover:bg-stone-50"
              >
                <a
                  href={h.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-3 pr-3 sm:gap-4 sm:py-3.5 sm:pl-4 sm:pr-4"
                >
                  <div className="w-11 shrink-0 text-xs font-medium leading-tight text-stone-500 sm:w-16 sm:text-sm">
                    {formatEventDate(h.starts_at)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-medium leading-snug sm:truncate">
                      {h.title}
                    </p>
                    <p className="truncate text-xs text-stone-500 sm:text-sm">
                      Organiser hangout ·{" "}
                      {formatTimeRange(h.starts_at, h.ends_at)}
                      {h.audience ? ` · For ${h.audience}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-stone-300" aria-hidden>
                    ↗
                  </span>
                </a>
              </li>
            ) : (
              <li
                key={e.id}
                className={`flex items-center hover:bg-stone-50 ${e.id === nextId ? "bg-pink/5" : ""}`}
              >
                <Link
                  href={`/events/${e.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-3 pr-1 sm:gap-4 sm:py-3.5 sm:pl-4 sm:pr-2"
                >
                  <div className="w-11 shrink-0 text-xs font-medium leading-tight text-stone-500 sm:w-16 sm:text-sm">
                    {formatEventDate(e.starts_at)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-start gap-2 font-medium leading-snug">
                      <span className="line-clamp-2 sm:truncate">
                        {e.title}
                      </span>
                      {e.id === nextId && (
                        <span className="mt-0.5 shrink-0 rounded-full bg-pink px-1.5 py-px text-[10px] font-semibold text-navy sm:px-2 sm:py-0.5 sm:text-xs">
                          Next
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-stone-500 sm:text-sm">
                      {e.event_type?.name ?? "No type"}
                      {e.venue || e.address ? ` · ${e.venue ?? e.address}` : ""}
                    </p>
                  </div>
                  {(e.attendance[0]?.count ?? 0) > 0 && (
                    <div
                      className="shrink-0 text-xs tabular-nums text-stone-500 sm:text-sm"
                      title="Checked in"
                    >
                      {e.attendance[0]?.count}
                    </div>
                  )}
                </Link>
                <ActionsLink
                  eventId={e.id}
                  count={actions?.get(e.id) ?? 0}
                  className="shrink-0 text-pink-ink/70 hover:text-pink-ink"
                />
                {e.source_url ? (
                  <WebsiteLink
                    url={e.source_url}
                    className="mr-1 shrink-0 text-stone-300 hover:text-navy sm:mr-2"
                  />
                ) : (
                  <span className="w-2" />
                )}
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  );
}
