import { requireOrganiser } from "@/lib/organiser";
import { createClient } from "@/lib/supabase/server";
import { ResourcesList } from "@/components/resources-list";

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
      isGod={organiser.role === "god"}
    />
  );
}
