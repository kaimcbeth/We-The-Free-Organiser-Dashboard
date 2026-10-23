import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrganiser } from "@/lib/organiser";
import { formatEventDate } from "@/lib/time";
import { InviteButton } from "./invite-button";
import { DeletePerson } from "./delete-person";
import { AttendedBefore } from "./attended-before";
import { BuddyPicker, BuddySwitch } from "./buddy-controls";
import { Avatar } from "@/components/avatar";
import { signPhotos } from "@/lib/photos";
import { RolePicker } from "@/components/role-picker";
import { PhoneField } from "./phone-field";
import { GIVES, type Access, type CoreRole } from "@/lib/roles";

type Person = {
  id: string;
  first_name: string;
  last_name: string | null;
  suburb: string | null;
  email: string | null;
  phone: string | null;
  user_id: string | null;
  pending_role: Access | null;
  pending_team_id: string | null;
  linked_at: string | null;
  consent_marketing: boolean;
  added_via: string;
  created_at: string;
  starting_outreach_count: number;
  photo_updated_at: string | null;
  attended_before_app: boolean;
  is_buddy: boolean;
};

type Attended = {
  event: {
    id: string;
    title: string;
    starts_at: string;
    event_type: { name: string; counts_as_outreach: boolean } | null;
  } | null;
};

