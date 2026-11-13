import { redirect } from "next/navigation";
import { requireOrganiser } from "@/lib/organiser";
import { loadRegionChoices } from "@/lib/rsl-teams";
import { HangoutBuilder } from "@/components/hangout-builder";

// Organiser hangout builder: Regional Support Leads and God (Kai, 13 Nov 2026).
export default async function HangoutsPage({
  searchParams,
}: PageProps<"/resources/hangouts">) {
  const { supabase, organiser } = await requireOrganiser();
  if (organiser.role !== "god" && organiser.role !== "regional_lead")
    redirect("/resources");
  const { hangout, region: asked } = await searchParams;
  const hangoutId = typeof hangout === "string" ? hangout : null;

  const isGod = organiser.access === "god";
  const regions = isGod
    ? (await loadRegionChoices(supabase)).filter((r) => r.communities > 0)
    : null;

  // A hangout link opens the region it's for.
  let fromHangout: string | null = null;
  if (hangoutId) {
    const { data } = await supabase.rpc("hangout_region_for", {
      p_hangout: hangoutId,
    });
    fromHangout = (data as string | null) ?? null;
  }
  const regionId =
    (isGod && typeof asked === "string" ? asked : null) ??
    fromHangout ??
    organiser.previewRegionId ??
    (organiser.access === "regional_lead" ? organiser.region_id : null) ??
    organiser.leadRegionIds[0] ??
    organiser.team.region_id ??
    regions?.[0]?.id ??
    null;
  if (!regionId)
    return (
      <p className="text-sm text-stone-600">
        You&apos;re not linked to a region yet, so there&apos;s nowhere to plan
        a hangout for.
      </p>
    );

  return (
    <HangoutBuilder
      key={regionId}
      regionId={regionId}
      regions={regions}
      startHangoutId={hangoutId}
      isGod={isGod}
    />
  );
}
