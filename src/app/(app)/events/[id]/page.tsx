import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrganiser } from "@/lib/organiser";
import {
  formatEventDate,
  formatTimeRange,
  nowIso,
  setRequestTz,
} from "@/lib/time";
import { CheckIn, type Person } from "./check-in";
import { EventNotes } from "./event-notes";
import { GraphicMaker } from "@/components/graphic-maker";
import { EventPhotos } from "@/components/event-photos";
import { loadEventPhotos } from "@/lib/event-photos";
import { TypePicker } from "./type-picker";
import { signPhotos } from "@/lib/photos";
import { LoadError } from "@/components/load-error";
import { loadInsightData } from "@/lib/insights-data";
import { outreachCounts } from "@/lib/insights";
import { FacebookEventButton } from "@/components/facebook-event";

type EventDetail = {
  id: string;
  team_id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  venue: string | null;
  address: string | null;
  source_url: string | null;
  description: string | null;
  event_type_id: string | null;
  notes: string | null;
};

export default async function EventCheckInPage({
  params,
}: PageProps<"/events/[id]">) {
  const { id } = await params;
  const { supabase, organiser } = await requireOrganiser();

  const { data: event } = await supabase
    .from("events")
    .select(
      "id, team_id, title, starts_at, ends_at, venue, address, source_url, description, event_type_id, notes",
    )
    .eq("id", id)
    .maybeSingle<EventDetail>();

  if (!event) notFound();
  const eventPhotos = await loadEventPhotos(supabase, event.id);
  const { count: openActions } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id)
    .is("done_at", null)
    .is("dismissed_at", null)
    .or(`show_from.is.null,show_from.lte.${nowIso()}`);
  // Opened from "All communities" or the calendar: show it as its own community.
  const team =
    organiser.teams.find((t) => t.id === event.team_id) ?? organiser.team;
  setRequestTz(team.timezone);

  const [people, attendance, earlier, types, helper, likely] =
    await Promise.all([
      supabase
        .from("people")
        .select(
          "id, first_name, last_name, photo_updated_at, attended_before_app",
        )
        .eq("team_id", event.team_id)
        .order("first_name")
        .returns<
          (Person & {
            photo_updated_at: string | null;
            attended_before_app: boolean;
          })[]
        >(),
      supabase.from("attendance").select("person_id").eq("event_id", event.id),
      // Everyone who came to any earlier event: used to spot first-timers.
      supabase
        .from("attendance")
        .select("person_id, events!inner(starts_at, team_id)")
        .eq("events.team_id", event.team_id)
        .lt("events.starts_at", event.starts_at),
      supabase
        .from("event_types")
        .select("id, name, counts_as_outreach")
        .order("sort_order"),
      supabase
        .from("checkin_links")
        .select("token, expires_at")
        .eq("event_id", event.id)
        .is("revoked_at", null)
        .gt("expires_at", nowIso())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.rpc("event_likely_attendees", { p_event_id: id }),
    ]);

  if (people.error || attendance.error || earlier.error)
    return <LoadError what="this event's check-in list" />;
  const [photos, insightData] = await Promise.all([
    signPhotos(supabase, people.data ?? []),
    loadInsightData(supabase, event.team_id),
  ]);
  const isOutreach = !!types.data?.find((t) => t.id === event.event_type_id)
    ?.counts_as_outreach;
  const outreachBefore = insightData
    ? Object.fromEntries(
        outreachCounts(insightData.people, insightData.checkIns, event.id),
      )
    : {};

  return (
    <div>
      <Link href="/" className="text-sm text-stone-500 hover:text-stone-800">
        ← Events
      </Link>
      <div className="mt-2">
        <p className="text-sm text-stone-500">
          {formatEventDate(event.starts_at)} ·{" "}
          {formatTimeRange(event.starts_at, event.ends_at)}
          {event.venue || event.address
            ? ` · ${event.venue ?? event.address}`
            : ""}
        </p>
        <h1 className="mt-0.5 text-2xl font-semibold leading-tight tracking-tight">
          {event.title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <TypePicker
            eventId={event.id}
            value={event.event_type_id}
            types={types.data ?? []}
          />
          {event.source_url && (
            <a
              href={event.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-pink-ink hover:underline"
            >
              View on activism.wtf ↗
            </a>
          )}
          {event.starts_at > nowIso() && (
            <FacebookEventButton
              tz={team.timezone}
              className="text-xs font-medium text-[#1877F2] hover:underline"
              event={{
                title: event.title,
                startsAt: event.starts_at,
                endsAt: event.ends_at,
                venue: event.venue,
                address: event.address,
                description: event.description,
                url: event.source_url,
              }}
            />
          )}
          <GraphicMaker
            tz={team.timezone}
            event={{
              title: event.title,
              startsAt: event.starts_at,
              endsAt: event.ends_at,
              venue: event.venue,
              address: event.address,
              typeName:
                (types.data ?? []).find((t) => t.id === event.event_type_id)
                  ?.name ?? null,
              community: team.name.replace(/, (Australia|New Zealand)$/, ""),
              teamId: event.team_id,
              eventId: event.id,
            }}
          />
          {!!openActions && (
            <Link
              href={`/tasks?event=${event.id}`}
              className="rounded-full bg-pink/15 px-2.5 py-1 text-xs font-semibold text-pink-ink hover:bg-pink/25"
            >
              {openActions} action{openActions === 1 ? "" : "s"} to do
            </Link>
          )}
        </div>
      </div>

      <EventNotes eventId={event.id} initial={event.notes ?? ""} />

      <EventPhotos
        key={eventPhotos.map((p) => p.id).join()}
        teamId={event.team_id}
        eventId={event.id}
        photos={eventPhotos}
      />

      <CheckIn
        eventId={event.id}
        teamId={event.team_id}
        teamSlug={team.slug ?? ""}
        whatsappUrl={team.whatsapp_url ?? null}
        tz={team.timezone}
        organiserId={organiser.id}
        initialPeople={people.data ?? []}
        initialCheckedIn={(attendance.data ?? []).map((a) => a.person_id)}
        returningIds={[
          ...new Set([
            ...(earlier.data ?? []).map((a) => a.person_id),
            ...(people.data ?? [])
              .filter((p) => p.attended_before_app)
              .map((p) => p.id),
          ]),
        ]}
        photos={photos}
        helperLink={helper.data ?? null}
        isOutreach={isOutreach}
        outreachBefore={outreachBefore}
        likely={(likely.data as Record<string, number> | null) ?? {}}
      />
    </div>
  );
}
