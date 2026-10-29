import type { SupabaseClient } from "@supabase/supabase-js";

// Event kinds for tagging photos, worked out from event titles (the official
// types are broad, e.g. "Community Event"). First keyword match wins.
const KINDS: { label: string; words: RegExp }[] = [
  { label: "Movie Challenge", words: /movie challenge|3mmc/i },
  { label: "Diamond", words: /diamond/i },
  { label: "Potluck", words: /potluck|pot luck/i },
  { label: "Coworking", words: /co-?working/i },
  { label: "Dinner", words: /dinner|meal/i },
  { label: "Picnic", words: /picnic/i },
  { label: "Sanctuary visit", words: /sanctuary|santuario/i },
  { label: "Workshop", words: /workshop|training/i },
  { label: "Stall", words: /stall|kiosque/i },
  { label: "Hike", words: /hike|walk/i },
  { label: "Litter pick", words: /litter/i },
  { label: "Demo", words: /demonstration|protest|vigil/i },
  { label: "Social", words: /social|hangout|meetup|meet-up|party/i },
];

// Always offered, even before there's a listing for them.
const DEFAULTS = ["Movie Challenge", "Social", "Potluck", "Coworking"];

export function kindOf(title: string, typeName: string | null) {
  const hit = KINDS.find((k) => k.words.test(title));
  if (hit) return hit.label;
  if (typeName && !/community event|other/i.test(typeName)) return typeName;
  return null;
}

// The kinds in a community's listings, most common first, plus the defaults.
export async function loadEventKinds(
  supabase: SupabaseClient,
  teamId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("events")
    .select("title, event_type:event_types(name)")
    .eq("team_id", teamId)
    .limit(1000);
  const count = new Map<string, number>();
  for (const e of (data ?? []) as {
    title: string;
    event_type: { name: string } | { name: string }[] | null;
  }[]) {
    const t = Array.isArray(e.event_type) ? e.event_type[0] : e.event_type;
    const k = kindOf(e.title, t?.name ?? null);
    if (k) count.set(k, (count.get(k) ?? 0) + 1);
  }
  const found = [...count.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);
  return [...found, ...DEFAULTS.filter((d) => !found.includes(d))];
}
