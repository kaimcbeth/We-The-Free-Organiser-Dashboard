import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MONTHS,
  nextHangoutAfter,
  type Block,
  type Fill,
  type Plan,
  type Suggestions,
} from "@/lib/hangouts";

// Loading for the hangout builder and the notes window (browser client).

export const BLOCK_COLUMNS =
  "id, key, region_id, section, title, blurb, minutes, slides, sort_order";
export const PLAN_COLUMNS =
  "id, region_id, hangout_id, title, held_on, items, updated_at";

export async function loadBlocks(supabase: SupabaseClient, regionId: string) {
  const { data } = await supabase
    .from("hangout_blocks")
    .select(BLOCK_COLUMNS)
    .is("archived_at", null)
    .or(`region_id.is.null,region_id.eq.${regionId}`)
    .order("sort_order")
    .order("created_at");
  return (data ?? []) as Block[];
}

export async function loadPlans(supabase: SupabaseClient, regionId: string) {
  const { data } = await supabase
    .from("hangout_plans")
    .select(PLAN_COLUMNS)
    .eq("region_id", regionId)
    .order("held_on", { ascending: false, nullsFirst: true })
    .order("updated_at", { ascending: false })
    .limit(60);
  return (data ?? []) as Plan[];
}

// Worked out from the hangout's date (Kai, 13 Nov 2026): special events on or
// after it, the month before it, and later hangouts.
export async function loadSuggestions(
  supabase: SupabaseClient,
  regionId: string,
  on: string | null = null,
) {
  const { data } = await supabase.rpc("hangout_suggestions", {
    p_region: regionId,
    p_on: on,
  });
  return (data as Suggestions | null) ?? null;
}

export async function regionLabel(supabase: SupabaseClient, regionId: string) {
  const { data } = await supabase
    .from("regions")
    .select("name, extra_countries")
    .eq("id", regionId)
    .maybeSingle();
  if (!data) return "";
  return [
    data.name as string,
    ...((data.extra_countries as string[]) ?? []),
  ].join(" + ");
}

export function makeFill(
  region: string,
  plan: Plan | null,
  s: Suggestions | null,
): Fill {
  const d = plan?.held_on ? new Date(`${plan.held_on}T12:00:00`) : new Date();
  const first = s?.specials[0];
  return {
    region,
    month: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
    nextHangout: nextHangoutAfter(s, plan?.held_on ?? null),
    special: first
      ? `${first.emoji ? `${first.emoji} ` : ""}${first.name}`
      : "",
  };
}

// Everything the notes window needs for one plan.
export async function loadPlanDeck(supabase: SupabaseClient, planId: string) {
  const { data } = await supabase
    .from("hangout_plans")
    .select(PLAN_COLUMNS)
    .eq("id", planId)
    .maybeSingle();
  const plan = data as Plan | null;
  if (!plan) return null;
  const [blocks, suggestions, region] = await Promise.all([
    loadBlocks(supabase, plan.region_id),
    loadSuggestions(supabase, plan.region_id, plan.held_on),
    regionLabel(supabase, plan.region_id),
  ]);
  return {
    plan,
    blocks: new Map(blocks.map((b) => [b.id, b])),
    fill: makeFill(region, plan, suggestions),
    region,
  };
}
