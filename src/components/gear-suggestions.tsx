import Link from "next/link";
import type { GearSuggestion } from "@/lib/funding";
import { PhotoSlot } from "@/components/photo-slot";

// "What to get next": the community's gear gaps (base kit first, then
// upgrades, Best versions) against its banked funding, with a picture and
// where to buy each. Only things there isn't enough money for yet are
// labelled (with roughly when there will be).
export function GearSuggestions({
  list,
  banked,
  saving,
  showLink = false,
  limit = 6,
}: {
  list: GearSuggestion[];
  banked: number;
  saving: number;
  showLink?: boolean; // link to the equipment guide (from Funding)
  limit?: number;
}) {
  const shown = list.slice(0, limit);
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">What to get next</h2>
        {showLink && (
          <Link
            href="/resources/equipment"
            className="text-xs text-stone-400 hover:text-navy hover:underline"
          >
            Equipment guide
          </Link>
        )}
      </div>
      <p className="mt-0.5 text-xs text-stone-500">
        With ${banked} banked and about ${saving} saved each month. Things you
        haven&apos;t got yet, base kit first.
      </p>
      {shown.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">
          You&apos;ve got everything in the guide. Nice work.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-black/5">
          {shown.map((s) => (
            <li key={s.key} className="flex items-center gap-3 py-2.5 text-sm">
              {s.photo ? (
                <PhotoSlot photo={s.photo} alt={s.name} />
              ) : (
                <span className="h-16 w-16 shrink-0 rounded-xl bg-stone-50 ring-1 ring-black/5" />
              )}
              <span className="min-w-0 flex-1">
                <span className="font-medium">{s.name}</span>
                {s.upgrade && (
                  <span className="ml-1.5 rounded-full bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-500">
                    Upgrade
                  </span>
                )}
                <span className="block truncate text-xs text-stone-500">
                  {[
                    s.option &&
                      `${s.option === "Best" ? "✨ " : ""}${s.option}`,
                    s.product,
                    s.priceText ?? "Price to come",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                {s.url ? (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 inline-block text-xs font-semibold text-pink-ink hover:underline"
                  >
                    Buy{s.shop ? ` at ${s.shop}` : ""} ↗
                  </a>
                ) : (
                  <Link
                    href="/resources/equipment"
                    className="mt-0.5 inline-block text-xs font-semibold text-pink-ink hover:underline"
                  >
                    {s.contactLead
                      ? "Get it from your Regional Support Lead"
                      : s.shop
                        ? `From ${s.shop}: see the guide`
                        : "See the guide"}
                  </Link>
                )}
              </span>
              {typeof s.when === "number" && (
                <span className="shrink-0 text-right text-xs text-stone-500">
                  Enough in about {s.when} {s.when === 1 ? "month" : "months"}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {list.length > shown.length && (
        <p className="mt-1 text-xs text-stone-400">
          and {list.length - shown.length} more in the guide
        </p>
      )}
    </section>
  );
}
