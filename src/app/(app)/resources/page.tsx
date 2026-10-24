import { requireOrganiser } from "@/lib/organiser";
import { ResourcesList } from "@/components/resources-list";

export default async function ResourcesPage() {
  const { organiser } = await requireOrganiser();
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
