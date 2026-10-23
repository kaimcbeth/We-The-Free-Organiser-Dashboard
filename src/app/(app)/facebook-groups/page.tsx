import { redirect } from "next/navigation";
import { requireOrganiser } from "@/lib/organiser";
import { GroupsList, type FbGroup } from "./groups-list";

export default async function FacebookGroupsPage({
  searchParams,
}: PageProps<"/facebook-groups">) {
  const sp = await searchParams;
  // Arrived from the "Add to Movement Hub" bookmark on a Facebook group.
  const add =
    typeof sp.add === "string" && /facebook\.com\/groups\//i.test(sp.add)
      ? {
          url: sp.add,
          name: typeof sp.name === "string" ? sp.name.slice(0, 200) : "",
        }
      : null;
  const { supabase, organiser } = await requireOrganiser();
  if (organiser.role === "core_team") redirect("/");
  const isGod = organiser.role === "god";

  const [{ data: groups }, { data: teams }] = await Promise.all([
    supabase
      .from("facebook_groups")
      .select("id, team_id, name, url, category, members, notes")
      .is("archived_at", null)
      .order("name")
      .returns<
        {
          id: string;
          team_id: string | null;
          name: string;
          url: string;
          category: string;
          members: number | null;
          notes: string | null;
        }[]
      >(),
    supabase
      .from("teams")
      .select("id, name")
      .order("name")
      .returns<{ id: string; name: string }[]>(),
  ]);

  const rows: FbGroup[] = (groups ?? []).map((g) => ({
    id: g.id,
    teamId: g.team_id,
    name: g.name,
    url: g.url,
    category: g.category,
    members: g.members,
    notes: g.notes ?? "",
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Facebook groups
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Local vegan and community Facebook groups where your events get
          shared. The Facebook groups tasks open them all in one go.
        </p>
      </div>
      <GroupsList
        groups={rows}
        teams={
          isGod
            ? (teams ?? [])
            : organiser.teams.map((t) => ({ id: t.id, name: t.name }))
        }
        defaultTeamId={organiser.team_id}
        isGod={isGod}
        add={add}
      />
    </div>
  );
}
