import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrganiser } from "@/lib/organiser";
import { formatEventDate, formatTimeRange } from "@/lib/time";
import { CheckIn, type Person } from "./check-in";
import { signPhotos } from "@/lib/photos";
import { LoadError } from "@/components/load-error";

type EventDetail = {
  id: string;
  team_id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  venue: string | null;
  source_url: string | null;
  event_type: { name: string } | null;
};

export default async function EventCheckInPage({ params }: PageProps<"/events/[id]">) {
  const { id } = await params;
  const { supabase, organiser } = await requireOrganiser();

  const { data: event } = await supabase
    .from("events")
    .select("id, team_id, title, starts_at, ends_at, venue, source_url, event_type:event_types(name)")
    .eq("id", id)
    .maybeSingle<EventDetail>();

  if (!event) notFound();

  const [people, attendance, earlier] = await Promise.all([
    supabase
      .from("people")
      .select("id, first_name, last_name, suburb, photo_updated_at")
      .eq("team_id", event.team_id)
      .order("first_name")
      .returns<(Person & { photo_updated_at: string | null })[]>(),
    supabase.from("attendance").select("person_id").eq("event_id", event.id),
    // Everyone who came to any earlier event: used to spot first-timers.
    supabase
      .from("attendance")
      .select("person_id, events!inner(starts_at, team_id)")
      .eq("events.team_id", event.team_id)
      .lt("events.starts_at", event.starts_at),
  ]);

  if (people.error || attendance.error || earlier.error) return <LoadError what="this event's check-in list" />;
  const photos = await signPhotos(supabase, people.data ?? []);

  return (
    <div>
      <Link href="/" className="text-sm text-stone-500 hover:text-stone-800">
        ← Events
      </Link>
      <div className="mt-2">
        <p className="text-sm text-stone-500">
          {formatEventDate(event.starts_at)} · {formatTimeRange(event.starts_at, event.ends_at)}
          {event.venue ? ` · ${event.venue}` : ""}
        </p>
        <h1 className="mt-0.5 text-2xl font-semibold leading-tight tracking-tight">{event.title}</h1>
        {event.event_type && (
          <span className="mt-2 inline-block rounded-full bg-cyan/25 px-2.5 py-0.5 text-xs font-medium text-navy">
            {event.event_type.name}
          </span>
        )}
      </div>

      <CheckIn
        eventId={event.id}
        teamId={event.team_id}
        teamSlug={organiser.team?.slug ?? ""}
        organiserId={organiser.id}
        initialPeople={people.data ?? []}
        initialCheckedIn={(attendance.data ?? []).map((a) => a.person_id)}
        returningIds={[...new Set((earlier.data ?? []).map((a) => a.person_id))]}
        photos={photos}
      />
    </div>
  );
}
