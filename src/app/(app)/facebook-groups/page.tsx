import { redirect } from "next/navigation";
import { requireOrganiser } from "@/lib/organiser";
import { GroupsList, type FbGroup } from "./groups-list";

export default async function FacebookGroupsPage() {
  const { supabase, organiser } = await requireOrganiser();
  if (organiser.role !== "god") redirect("/");

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
          Every local Facebook group where communities can share their events.
          Only God Mode can see this for now.
        </p>
      </div>
      <GroupsList
        groups={rows}
        teams={teams ?? []}
        defaultTeamId={organiser.team_id}
      />
    </div>
  );
}
