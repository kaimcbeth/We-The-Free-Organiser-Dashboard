"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import { GearTracker } from "@/components/gear-tracker";
import {
  CONDITIONS,
  EQUIPMENT_GUIDE,
  photoKey,
  type Condition,
  type EquipmentItem,
} from "@/lib/resources";
import { shrink } from "@/components/photo-uploader";
import { PhotoSlot } from "@/components/photo-slot";

// Equipment: the recommended kit (base kit, then upgrades) with where to buy
// it, which of it the community already has, and the community's gear list
// (who has what). Ticking "In community inventory" adds it to the gear list
// (unticking takes it off).
// Hiding the recommendations is remembered on this device.
const HIDE_KEY = "equipment-hide-recommendations";
const listeners = new Set<() => void>();
function readHidden() {
  try {
    return localStorage.getItem(HIDE_KEY) === "1";
  } catch {
    return false;
  }
}
function setHidden(v: boolean) {
  try {
    if (v) localStorage.setItem(HIDE_KEY, "1");
    else localStorage.removeItem(HIDE_KEY);
  } catch {}
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function Equipment({
  teamId,
  canEditPhotos = false,
}: {
  teamId: string | null;
  canEditPhotos?: boolean; // Regional Support Leads and God Mode
}) {
  const stored = useSyncExternalStore(subscribe, readHidden, () => false);
  // Only an inventory to show if there's a community to keep one for.
  const hidden = !!teamId && stored;
  const [version, setVersion] = useState(0);
  // Guide items the community has, with the condition of (the first of) it.
  const [have, setHave] = useState<Map<string, Condition | null>>(new Map());
  const bump = () => setVersion((v) => v + 1);
  const [photos, setPhotos] = useState<Record<string, string>>({});

  // Uploaded photos (shared by every community), as public links.
  useEffect(() => {
    let live = true;
    const db = createClient();
    db.from("equipment_photos")
      .select("photo_key, path")
      .then(({ data }) => {
        if (!live) return;
        setPhotos(
          Object.fromEntries(
            (data ?? []).map((r) => [
              r.photo_key as string,
              db.storage.from("equipment").getPublicUrl(r.path as string).data
                .publicUrl,
            ]),
          ),
        );
      });
    return () => {
      live = false;
    };
  }, []);

  async function upload(key: string, file: File) {
    const db = createClient();
    const { blob } = await shrink(file, 800);
    const path = `${key.replace(/[^a-z0-9_-]/g, "-")}/${crypto.randomUUID()}.jpg`;
    const up = await db.storage
      .from("equipment")
      .upload(path, blob, { contentType: "image/jpeg" });
    if (up.error) return false;
    const row = await db
      .from("equipment_photos")
      .upsert({ photo_key: key, path, updated_at: new Date().toISOString() });
    if (row.error) return false;
    setPhotos((p) => ({
      ...p,
      [key]: db.storage.from("equipment").getPublicUrl(path).data.publicUrl,
    }));
    return true;
  }

  useEffect(() => {
    if (!teamId) return;
    let live = true;
    createClient()
      .from("gear_items")
      .select("guide_key, condition")
      .eq("team_id", teamId)
      .not("guide_key", "is", null)
      .order("created_at")
      .then(({ data }) => {
        if (!live) return;
        const m = new Map<string, Condition | null>();
        for (const r of data ?? [])
          if (!m.has(r.guide_key as string))
            m.set(r.guide_key as string, r.condition as Condition | null);
        setHave(m);
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
    setHave((h) => new Map(h).set(item.key, null));
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

  async function setCondition(item: EquipmentItem, c: Condition | null) {
    if (!teamId) return;
    setHave((h) => new Map(h).set(item.key, c));
    await createClient()
      .from("gear_items")
      .update({ condition: c })
      .eq("team_id", teamId)
      .eq("guide_key", item.key);
    bump();
  }

  async function removeFromInventory(item: EquipmentItem) {
    if (!teamId) return;
    setHave((h) => {
      const n = new Map(h);
      n.delete(item.key);
      return n;
    });
    await createClient()
      .from("gear_items")
      .delete()
      .eq("team_id", teamId)
      .eq("guide_key", item.key);
    bump();
  }

  return (
    <div className="space-y-6">
      {teamId && (
        <div className="-mt-2 text-right">
          <button
            type="button"
            onClick={() => setHidden(!hidden)}
            className="text-sm font-medium text-stone-500 hover:text-stone-800 hover:underline"
          >
            {hidden ? "Show recommendations" : "Hide recommendations"}
          </button>
        </div>
      )}
      {!hidden &&
        EQUIPMENT_GUIDE.map((g) => (
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
                    condition={have.get(i.key) ?? null}
                    onCondition={teamId ? (c) => setCondition(i, c) : undefined}
                    onHave={
                      teamId
                        ? (opt, on) =>
                            on ? add(i, opt) : removeFromInventory(i)
                        : undefined
                    }
                    photos={photos}
                    onUpload={canEditPhotos ? upload : undefined}
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
                      condition={have.get(i.key) ?? null}
                      onCondition={
                        teamId ? (c) => setCondition(i, c) : undefined
                      }
                      onHave={
                        teamId
                          ? (opt, on) =>
                              on ? add(i, opt) : removeFromInventory(i)
                          : undefined
                      }
                      photos={photos}
                      onUpload={canEditPhotos ? upload : undefined}
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
// and best), a small toggle switches between them. ticking "In community inventory" adds it to
// the community's gear (the option showing is the one recorded).
function EquipmentRow({
  item,
  has,
  onHave,
  condition,
  onCondition,
  photos,
  onUpload,
}: {
  item: EquipmentItem;
  has: boolean;
  condition: Condition | null;
  onCondition?: (c: Condition | null) => void;
  onHave?: (opt: Option | undefined, on: boolean) => void;
  photos: Record<string, string>; // uploaded, by photo key
  onUpload?: (key: string, file: File) => Promise<boolean>; // staff only
}) {
  const [pick, setPick] = useState(0);
  const opt = item.options?.[pick];
  const url = opt?.url ?? item.url;
  const key = photoKey(item.key, opt);
  const photo = photos[key] ?? opt?.image ?? item.image ?? null;
  return (
    <li className="flex gap-3 py-2.5">
      <PhotoSlot
        key={key}
        photo={photo}
        alt={opt?.product ?? item.name}
        href={url}
        onUpload={onUpload ? (f) => onUpload(key, f) : undefined}
      />
      <div className="min-w-0 flex-1">
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
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={has}
                onChange={(e) => onHave(opt, e.target.checked)}
                className="h-4 w-4 accent-navy"
              />
              In community inventory
            </label>
            {has && onCondition && (
              <select
                value={condition ?? ""}
                onChange={(e) =>
                  onCondition((e.target.value || null) as Condition | null)
                }
                aria-label={`${item.name} condition`}
                className={`rounded-lg bg-white px-2 py-0.5 text-sm ring-1 ring-black/10 ${
                  condition === "needs_replacing"
                    ? "text-red-700"
                    : condition
                      ? "text-stone-700"
                      : "text-stone-400"
                }`}
              >
                <option value="">Condition</option>
                {CONDITIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
