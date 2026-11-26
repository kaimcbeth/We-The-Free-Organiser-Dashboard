import { redirect } from "next/navigation";
import { requireOrganiser } from "@/lib/organiser";
import { isGlobal } from "@/lib/roles";
import { MeetingPlanner } from "@/components/meeting-planner";

// Meeting planner: God and Community Managers (Kai, 26 Nov 2026).
export default async function MeetingsPage() {
  const { organiser } = await requireOrganiser();
  if (!isGlobal(organiser.role)) redirect("/resources");
  return <MeetingPlanner />;
}
