import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrganiser } from "@/lib/organiser";
import { formatEventDate } from "@/lib/time";
import { InviteButton } from "./invite-button";
import { DeletePerson } from "./delete-person";
import { AttendedBefore } from "./attended-before";
import { Avatar } from "@/components/avatar";
import { signPhotos } from "@/lib/photos";

type Person = {
  id: string;
  first_name: string;
  last_name: string | null;
  suburb: string | null;
  email: string | null;
  phone: string | null;
  user_id: string | null;
  linked_at: string | null;
  consent_marketing: boolean;
  added_via: string;
  created_at: string;
  starting_outreach_count: number;
  photo_updated_at: string | null;
  attended_before_app: boolean;
};

type Attended = {
  event: {
    id: string;
    title: string;
    starts_at: string;
    event_type: { name: string; counts_as_outreach: boolean } | null;
  } | null;
};

export default async function PersonPage({ params }: PageProps<"/people/[id]">) {
  const { id } = await params;
  const { supabase, organiser } = await requireOrganiser();

  const { data: person } = await supabase
    .from("people")
    .select(
      "id, first_name, last_name, suburb, email, phone, user_id, linked_at, consent_marketing, added_via, created_at, starting_outreach_count, photo_updated_at, attended_before_app",
    )
    .eq("id", id)
    .eq("team_id", organiser.team_id)
    .maybeSingle<Person>();
  if (!person) notFound();

  const { data: rows } = await supabase
    .from("attendance")
    .select("event:events(id, title, starts_at, event_type:event_types(name, counts_as_outreach))")
    .eq("person_id", person.id)
    .returns<Attended[]>();

  const events = (rows ?? [])
    .map((r) => r.event)
    .filter((e): e is NonNullable<Attended["event"]> => !!e)
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  const outreach = events.filter((e) => e.event_type?.counts_as_outreach).length + person.starting_outreach_count;
  const name = [person.first_name, person.last_name].filter(Boolean).join(" ");
  const photos = await signPhotos(supabase, [person]);

  return (
    <div>
      <Link href="/people" className="text-sm text-stone-500 hover:text-stone-800">
        ← People
      </Link>
      <div className="mt-3">
        <Avatar name={name} url={photos[person.id] ?? null} size={72} />
      </div>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{name}</h1>
      <p className="mt-1 text-sm text-stone-500">
        {[person.suburb, person.email, person.phone].filter(Boolean).join(" · ") ||
          (person.user_id ? "No details added yet" : `${person.first_name} adds their own details when they connect`)}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <p className="text-3xl font-semibold tabular-nums">{events.length}</p>
          <p className="text-sm text-stone-500">{events.length === 1 ? "event" : "events"}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <p className="text-3xl font-semibold tabular-nums">{outreach}</p>
          <p className="text-sm text-stone-500">outreach</p>
        </div>
      </div>

      <div className="mt-4">
        <AttendedBefore personId={person.id} initial={person.attended_before_app} />
      </div>

      <section className="mt-5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        {person.user_id ? (
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan" aria-hidden />
            <p className="text-sm">
              <span className="font-medium">Account connected</span>
              <span className="text-stone-500">
                {person.linked_at ? ` since ${formatEventDate(person.linked_at)}` : ""}
                {person.consent_marketing ? " · happy to get texts and emails" : ""}
              </span>
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-stone-300" aria-hidden />
              <p className="text-sm">
                <span className="font-medium">No account yet</span>
                <span className="block text-stone-500">Show them a QR code to connect</span>
              </p>
            </div>
            <InviteButton personId={person.id} firstName={person.first_name} />
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">Events</h2>
        {events.length === 0 ? (
          <p className="text-sm text-stone-500">Not checked in to any events yet.</p>
        ) : (
          <ul className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
            {events.map((e) => (
              <li key={e.id}>
                <Link href={`/events/${e.id}`} className="flex items-center gap-4 border-b border-black/5 px-4 py-3 last:border-0 hover:bg-stone-50">
                  <div className="w-16 shrink-0 text-sm font-medium text-stone-500">{formatEventDate(e.starts_at)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{e.title}</p>
                    {e.event_type && <p className="truncate text-sm text-stone-500">{e.event_type.name}</p>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="mt-10 border-t border-black/10 pt-6">
        <DeletePerson personId={person.id} name={person.first_name} events={events.length} />
      </section>
    </div>
  );
}
