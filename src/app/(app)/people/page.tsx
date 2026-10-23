import { requireOrganiser } from "@/lib/organiser";
import { GIVES, type Access, type CoreRole } from "@/lib/roles";
import { signPhotos } from "@/lib/photos";
import { LoadError } from "@/components/load-error";
import { PeopleList, type PersonRow } from "./people-list";

type Row = Omit<
  PersonRow,
  | "events"
  | "connected"
  | "photoUrl"
  | "role"
  | "rolePending"
  | "leads"
  | "roleTeamId"
> & {
  user_id: string | null;
  pending_role: Access | null;
  pending_team_id: string | null;
  photo_updated_at: string | null;
  attendance: { count: number }[];
};

export default async function PeoplePage({
  searchParams,
}: PageProps<"/people">) {
  const { deleted } = await searchParams;
  const { supabase, organiser } = await requireOrganiser();

  const { data, error } = await supabase
    .from("people")
    .select(
      "id, first_name, last_name, suburb, email, phone, user_id, pending_role, pending_team_id, facebook_url, photo_updated_at, attendance(count)",
    )
    // Also people made Organiser for this community whose profile is elsewhere.
    .or(
      `team_id.eq.${organiser.team_id},pending_team_id.eq.${organiser.team_id}`,
    )
    .order("first_name")
    .returns<Row[]>();

  if (error) return <LoadError what="people" />;

  const [{ data: roleRows }, { data: regions }, { data: leadRows }] =
    await Promise.all([
      supabase.rpc("list_roles"),
      supabase.from("regions").select("id, name").order("sort_order"),
      supabase
        .from("person_core_roles")
        .select("person_id, core_role")
        .eq("team_id", organiser.team_id)
        .is("ended_at", null),
    ]);
  const leads = new Map<string, CoreRole[]>();
  for (const r of (leadRows ?? []) as {
    person_id: string;
    core_role: CoreRole;
  }[])
    leads.set(r.person_id, [...(leads.get(r.person_id) ?? []), r.core_role]);
  const roles = new Map(
    ((roleRows as { person_id: string | null; role: Access }[] | null) ?? [])
      .filter((r) => organiser.role === "god" || r.role !== "god")
      .map((r) => [r.person_id, r.role]),
  );

  const photos = await signPhotos(supabase, data ?? []);
  const people: PersonRow[] = (data ?? []).map(
    ({
      attendance,
      user_id,
      photo_updated_at,
      pending_role,
      pending_team_id,
      ...p
    }) => ({
      ...p,
      connected: !!user_id,
      role: roles.get(p.id) ?? pending_role ?? null,
      rolePending: !roles.get(p.id) && !!pending_role,
      roleTeamId: pending_team_id,
      leads: leads.get(p.id) ?? [],
      events: attendance[0]?.count ?? 0,
      photoUrl: photo_updated_at ? (photos[p.id] ?? null) : null,
    }),
  );
  // Regional Support Leads (and God Mode) see the people who run things
  // first: Organisers, Core Team, members, then attendees.
  if (organiser.role === "regional_lead" || organiser.role === "god") {
    const rank = (p: PersonRow) =>
      p.role === "organiser" || p.role === "regional_lead" || p.role === "god"
        ? 0
        : p.role === "core_team"
          ? 1
          : p.connected
            ? 2
            : 3;
    people.sort((a, b) => rank(a) - rank(b));
  }
  const connected = people.filter((p) => p.connected).length;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">People</h1>
      <p className="mt-1 text-sm text-stone-500">
        {people.length} {people.length === 1 ? "person" : "people"} in{" "}
        {organiser.team?.name ?? "your community"} · {connected} with an account
      </p>
      {deleted && (
        <p className="mt-4 rounded-2xl bg-cyan/20 px-4 py-3 text-sm font-medium text-navy">
          Person deleted.
        </p>
      )}
      <PeopleList
        people={people}
        gives={GIVES[organiser.role]}
        regions={regions ?? []}
        communities={organiser.teams.map((t) => ({ id: t.id, name: t.name }))}
        homeTeamId={organiser.team_id}
        tz={organiser.team.timezone}
        withContact={
          organiser.role === "god" || organiser.role === "regional_lead"
        }
      />
    </div>
  );
}
