import { requireCore } from "@/lib/organiser";
import { ResourcesList } from "@/components/resources-list";

export default async function CoreResourcesPage() {
  const { organiser } = await requireCore();
  return (
    <ResourcesList
      teamId={
        organiser.allCommunities || organiser.exampleMode
          ? null
          : organiser.team_id
      }
    />
  );
}
