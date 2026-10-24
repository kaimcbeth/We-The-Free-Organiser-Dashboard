import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setRequestTz } from "@/lib/time";

import type { Access, ViewRole } from "@/lib/roles";
import { ROLE_LABEL, ROLE_RANK } from "@/lib/roles";
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
  viewValue: string | null; // what the "View as" menu shows (incl. "new_organiser")
  showTour: boolean; // run the organiser welcome tour on this page load
  tourPreview: boolean; // God Mode "View as New organiser": tour every time, nothing saved
  coreSetupPreview: boolean; // God Mode "View as New Core Team member": setup, nothing saved
  showCoreTour: boolean; // run the Core Team welcome tour
  region_id: string | null;
  team_id: string; // the team being looked at (with "All communities", a stand-in)
  homeTeamId: string; // their real community (differs only during the tour)
  exampleMode: boolean; // tour running: pages show the Example Community
  team: Team;
  teams: Team[]; // every team they can switch between
  allCommunities: boolean; // "All communities" picked (Regional Support Lead / God)
};

// Set when "All communities" is picked; the team cookie keeps the last single
// community, used by pages that only work one community at a time.
export const ALL_COOKIE = "all_communities";

export const TEAM_COOKIE = "active_team";
export const VIEW_AS_COOKIE = "view_as";
// God Mode "New organiser", after the tour: set up the Practice Community.
export const PRACTICE_COOKIE = "practice";

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
    .select(
      "id, team_id, region_id, name, email, access, tutorial_done_at, core_tutorial_done_at",
    )
    .eq("id", user.id)
    .maybeSingle<{
      id: string;
      team_id: string | null;
      region_id: string | null;
      name: string;
      email: string;
      access: Access;
      tutorial_done_at: string | null;
      core_tutorial_done_at: string | null;
    }>();
  if (!row) return { supabase, user, organiser: null };

  const { data: allTeams } = await supabase
    .from("teams")
    .select("id, name, slug, whatsapp_url, region_id, timezone")
    .eq("is_example", false)
    .eq("is_practice", false)
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

  const rawAs = jar.get(VIEW_AS_COOKIE)?.value;
  // "New organiser" previews the organiser view with the welcome tour.
  // "New Organiser (existing community)" / "(new community)": the tour, then
  // their community. A new community is the Practice Community, set up for real.
  const newOrganiserView =
    row.access === "god" &&
    (rawAs === "new_organiser" || rawAs === "new_organiser_new");
  const tourDone = newOrganiserView && jar.get(PRACTICE_COOKIE)?.value === "1";
  let practice: Team | null = null;
  if (tourDone && rawAs === "new_organiser_new") {
    const { data } = await supabase
      .from("teams")
      .select("id, name, slug, whatsapp_url, region_id, timezone")
      .eq("is_practice", true)
      .maybeSingle<Team>();
    practice = data;
  }
  const tourPreview = newOrganiserView && !tourDone;
  const coreSetupPreview = row.access === "god" && rawAs === "new_core_team";
  const asCookie = (
    newOrganiserView ? "organiser" : coreSetupPreview ? "core_team" : rawAs
  ) as ViewRole | undefined;
  const viewingAs =
    row.access === "god" &&
    asCookie &&
    asCookie in ROLE_LABEL &&
    asCookie !== "god"
      ? asCookie
      : null;
  const role: ViewRole = viewingAs ?? row.access;

  let team =
    teams.find((t) => t.id === wanted) ??
    teams.find((t) => t.id === row.team_id) ??
    teams[0];
  // Previewing as a Regional Support Lead: just that region's communities.
  if (viewingAs === "regional_lead")
    teams = teams.filter((t) => t.region_id === team.region_id);
  // "All communities" is for people who look after more than one.
  const allCommunities =
    !practice &&
    !(tourPreview || (row.access === "organiser" && !row.tutorial_done_at)) &&
    jar.get(ALL_COOKIE)?.value === "1" &&
    teams.length > 1 &&
    (role === "god" || role === "regional_lead");
  if (!teams.includes(team)) team = teams[0];
  if (practice) {
    team = practice;
    teams = [practice];
  }

  const showTour =
    tourPreview || (row.access === "organiser" && !row.tutorial_done_at);
  // During the tour, pages show a pretend community (John, Paul, George and
  // Ringo) so there's something to look at before their own has any data.
  const homeTeamId = team.id;
  let exampleMode = false;
  if (showTour) {
    const { data: example } = await supabase
      .from("teams")
      .select("id, name, slug, whatsapp_url, region_id, timezone")
      .eq("is_example", true)
      .maybeSingle<Team>();
    if (example) {
      team = example;
      teams = [example, ...teams];
      exampleMode = true;
    }
  }

  setRequestTz(team.timezone);

  const organiser: Organiser = {
    id: row.id,
    name: row.name,
    email: row.email,
    access: row.access,
    role,
    viewingAs,
    viewValue: newOrganiserView
      ? rawAs!
      : coreSetupPreview
        ? "new_core_team"
        : viewingAs,
    tourPreview,
    coreSetupPreview,
    showCoreTour:
      coreSetupPreview ||
      (row.access === "core_team" && !row.core_tutorial_done_at),
    showTour,
    region_id: row.region_id,
    team_id: team.id,
    homeTeamId,
    exampleMode,
    team,
    teams,
    allCommunities,
  };
  return { supabase, user, organiser };
}

// Organiser pages (Organiser and up). Core Team go to their attendance
// screen; members to their profile; signed out to login.
export async function requireOrganiser() {
  const { supabase, user, organiser } = await getStaff();
  if (!user) redirect("/login");
  if (!organiser || ROLE_RANK[organiser.role] <= 0) redirect("/me");
  if (organiser.role === "core_team") redirect("/attendance");
  return { supabase, user, organiser };
}

// Attendance pages (Core Team and up).
export async function requireCore() {
  const { supabase, user, organiser } = await getStaff();
  if (!user) redirect("/login");
  if (!organiser || ROLE_RANK[organiser.role] <= 0) redirect("/me");
  return { supabase, user, organiser };
}
