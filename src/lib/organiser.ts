import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setRequestTz } from "@/lib/time";

import type { Access, ViewRole } from "@/lib/roles";
import { ROLE_LABEL } from "@/lib/roles";
export { ROLE_LABEL, ROLE_RANK } from "@/lib/roles";
export type { Access, ViewRole } from "@/lib/roles";

export type Team = {
  id: string;
  name: string;
  slug: string;
  whatsapp_url: string | null;
  region_id: string | null;
  timezone: string;
};

export type Organiser = {
  id: string;
  name: string;
  email: string;
  access: Access; // their real role
  role: ViewRole; // the role the app is shown as (differs only in God Mode "view as")
  viewingAs: ViewRole | null;
  region_id: string | null;
  team_id: string; // the team being looked at
  team: Team;
  teams: Team[]; // every team they can switch between
};

export const TEAM_COOKIE = "active_team";
export const VIEW_AS_COOKIE = "view_as";

// The signed-in user's role and the team they're looking at, or null if
// they have no role (plain member) or aren't signed in.
export async function getStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, organiser: null };

  const { data: row } = await supabase
    .from("organisers")
    .select("id, team_id, region_id, name, email, access")
    .eq("id", user.id)
    .maybeSingle<{
      id: string;
      team_id: string | null;
      region_id: string | null;
      name: string;
      email: string;
      access: Access;
    }>();
  if (!row) return { supabase, user, organiser: null };

  const { data: allTeams } = await supabase
    .from("teams")
    .select("id, name, slug, whatsapp_url, region_id, timezone")
    .order("name")
    .returns<Team[]>();
  let teams = allTeams ?? [];
  if (row.access === "organiser" || row.access === "core_team")
    teams = teams.filter((t) => t.id === row.team_id);
  else if (row.access === "regional_lead")
    teams = teams.filter((t) => t.region_id === row.region_id);
  if (teams.length === 0) return { supabase, user, organiser: null };

  const jar = await cookies();
  const wanted = jar.get(TEAM_COOKIE)?.value;
  const team =
    teams.find((t) => t.id === wanted) ??
    teams.find((t) => t.id === row.team_id) ??
    teams[0];

  setRequestTz(team.timezone);

  const asCookie = jar.get(VIEW_AS_COOKIE)?.value as ViewRole | undefined;
  const viewingAs =
    row.access === "god" &&
    asCookie &&
    asCookie in ROLE_LABEL &&
    asCookie !== "god"
      ? asCookie
      : null;

  const organiser: Organiser = {
    id: row.id,
    name: row.name,
    email: row.email,
    access: row.access,
    role: viewingAs ?? row.access,
    viewingAs,
    region_id: row.region_id,
    team_id: team.id,
    team,
    teams,
  };
  return { supabase, user, organiser };
}

// Organiser pages (Organiser and up). Core Team go to their attendance
// screen; members to their profile; signed out to login.
export async function requireOrganiser() {
  const { supabase, user, organiser } = await getStaff();
  if (!user) redirect("/login");
  if (!organiser || organiser.role === "member") redirect("/me");
  if (organiser.role === "core_team") redirect("/attendance");
  return { supabase, user, organiser };
}

// Attendance pages (Core Team and up).
export async function requireCore() {
  const { supabase, user, organiser } = await getStaff();
  if (!user) redirect("/login");
  if (!organiser || organiser.role === "member") redirect("/me");
  return { supabase, user, organiser };
}
