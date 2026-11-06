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

// Every region for God's "Previewing as Regional Support Lead" Region menu,
// labelled with its extra countries ("Oceania + Japan") and how many
// communities it looks after.
export async function loadRegionChoices(
  supabase: SupabaseClient,
): Promise<{ id: string; label: string; communities: number }[]> {
  const [{ data: regions }, { data: teams }] = await Promise.all([
    supabase.from("regions").select("id, name, extra_countries").order("name"),
    supabase
      .from("teams")
      .select("name, region_id")
      .eq("is_example", false)
      .eq("is_practice", false),
  ]);
  return (regions ?? []).map((r) => {
    const extra = (r.extra_countries as string[] | null) ?? [];
    const communities = (teams ?? []).filter(
      (t) =>
        t.region_id === r.id ||
        extra.some((c) => (t.name as string).endsWith(`, ${c}`)),
    ).length;
    return {
      id: r.id as string,
      label: [r.name as string, ...extra].join(" + "),
      communities,
    };
  });
}
