"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import { GearTracker } from "@/components/gear-tracker";
import {
  CONDITIONS,
  EQUIPMENT_GUIDE,
  PRICES_CHECKED,
  photoKey,
  type Condition,
  type EquipmentItem,
} from "@/lib/resources";
import { shrink } from "@/components/photo-uploader";
import { PhotoSlot } from "@/components/photo-slot";
import { Sheet } from "@/components/sheet";

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
  const [have, setHave] = useState<Map<string, Owned>>(new Map());
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
      .select("guide_key, condition, quantity")
      .eq("team_id", teamId)
      .not("guide_key", "is", null)
      .order("created_at")
      .then(({ data }) => {
        if (!live) return;
        const m = new Map<string, Owned>();
        for (const r of data ?? [])
          if (!m.has(r.guide_key as string))
            m.set(r.guide_key as string, {
              condition: r.condition as Condition | null,
              quantity: (r.quantity as number) ?? 1,
            });
        setHave(m);
      });
    return () => {
      live = false;
    };
  }, [teamId, version]);

  async function add(item: EquipmentItem, opt: Option | undefined) {
    if (!teamId) return;
    const key = invKey(item, opt);
    setHave((h) => new Map(h).set(key, { condition: null, quantity: 1 }));
    await createClient()
      .from("gear_items")
      .insert({
        team_id: teamId,
        name: item.name,
        model: opt?.product ?? null,
        source: opt?.url ?? item.url ?? null,
        guide_key: key,
      });
    bump();
  }

  async function setOwned(
    item: EquipmentItem,
    opt: Option | undefined,
    change: Partial<Owned>,
  ) {
    if (!teamId) return;
    const key = invKey(item, opt);
    setHave((h) => {
      const now = h.get(key) ?? { condition: null, quantity: 1 };
      return new Map(h).set(key, { ...now, ...change });
    });
    await createClient()
      .from("gear_items")
      .update(change)
      .eq("team_id", teamId)
      .eq("guide_key", key);
    bump();
  }

  async function removeFromInventory(
    item: EquipmentItem,
    opt: Option | undefined,
  ) {
    if (!teamId) return;
    const key = invKey(item, opt);
    setHave((h) => {
      const n = new Map(h);
      n.delete(key);
      return n;
    });
    await createClient()
      .from("gear_items")
      .delete()
      .eq("team_id", teamId)
      .eq("guide_key", key);
    bump();
  }

  // The recommended list's photo for each inventory entry (uploaded, or the
  // built-in one), so gear added from the list shows the same picture.
  const guidePhotos: Record<string, string> = {};
  for (const g of EQUIPMENT_GUIDE)
    for (const i of [...g.items, ...g.upgrades])
      for (const o of i.options ?? [undefined]) {
        const pic = photos[photoKey(i.key, o)] ?? o?.image ?? i.image;
        if (pic) guidePhotos[invKey(i, o)] = pic;
      }

  // An item counts as had if any version of it is in the inventory.
  const hasAny = (i: EquipmentItem) =>
    i.options ? i.options.some((o) => have.has(invKey(i, o))) : have.has(i.key);

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
                    You have {g.items.filter((i) => hasAny(i)).length} of{" "}
                    {g.items.length}
                  </span>
                )}
              </div>
              <ul className="mt-2 divide-y divide-black/5">
                {g.items.map((i) => (
                  <EquipmentRow
                    key={i.key}
                    item={i}
                    inventory={have}
                    onOwned={
                      teamId ? (opt, c) => setOwned(i, opt, c) : undefined
                    }
                    onHave={
                      teamId
                        ? (opt, on) =>
                            on ? add(i, opt) : removeFromInventory(i, opt)
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
                      inventory={have}
                      onOwned={
                        teamId ? (opt, c) => setOwned(i, opt, c) : undefined
                      }
                      onHave={
                        teamId
                          ? (opt, on) =>
                              on ? add(i, opt) : removeFromInventory(i, opt)
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
      {!hidden && (
        <p className="-mt-3 text-xs text-stone-500">
          Prices are from each shop&apos;s listing on {PRICES_CHECKED},
          including GST but not shipping. They change, so check before you buy.
        </p>
      )}
      {teamId && (
        <GearTracker
          teamId={teamId}
          version={version}
          onChanged={bump}
          guidePhotos={guidePhotos}
        />
      )}
    </div>
  );
}

type Option = NonNullable<EquipmentItem["options"]>[number];
type Owned = { condition: Condition | null; quantity: number };

// Which inventory entry: the item, or one version of it (Budget and Best are
// tracked separately), e.g. "a_frame:budget".
const invKey = (item: EquipmentItem, opt?: Option) =>
  item.options && opt ? photoKey(item.key, opt) : item.key;

// Shown on the Budget / Best toggle (Kai asked for these, despite the usual
// no-emoji-on-buttons rule).
const OPTION_EMOJI: Record<string, string> = {
  Budget: "✅",
  Best: "✨",
  DIY: "🛠️",
};

// One piece of kit, linking to where to buy it. With options (like budget
// and best), a small toggle switches between them. ticking "In community inventory" adds it to
// the community's gear (the option showing is the one recorded).
function EquipmentRow({
  item,
  inventory,
  onHave,
  onOwned,
  photos,
  onUpload,
}: {
  item: EquipmentItem;
  inventory: Map<string, Owned>; // what the community has, by inventory key
  onOwned?: (opt: Option | undefined, change: Partial<Owned>) => void;
  onHave?: (opt: Option | undefined, on: boolean) => void;
  photos: Record<string, string>; // uploaded, by photo key
  onUpload?: (key: string, file: File) => Promise<boolean>; // staff only
}) {
  // Open on the version the community has, else the first.
  const [pick, setPick] = useState(() =>
    Math.max(
      0,
      (item.options ?? []).findIndex((o) => inventory.has(invKey(item, o))),
    ),
  );
  const [guideOpen, setGuideOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const opt = item.options?.[pick];
  const url = opt?.url ?? item.url;
  const key = photoKey(item.key, opt);
  const owned = inventory.get(invKey(item, opt)) ?? null;
  const has = !!owned;
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
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block font-medium text-navy hover:underline"
              >
                {item.name}
              </a>
            ) : (
              <span className="block font-medium text-navy">{item.name}</span>
            )}
            <span className="block text-sm text-stone-600">{item.about}</span>
            {(opt ? opt.price : item.price) && (
              <span className="mt-0.5 block text-sm font-semibold text-navy">
                {opt ? opt.price : item.price}
              </span>
            )}
            {item.parts && (
              <ul className="mt-1 space-y-0.5">
                {item.parts.map((part) => (
                  <li key={part.url} className="text-sm">
                    <a
                      href={part.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-navy hover:underline"
                    >
                      {part.name}
                    </a>{" "}
                    <span className="text-xs text-stone-500">
                      {part.price && (
                        <span className="font-semibold text-navy">
                          {part.price} ·{" "}
                        </span>
                      )}
                      {part.shop} ↗
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </span>
          <span className="flex shrink-0 flex-col items-end gap-1">
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="pt-0.5 text-xs text-stone-500 hover:text-stone-800"
              >
                {opt?.shop ?? item.shop} ↗
              </a>
            )}
            {item.guide && opt?.instructions === undefined && (
              <button
                type="button"
                onClick={() => setGuideOpen(true)}
                className="rounded-lg px-2 py-0.5 text-xs font-semibold text-navy ring-1 ring-black/10 hover:bg-stone-50"
              >
                Purchasing guide
              </button>
            )}
          </span>
        </div>
        {guideOpen && item.guide && (
          <Sheet
            title={`Buying ${item.name.toLowerCase()}`}
            onClose={() => setGuideOpen(false)}
          >
            <ul className="space-y-3">
              {item.guide.map((g) => (
                <li
                  key={g.label}
                  className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
                >
                  <p className="font-semibold text-navy">{g.label}</p>
                  <p className="mt-1 text-stone-700">{g.text}</p>
                </li>
              ))}
            </ul>
          </Sheet>
        )}
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
                  {OPTION_EMOJI[o.label] && (
                    <span aria-hidden className="mr-1">
                      {OPTION_EMOJI[o.label]}
                    </span>
                  )}
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
            {opt?.instructions !== undefined &&
              (opt.instructions ? (
                <a
                  href={opt.instructions}
                  {...(opt.instructions.startsWith("/")
                    ? {}
                    : { target: "_blank", rel: "noopener noreferrer" })}
                  className="mt-1 inline-block text-sm font-medium text-pink-ink hover:underline"
                >
                  {opt.instructions.startsWith("/")
                    ? "Print it with the sign splitter →"
                    : "Instructions ↗"}
                </a>
              ) : (
                <p className="mt-1 text-sm text-stone-400">
                  Instructions coming soon.
                </p>
              ))}
            {opt?.contactLead && (
              <button
                type="button"
                onClick={() => setContactOpen(true)}
                className="mt-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-navy ring-1 ring-black/10 hover:bg-stone-50"
              >
                Contact your Regional Support Lead
              </button>
            )}
            {contactOpen && opt?.contactLead && (
              <Sheet
                title={`${item.name} (${opt.label})`}
                onClose={() => setContactOpen(false)}
              >
                <p className="text-stone-700">{opt.contactLead}</p>
              </Sheet>
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
            {has && onOwned && owned && (
              <>
                <select
                  value={owned.condition ?? ""}
                  onChange={(e) =>
                    onOwned(opt, {
                      condition: (e.target.value || null) as Condition | null,
                    })
                  }
                  aria-label={`${item.name} condition`}
                  className={`rounded-lg bg-white px-2 py-0.5 text-sm ring-1 ring-black/10 ${
                    owned.condition === "needs_replacing"
                      ? "text-red-700"
                      : owned.condition
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
                <label className="flex items-center gap-1 text-sm text-stone-500">
                  Qty
                  <input
                    type="number"
                    min={1}
                    max={999}
                    inputMode="numeric"
                    defaultValue={owned.quantity}
                    key={owned.quantity}
                    onBlur={(e) => {
                      const n = Math.min(
                        999,
                        Math.max(1, Math.round(Number(e.target.value) || 1)),
                      );
                      if (n !== owned.quantity) onOwned(opt, { quantity: n });
                      else e.target.value = String(n);
                    }}
                    onKeyDown={(e) =>
                      e.key === "Enter" && (e.target as HTMLInputElement).blur()
                    }
                    aria-label={`How many ${item.name.toLowerCase()}`}
                    className="w-12 rounded-lg bg-white px-1.5 py-0.5 text-sm text-stone-700 ring-1 ring-black/10"
                  />
                </label>
              </>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
