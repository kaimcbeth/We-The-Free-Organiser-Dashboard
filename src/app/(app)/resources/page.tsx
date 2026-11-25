import { requireOrganiser } from "@/lib/organiser";
import { createClient } from "@/lib/supabase/server";
import { ResourcesList } from "@/components/resources-list";
import { isGlobal } from "@/lib/roles";

export default async function ResourcesPage() {
  const { organiser } = await requireOrganiser();
  const teamId =
    organiser.allCommunities || organiser.exampleMode
      ? null
      : organiser.team_id;
  const { data: team } = teamId
    ? await (
        await createClient()
      )
        .from("teams")
        .select("slug")
        .eq("id", teamId)
        .maybeSingle<{ slug: string }>()
    : { data: null };
  return (
    <ResourcesList
      teamId={teamId}
      teamSlug={team?.slug ?? null}
      isGod={isGlobal(organiser.role)}
      rsl={isGlobal(organiser.role) || organiser.role === "regional_lead"}
    />
  );
}
