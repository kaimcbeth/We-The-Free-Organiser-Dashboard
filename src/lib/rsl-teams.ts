import type { SupabaseClient } from "@supabase/supabase-js";
import type { Team } from "@/lib/organiser";

// The communities a Regional Support Lead looks after: every team in their
// regions, plus teams in the regions' extra countries (0202: Oceania also
// covers Japan, whose teams sit in the Asia region).
export async function loadRslTeams(
  supabase: SupabaseClient,
  regionIds: string[],
): Promise<Team[]> {
  if (!regionIds.length) return [];
  const { data: regions } = await supabase
    .from("regions")
    .select("id, extra_countries")
    .in("id", regionIds);
  const countries = [
    ...new Set(
      (regions ?? []).flatMap(
        (r) => (r.extra_countries as string[] | null) ?? [],
      ),
    ),
  ].filter((c) => /^[\p{L} .'-]+$/u.test(c)); // safe inside the filter below
  const or = [
    `region_id.in.(${regionIds.join(",")})`,
    ...countries.map((c) => `name.ilike.*, ${c}`),
  ].join(",");
  const { data } = await supabase
    .from("teams")
    .select("id, name, slug, whatsapp_url, region_id, timezone")
    .eq("is_example", false)
    .eq("is_practice", false)
    .or(or)
    .order("name");
  return (data ?? []) as Team[];
}
