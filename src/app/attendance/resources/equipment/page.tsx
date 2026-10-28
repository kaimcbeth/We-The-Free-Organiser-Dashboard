import Link from "next/link";
import { requireCore } from "@/lib/organiser";
import { Equipment } from "@/components/equipment-guide";

export default async function EquipmentPage() {
  const { organiser } = await requireCore();
  const teamId =
    organiser.allCommunities || organiser.exampleMode
      ? null
      : organiser.team_id;
  return (
    <>
      <Link
        href="/attendance/resources"
        className="text-sm font-medium text-stone-500 hover:text-stone-800 hover:underline"
      >
        ← Resources &amp; Training
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        Equipment guide and inventory
      </h1>
      <p className="mt-1 text-stone-600">
        What to buy for the Movie Challenge and where, what your community
        already has, and who has it.
      </p>
      <div className="mt-5">
        <Equipment
          teamId={teamId}
          canEditPhotos={
            organiser.role === "god" || organiser.role === "regional_lead"
          }
        />
      </div>
    </>
  );
}
