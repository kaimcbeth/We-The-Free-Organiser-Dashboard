import type { SupabaseClient } from "@supabase/supabase-js";
import { EQUIPMENT_GUIDE, photoKey, type EquipmentItem } from "@/lib/resources";

// Funding is a mock until it comes from the We The Free website: every
// community gets $400 a month and has spent $250 a month for 4 months.
export const MOCK_FUNDING = { monthly: 400, spent: 250, months: 4 };
export const MOCK_BANKED =
  MOCK_FUNDING.months * (MOCK_FUNDING.monthly - MOCK_FUNDING.spent);
export const MOCK_SAVING = MOCK_FUNDING.monthly - MOCK_FUNDING.spent;

export type GearSuggestion = {
  key: string;
  name: string;
  upgrade: boolean;
  option: string | null; // e.g. "Best"
  product: string | null;
  price: number | null;
  priceText: string | null;
  url: string | null; // where to buy it
  shop: string | null;
  contactLead: boolean; // got from the Regional Support Lead, not a shop
  photo: string | null; // uploaded photo, or the guide's built-in one
  // "now": the banked money covers it (counting the ones above it);
  // a number: months of saving until it does; null: no price yet.
  when: "now" | number | null;
};

// "$137.50 for 4" -> 137.5
const dollars = (s?: string) => {
  const m = s?.replace(/,/g, "").match(/\$(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
};

function bestOf(item: EquipmentItem) {
  const opt =
    item.options?.find((o) => o.label === "Best") ?? item.options?.at(-1);
  if (item.parts) {
    const sum = item.parts.reduce((n, p) => n + (dollars(p.price) ?? 0), 0);
    return {
      opt: null,
      price: sum || null,
      text: sum ? `$${sum.toFixed(2)} for the parts` : null,
    };
  }
  const text = opt?.price ?? item.price ?? null;
  return { opt, price: dollars(text ?? undefined), text };
}

// What to get next with the community's funding: things it doesn't have yet,
// the base kit before upgrades, each as its Best version.
export function gearSuggestions(
  owned: Set<string>,
  banked: number,
  saving: number,
  photos: Record<string, string> = {}, // uploaded equipment photos, by photo key
): GearSuggestion[] {
  const has = (item: EquipmentItem) =>
    owned.has(item.key) ||
    (item.options ?? []).some((o) => owned.has(photoKey(item.key, o)));
  const out: GearSuggestion[] = [];
  let total = 0;
  for (const area of EQUIPMENT_GUIDE)
    for (const [list, upgrade] of [
      [area.items, false],
      [area.upgrades, true],
    ] as const)
      for (const item of list) {
        if (has(item) || item.noSuggest) continue;
        const { opt, price, text } = bestOf(item);
        let when: GearSuggestion["when"] = null;
        if (price !== null) {
          total += price;
          when =
            total <= banked
              ? "now"
              : saving > 0
                ? Math.ceil((total - banked) / saving)
                : null;
        }
        out.push({
          key: item.key,
          name: item.name,
          upgrade,
          option: opt?.label ?? null,
          product: opt?.product ?? null,
          price,
          priceText: text,
          url: opt?.url ?? item.url ?? null,
          shop: opt?.shop ?? item.shop ?? null,
          contactLead: !!opt?.contactLead,
          photo:
            photos[photoKey(item.key, opt ?? undefined)] ??
            opt?.image ??
            item.image ??
            null,
          when,
        });
      }
  return out;
}

export async function loadOwnedGear(supabase: SupabaseClient, teamId: string) {
  const { data } = await supabase
    .from("gear_items")
    .select("guide_key")
    .eq("team_id", teamId)
    .not("guide_key", "is", null);
  return new Set((data ?? []).map((r) => r.guide_key as string));
}

// Uploaded equipment guide photos (shared by every community), as public links.
export async function loadEquipmentPhotos(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("equipment_photos")
    .select("photo_key, path");
  return Object.fromEntries(
    (data ?? []).map((r) => [
      r.photo_key as string,
      supabase.storage.from("equipment").getPublicUrl(r.path as string).data
        .publicUrl,
    ]),
  ) as Record<string, string>;
}
