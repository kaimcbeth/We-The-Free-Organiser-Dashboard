import { notSeenInAWhile } from "@/lib/drift";
import {
  engagement,
  engagementStatus,
  isLapsed,
  loadTracking,
  recentEvents,
} from "@/lib/engagement";
import { requireOrganiser } from "@/lib/organiser";
import { GIVES, type Access, type CoreRole } from "@/lib/roles";
import type { RegionRole } from "./people-list";

const ROLE_ORDER: Access[] = ["god", "regional_lead", "organiser", "core_team"];
import { signPhotos } from "@/lib/photos";
import { LoadError } from "@/components/load-error";
import { PeopleList, type PersonRow } from "./people-list";
import { HelpingOut, type HelperRow } from "./helping-out";

type Row = Omit<
  PersonRow,
  | "events"
  | "connected"
  | "photoUrl"
  | "role"
  | "rolePending"
  | "leads"
  | "roleTeamId"
  | "attendedBefore"
  | "drift"
  | "status"
  | "recent"
  | "engagement"
> & {
  attended_before_app: boolean;
  new_to_activism: boolean;
  user_id: string | null;
  pending_role: Access | null;
  pending_team_id: string | null;
  photo_updated_at: string | null;
  attendance: { event: { starts_at: string } | null }[];
};

export default async function PeoplePage({
  searchParams,
}: PageProps<"/people">) {
  const { deleted, show } = await searchParams;
  // eslint-disable-next-line react-hooks/purity -- server component, rendered per request
  const now = Date.now();
  const { supabase, organiser } = await requireOrganiser();

  const { data, error } = await supabase
    .from("people")
    .select(
      "id, first_name, last_name, suburb, email, phone, user_id, pending_role, pending_team_id, facebook_url, photo_updated_at, attended_before_app, new_to_activism, created_at, attendance(event:events(starts_at))",
    )
    // Also people made Organiser for this community whose profile is elsewhere.
    .or(
      `team_id.eq.${organiser.team_id},pending_team_id.eq.${organiser.team_id}`,
    )
    .order("first_name")
    .returns<Row[]>();

  if (error) return <LoadError what="people" />;

  const [{ data: roleRows }, { data: regions }, { data: leadRows }, tracking] =
    await Promise.all([
      supabase.rpc("list_roles"),
      supabase.from("regions").select("id, name").order("sort_order"),
      supabase
        .from("person_core_roles")
        .select("person_id, core_role")
        .eq("team_id", organiser.team_id)
        .is("ended_at", null),
      loadTracking(supabase, organiser.team_id, now),
    ]);
  const communityDates = tracking.tracked;
  const helpers =
    organiser.allCommunities || organiser.exampleMode
      ? []
      : (((
          await supabase.rpc("team_micro_roles", {
            p_team_id: organiser.team_id,
          })
        ).data as HelperRow[] | null) ?? []);
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
      attended_before_app,
      ...p
    }) => ({
      ...p,
      connected: !!user_id,
      role: roles.get(p.id) ?? pending_role ?? null,
      // The tour's Example Community has no real accounts; show its roles as set.
      rolePending: !organiser.exampleMode && !roles.get(p.id) && !!pending_role,
      roleTeamId: pending_team_id,
      leads: leads.get(p.id) ?? [],
      events: attendance.length,
      ...(() => {
        const dates = attendance.flatMap((a) =>
          a.event ? [a.event.starts_at] : [],
        );
        return {
          drift: isLapsed(dates, now) ? null : notSeenInAWhile(dates, now),
          status: engagementStatus(dates, attended_before_app, now, tracking),
          recent: recentEvents(dates, now),
          engagement: engagement(dates, communityDates, now),
        };
      })(),
      attendedBefore: attended_before_app,
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

  // "All communities": everyone with a role across them, for "Has a role".
  let regionRoles: RegionRole[] | null = null;
  if (organiser.allCommunities) {
    const teamIds = organiser.teams.map((t) => t.id);
    const teamByName = new Map(organiser.teams.map((t) => [t.name, t]));
    const short = (n: string) => n.replace(/, (Australia|New Zealand)$/, "");
    const { data: pendingRows } = await supabase
      .from("people")
      .select(
        "id, first_name, last_name, team_id, pending_role, pending_team_id",
      )
      .not("pending_role", "is", null)
      .is("user_id", null)
      .in("team_id", teamIds);
    const connectedRoles = (
      (roleRows as
        | {
            user_id: string;
            person_id: string | null;
            name: string;
            role: Access;
            team: string | null;
            region: string | null;
            also_team: string | null; // God who's also an organiser here
            also_region: string | null; // ...and a Regional Support Lead there
          }[]
        | null) ?? []
    ).filter(
      (r) =>
        (r.role !== "god" || organiser.role === "god") &&
        (r.role === "regional_lead" ||
          r.role === "god" ||
          (r.team && teamByName.has(r.team))),
    );
    regionRoles = [
      ...connectedRoles.map((r) => ({
        key: r.user_id,
        personId: r.person_id,
        teamId: r.team ? (teamByName.get(r.team)?.id ?? null) : null,
        name: r.name,
        role: r.role,
        where:
          r.role === "god"
            ? [
                "All regions",
                r.also_region && `${r.also_region} RSL`,
                r.also_team && `${short(r.also_team)} organiser`,
              ]
                .filter(Boolean)
                .join(" · ")
            : r.role === "regional_lead"
              ? (r.region ?? "")
              : short(r.team ?? ""),
        pending: false,
      })),
      ...(pendingRows ?? []).map((p) => {
        const t = organiser.teams.find(
          (x) => x.id === (p.pending_team_id ?? p.team_id),
        );
        return {
          key: p.id,
          personId: p.id,
          teamId: p.team_id,
          name: [p.first_name, p.last_name].filter(Boolean).join(" "),
          role: p.pending_role as Access,
          where: t ? short(t.name) : "",
          pending: true,
        };
      }),
    ].sort(
      (a, b) =>
        ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) ||
        a.where.localeCompare(b.where) ||
        a.name.localeCompare(b.name),
    );
  }

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
      <HelpingOut rows={helpers} />
      <PeopleList
        initialFilter={
          show === "roles" ||
          show === "newcomers" ||
          show === "drift" ||
          show === "added"
            ? show
            : "all"
        }
        regionRoles={regionRoles}
        people={people}
        gives={GIVES[organiser.role]}
        regions={regions ?? []}
        communities={organiser.teams.map((t) => ({ id: t.id, name: t.name }))}
        homeTeamId={organiser.team_id}
        canMove={
          !organiser.allCommunities &&
          (organiser.role === "god" || organiser.role === "regional_lead")
        }
        tz={organiser.team.timezone}
        withContact={
          organiser.role === "god" || organiser.role === "regional_lead"
        }
      />
    </div>
  );
}