export default async function PersonPage({
  params,
}: PageProps<"/people/[id]">) {
  const { id } = await params;
  const { supabase, organiser } = await requireOrganiser();

  const { data: person } = await supabase
    .from("people")
    .select(
      "id, first_name, last_name, suburb, email, phone, user_id, pending_role, pending_team_id, linked_at, consent_marketing, added_via, created_at, starting_outreach_count, photo_updated_at, attended_before_app, is_buddy",
    )
    .eq("id", id)
    .or(
      `team_id.eq.${organiser.team_id},pending_team_id.eq.${organiser.team_id}`,
    )
    .maybeSingle<Person>();
  if (!person) notFound();

  const { data: rows } = await supabase
    .from("attendance")
    .select(
      "event:events(id, title, starts_at, event_type:event_types(name, counts_as_outreach))",
    )
    .eq("person_id", person.id)
    .returns<Attended[]>();

  const events = (rows ?? [])
    .map((r) => r.event)
    .filter((e): e is NonNullable<Attended["event"]> => !!e)
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  const outreach =
    events.filter((e) => e.event_type?.counts_as_outreach).length +
    person.starting_outreach_count;
  const name = [person.first_name, person.last_name].filter(Boolean).join(" ");
  const photos = await signPhotos(supabase, [person]);
  const [{ data: roleRows }, { data: regions }, { data: leadRows }] =
    await Promise.all([
      supabase.rpc("list_roles"),
      supabase.from("regions").select("id, name").order("sort_order"),
      supabase
        .from("person_core_roles")
        .select("core_role")
        .eq("person_id", person.id)
        .is("ended_at", null),
    ]);
  const leads = ((leadRows ?? []) as { core_role: CoreRole }[]).map(
    (r) => r.core_role,
  );
  const realRole =
    ((roleRows as { person_id: string | null; role: Access }[] | null) ?? [])
      .filter((r) => organiser.role === "god" || r.role !== "god")
      .find((r) => r.person_id === person.id)?.role ?? null;
  const role = realRole ?? person.pending_role;

  // Buddy info: this person's buddy, who they look after, and who could be their buddy.
  const fullName = (p: { first_name: string; last_name: string | null }) =>
    [p.first_name, p.last_name].filter(Boolean).join(" ");
  const [{ data: buddies }, { data: pairings }] = await Promise.all([
    supabase
      .from("people")
      .select("id, first_name, last_name")
      .eq("team_id", organiser.team_id)
      .eq("is_buddy", true)
      .neq("id", person.id)
      .order("first_name"),
    supabase
      .from("buddy_pairings")
      .select("id, newcomer_id, buddy_id, via, created_at")
      .or(`newcomer_id.eq.${person.id},buddy_id.eq.${person.id}`)
      .is("ended_at", null),
  ]);
  const myPairing = (pairings ?? []).find((p) => p.newcomer_id === person.id);
  const lookingAfterIds = (pairings ?? [])
    .filter((p) => p.buddy_id === person.id)
    .map((p) => p.newcomer_id);
  const ids = [...lookingAfterIds, ...(myPairing ? [myPairing.buddy_id] : [])];
  const { data: related } = ids.length
    ? await supabase
        .from("people")
        .select("id, first_name, last_name")
        .in("id", ids)
    : {
        data: [] as {
          id: string;
          first_name: string;
          last_name: string | null;
        }[],
      };
  const nameOf = new Map((related ?? []).map((p) => [p.id, fullName(p)]));
  const buddyOptions = (buddies ?? []).map((b) => ({
    id: b.id,
    name: fullName(b),
  }));

  return (
    <div>
      <Link
        href="/people"
        className="text-sm text-stone-500 hover:text-stone-800"
      >
        ← People
      </Link>
      <div className="mt-3">
        <Avatar name={name} url={photos[person.id] ?? null} size={72} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
        <RolePicker
          personId={person.id}
          firstName={person.first_name}
          connected={!!person.user_id}
          current={role}
          pending={!realRole && !!person.pending_role}
          leads={leads}
          communities={organiser.teams.map((t) => ({ id: t.id, name: t.name }))}
          homeTeamId={organiser.team_id}
          roleTeamId={person.pending_team_id}
          phone={person.phone ?? ""}
          email={person.email ?? ""}
          gives={GIVES[organiser.role]}
          regions={regions ?? []}
        />
      </div>
      {role && role !== "god" && (
        <PhoneField
          personId={person.id}
          initial={person.phone ?? ""}
          initialEmail={person.email ?? ""}
        />
      )}
      {/* People with a role get the editable Contact line above instead. */}
      {role && role !== "god" ? (
        person.suburb && (
          <p className="mt-1 text-sm text-stone-500">{person.suburb}</p>
        )
      ) : (
        <p className="mt-1 text-sm text-stone-500">
          {[person.suburb, person.email, person.phone]
            .filter(Boolean)
            .join(" · ") ||
            (person.user_id
              ? "No details added yet"
              : `${person.first_name} adds their own details when they connect`)}
        </p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <p className="text-3xl font-semibold tabular-nums">{events.length}</p>
          <p className="text-sm text-stone-500">
            {events.length === 1 ? "event" : "events"}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <p className="text-3xl font-semibold tabular-nums">{outreach}</p>
          <p className="text-sm text-stone-500">outreach</p>
        </div>
      </div>

      <div className="mt-4">
        <AttendedBefore
          personId={person.id}
          initial={person.attended_before_app}
        />
      </div>

      <section className="mt-5 space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
            New member support
          </h2>
          <BuddyPicker
            key={myPairing?.id ?? "none"}
            newcomerId={person.id}
            tz={organiser.team.timezone}
            current={
              myPairing
                ? {
                    buddyId: myPairing.buddy_id,
                    name: nameOf.get(myPairing.buddy_id) ?? "Their buddy",
                    since: myPairing.created_at,
                    via: myPairing.via,
                  }
                : null
            }
            options={buddyOptions}
          />
        </div>
        <div className="border-t border-black/5 pt-4">
          <BuddySwitch
            personId={person.id}
            initial={person.is_buddy}
            connected={!!person.user_id}
            firstName={person.first_name}
          />
          {lookingAfterIds.length > 0 && (
            <p className="mt-3 text-sm text-stone-600">
              Looking after:{" "}
              {lookingAfterIds.map((id, i) => (
                <span key={id}>
                  {i > 0 && ", "}
                  <Link
                    href={`/people/${id}`}
                    className="font-medium text-stone-900 hover:underline"
                  >
                    {nameOf.get(id) ?? "someone"}
                  </Link>
                </span>
              ))}
            </p>
          )}
        </div>
      </section>

      <section className="mt-5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        {person.user_id ? (
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan" aria-hidden />
            <p className="text-sm">
              <span className="font-medium">Account connected</span>
              <span className="text-stone-500">
                {person.linked_at
                  ? ` since ${formatEventDate(person.linked_at)}`
                  : ""}
                {person.consent_marketing
                  ? " · happy to get texts and emails"
                  : ""}
              </span>
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className="h-2.5 w-2.5 rounded-full bg-stone-300"
                aria-hidden
              />
              <p className="text-sm">
                <span className="font-medium">No account yet</span>
                <span className="block text-stone-500">
                  Show them a QR code to connect
                </span>
              </p>
            </div>
            <InviteButton personId={person.id} firstName={person.first_name} />
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
          Events
        </h2>
        {events.length === 0 ? (
          <p className="text-sm text-stone-500">
            Not checked in to any events yet.
          </p>
        ) : (
          <ul className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
            {events.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/events/${e.id}`}
                  className="flex items-center gap-4 border-b border-black/5 px-4 py-3 last:border-0 hover:bg-stone-50"
                >
                  <div className="w-16 shrink-0 text-sm font-medium text-stone-500">
                    {formatEventDate(e.starts_at)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{e.title}</p>
                    {e.event_type && (
                      <p className="truncate text-sm text-stone-500">
                        {e.event_type.name}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="mt-10 border-t border-black/10 pt-6">
        <DeletePerson
          personId={person.id}
          name={person.first_name}
          events={events.length}
        />
      </section>
    </div>
  );
}
