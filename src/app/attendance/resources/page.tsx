import { requireCore } from "@/lib/organiser";
import { ResourcesList } from "@/components/resources-list";

export default async function CoreResourcesPage() {
  await requireCore();
  return <ResourcesList />;
}
