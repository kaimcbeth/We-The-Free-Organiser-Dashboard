"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import { GearTracker } from "@/components/gear-tracker";
import { EQUIPMENT_GUIDE, photoKey, type EquipmentItem } from "@/lib/resources";
import { shrink } from "@/components/photo-uploader";

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
  const [have, setHave] = useState<Set<string>>(new Set());
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

  async function removeFromInventory(item: EquipmentItem) {
    if (!teamId) return;
    setHave((h) => {
      const n = new Set(h);
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
  photos,
  onUpload,
}: {
  item: EquipmentItem;
  has: boolean;
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
          <label className="mt-2 flex w-fit cursor-pointer items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={has}
              onChange={(e) => onHave(opt, e.target.checked)}
              className="h-4 w-4 accent-navy"
            />
            In community inventory
          </label>
        )}
      </div>
    </li>
  );
}

// The photo beside an item. Staff (Regional Support Leads, God) can tap it to
// add or change the photo; everyone else just sees it (or nothing).
function PhotoSlot({
  photo,
  alt,
  href,
  onUpload,
}: {
  photo: string | null;
  alt: string;
  href: string;
  onUpload?: (file: File) => Promise<boolean>;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const box =
    "relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-black/10";
  // eslint-disable-next-line @next/next/no-img-element -- product photo
  const img = photo && (
    <img src={photo} alt={alt} className="h-full w-full object-contain" />
  );
  if (!onUpload)
    return photo ? (
      <a href={href} target="_blank" rel="noopener noreferrer" className={box}>
        {img}
      </a>
    ) : null;
  return (
    <label
      className={`${box} cursor-pointer ${photo ? "" : "border border-dashed border-stone-300 ring-0"}`}
      title={photo ? "Change photo" : "Add photo"}
    >
      <input
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setBusy(true);
          setFailed(!(await onUpload(f)));
          setBusy(false);
        }}
      />
      {img}
      {(!photo || busy || failed) && (
        <span
          className={`absolute inset-0 flex items-center justify-center px-1 text-center text-[10px] font-semibold ${photo ? "bg-white/80" : ""} ${failed ? "text-red-700" : "text-stone-500"}`}
        >
          {busy
            ? "Uploading…"
            : failed
              ? "Didn't work, try again"
              : "Add photo"}
        </span>
      )}
    </label>
  );
}
