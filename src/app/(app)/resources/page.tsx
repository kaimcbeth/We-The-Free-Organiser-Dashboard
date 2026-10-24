import { requireOrganiser } from "@/lib/organiser";
import { ResourcesList } from "@/components/resources-list";

export default async function ResourcesPage() {
  await requireOrganiser();
  return <ResourcesList />;
}
