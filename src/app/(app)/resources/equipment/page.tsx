import Link from "next/link";
import { requireOrganiser } from "@/lib/organiser";
import { Equipment } from "@/components/equipment-guide";
import { GearSuggestions } from "@/components/gear-suggestions";
import {
  MOCK_BANKED,
  MOCK_SAVING,
  gearSuggestions,
  loadOwnedGear,
} from "@/lib/funding";

export default async function EquipmentPage() {
  const { supabase, organiser } = await requireOrganiser();
  const teamId =
    organiser.allCommunities || organiser.exampleMode
      ? null
      : organiser.team_id;
  const gear = teamId
    ? gearSuggestions(
        await loadOwnedGear(supabase, teamId),
        MOCK_BANKED,
        MOCK_SAVING,
      )
    : null;
  return (
    <>
      <Link
        href="/resources"
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
      {gear && (
        <div className="mt-5">
          <GearSuggestions
            list={gear}
            banked={MOCK_BANKED}
            saving={MOCK_SAVING}
            limit={3}
          />
        </div>
      )}
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
