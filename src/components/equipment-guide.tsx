"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GearTracker } from "@/components/gear-tracker";
import { EQUIPMENT_GUIDE, type EquipmentItem } from "@/lib/resources";

// Equipment: the recommended kit (base kit, then upgrades) with where to buy
// it, which of it the community already has, and the community's gear list
// (who has what). "We have it" adds the item to the gear list.
export function Equipment({ teamId }: { teamId: string | null }) {
  const [version, setVersion] = useState(0);
  const [have, setHave] = useState<Set<string>>(new Set());
  const bump = () => setVersion((v) => v + 1);

  useEffect(() => {
    if (!teamId) return;
    let live = true;
    createClient()
      .from("gear_items")
      .select("guide_key")
      .eq("team_id", teamId)
      .not("guide_key", "is", null)
      .then(({ data }) => {
        if (live)
          setHave(new Set((data ?? []).map((r) => r.guide_key as string)));
      });
    return () => {
      live = false;
    };
  }, [teamId, version]);

  async function add(
    item: EquipmentItem,
    opt: NonNullable<EquipmentItem["options"]>[number] | undefined,
  ) {
    if (!teamId) return;
    setHave((h) => new Set([...h, item.key]));
    await createClient()
      .from("gear_items")
      .insert({
        team_id: teamId,
        name: item.name,
        model: opt?.product ?? opt?.label ?? null,
        source: opt?.url ?? item.url,
        guide_key: item.key,
      });
    bump();
  }

  return (
    <div className="space-y-6">
      {EQUIPMENT_GUIDE.map((g) => (
        <div key={g.area} className="space-y-6">
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold">Base kit</h2>
              <span className="rounded-full bg-cyan/25 px-2 py-0.5 text-xs font-semibold text-navy">
                {g.area}
              </span>
              {teamId && (
                <span className="ml-auto text-sm text-stone-500">
                  You have {g.items.filter((i) => have.has(i.key)).length} of{" "}
                  {g.items.length}
                </span>
              )}
            </div>
            <ul className="mt-2 divide-y divide-black/5">
              {g.items.map((i) => (
                <EquipmentRow
                  key={i.key}
                  item={i}
                  has={have.has(i.key)}
                  onHave={teamId ? (opt) => add(i, opt) : undefined}
                />
              ))}
            </ul>
          </section>
          {g.upgrades.length > 0 && (
            <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
              <h2 className="font-semibold">Upgrades</h2>
              <p className="text-sm text-stone-500">
                Nice to have once the base kit is sorted.
              </p>
              <ul className="mt-1 divide-y divide-black/5">
                {g.upgrades.map((i) => (
                  <EquipmentRow
                    key={i.key}
                    item={i}
                    has={have.has(i.key)}
                    onHave={teamId ? (opt) => add(i, opt) : undefined}
                  />
                ))}
              </ul>
            </section>
          )}
        </div>
      ))}
      {teamId && (
        <GearTracker teamId={teamId} version={version} onChanged={bump} />
      )}
    </div>
  );
}

type Option = NonNullable<EquipmentItem["options"]>[number];

// One piece of kit, linking to where to buy it. With options (like budget
// and best), a small toggle switches between them. "We have it" adds it to
// the community's gear (the option showing is the one recorded).
function EquipmentRow({
  item,
  has,
  onHave,
}: {
  item: EquipmentItem;
  has: boolean;
  onHave?: (opt: Option | undefined) => void;
}) {
  const [pick, setPick] = useState(0);
  const opt = item.options?.[pick];
  const url = opt?.url ?? item.url;
  return (
    <li className="py-2.5">
      <div className="flex items-start justify-between gap-3">
        <span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block font-medium text-navy hover:underline"
          >
            {item.name}
          </a>
          <span className="block text-sm text-stone-600">{item.about}</span>
        </span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 pt-0.5 text-xs text-stone-500 hover:text-stone-800"
        >
          {opt?.shop ?? item.shop} ↗
        </a>
      </div>
      {item.options && (
        <div className="mt-2">
          <div
            role="tablist"
            aria-label={`${item.name} options`}
            className="inline-flex rounded-full bg-stone-100 p-0.5"
          >
            {item.options.map((o, n) => (
              <button
                key={o.label}
                type="button"
                role="tab"
                aria-selected={pick === n}
                onClick={() => setPick(n)}
                className={`rounded-full px-3 py-0.5 text-xs font-semibold ${pick === n ? "bg-navy text-white" : "text-stone-600 hover:text-navy"}`}
              >
                {o.label}
              </button>
            ))}
          </div>
          {opt && (
            <p className="mt-1 text-sm text-stone-600">
              {opt.product && (
                <a
                  href={opt.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-navy hover:underline"
                >
                  {opt.product}.{" "}
                </a>
              )}
              {opt.about}
            </p>
          )}
        </div>
      )}
      {onHave && (
        <div className="mt-2">
          {has ? (
            <a
              href="#gear"
              className="inline-flex items-center gap-1 rounded-full bg-cyan/20 px-2.5 py-0.5 text-xs font-semibold text-navy hover:bg-cyan/30"
            >
              ✓ We have it
            </a>
          ) : (
            <button
              type="button"
              onClick={() => onHave(opt)}
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50 hover:text-navy"
            >
              We have it
            </button>
          )}
        </div>
      )}
    </li>
  );
}
