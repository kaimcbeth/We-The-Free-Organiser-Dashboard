"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  LocationSheet,
  full,
  since,
  type Person,
} from "@/components/gear-tracker";
import {
  CONDITIONS,
  EQUIPMENT_GRANT,
  EQUIPMENT_GUIDE,
  PRICES_CHECKED,
  kitCost,
  matchedShort,
  photoKey,
  type Condition,
  type EquipmentItem,
} from "@/lib/resources";
import { shrink } from "@/components/photo-uploader";
import { PhotoSlot } from "@/components/photo-slot";
import { Sheet } from "@/components/sheet";
import { EquipmentOrderButton } from "@/components/equipment-order";

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
  newOrganiser = false,
  isGod = false,
}: {
  isGod?: boolean; // God Mode: can change the order of the list
  teamId: string | null;
  // New organisers building a kit see the base kit total and how-many
  // boxes (Kai, 11 Nov 2026: "only for new organisers view").
  newOrganiser?: boolean;
  canEditPhotos?: boolean; // Regional Support Leads and God Mode
}) {
  const stored = useSyncExternalStore(subscribe, readHidden, () => false);
  const [version, setVersion] = useState(0);
  // Guide items the community has, with the condition of (the first of) it.
  const [have, setHave] = useState<Map<string, Owned>>(new Map());
  // Which version (Budget / Best / DIY) each base kit item is showing, for
  // the kit total (Kai, 11 Nov 2026: for new organisers building a kit).
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [qtys, setQtys] = useState<Record<string, number>>({});
  // How many for the kit: base kit items start at their recommended number,
  // upgrades at 0 (added with + when building a new kit).
  const baseKeys = new Set(
    EQUIPMENT_GUIDE.flatMap((g) => g.items.map((i) => i.key)),
  );
  // Portable kit: no car to carry it (Kai, 11 Nov 2026). Some items become
  // essential or recommended, and items with a portable version start on it.
  const [portable, setPortable] = useState(false);
  const essential = (i: EquipmentItem) =>
    baseKeys.has(i.key) || (portable && i.portable === "essential");
  const suggestedItem = (i: EquipmentItem) =>
    !!i.recommended || (portable && i.portable === "recommended");
  const qtyOf = (i: EquipmentItem) =>
    qtys[i.key] ?? (essential(i) ? (i.kitQty ?? 1) : 0);
  const bump = () => setVersion((v) => v + 1);
  // The order God set (Kai, 11 Nov 2026); items not in it keep their code
  // order, after the ones that are.
  const [order, setOrder] = useState<string[]>([]);
  useEffect(() => {
    let live = true;
    createClient()
      .from("equipment_order")
      .select("item_key")
      .order("position")
      .then(({ data }) => {
        if (live) setOrder((data ?? []).map((r) => r.item_key as string));
      });
    return () => {
      live = false;
    };
  }, []);
  const sorted = (list: EquipmentItem[]) => {
    const at = (k: string) => {
      const n = order.indexOf(k);
      return n < 0 ? order.length : n;
    };
    return list
      .map((i, n) => ({ i, n }))
      .sort((a, b) => at(a.i.key) - at(b.i.key) || a.n - b.n)
      .map((x) => x.i);
  };
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
      .select(
        "guide_key, condition, quantity, holder_person_id, holder_note, moved_at",
      )
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
              holder_person_id: r.holder_person_id as string | null,
              holder_note: r.holder_note as string | null,
              moved_at: r.moved_at as string | null,
            });
        setHave(m);
      });
    return () => {
      live = false;
    };
  }, [teamId, version]);

  // The community's people, for where each piece of kit is.
  const [people, setPeople] = useState<Person[]>([]);
  useEffect(() => {
    if (!teamId) return;
    let live = true;
    createClient()
      .from("people")
      .select("id, first_name, last_name")
      .eq("team_id", teamId)
      .eq("is_test", false)
      .order("first_name")
      .then(({ data }) => live && setPeople((data as Person[]) ?? []));
    return () => {
      live = false;
    };
  }, [teamId]);

  async function add(item: EquipmentItem, opt: Option | undefined) {
    if (!teamId) return;
    const key = invKey(item, opt);
    setHave((h) => new Map(h).set(key, { ...EMPTY }));
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
      const now = h.get(key) ?? { ...EMPTY };
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

  // Places typed for any kit (e.g. "Storage unit"), offered for the rest.
  const places = [
    ...new Set(
      [...have.values()]
        .map((o) => o.holder_note?.trim())
        .filter((x): x is string => !!x),
    ),
  ].sort((a, b) => a.localeCompare(b));

  // An item counts as had if any version of it is in the inventory.
  const hasAny = (i: EquipmentItem) =>
    i.options ? i.options.some((o) => have.has(invKey(i, o))) : have.has(i.key);
  // The version a row starts on: the community's, else the portable one
  // for a portable kit, else the first.
  const startPick = (i: EquipmentItem) => {
    const p = portable ? (i.options ?? []).findIndex((o) => o.portable) : -1;
    return p >= 0 ? p : firstPick(i, have);
  };
  // Building a kit (new organiser, or none of the base kit yet).
  const buildingAny =
    newOrganiser ||
    (!!teamId && EQUIPMENT_GUIDE.some((g) => !g.items.some((i) => hasAny(i))));
  // Only an inventory to show if there's a community to keep one for, and
  // never hidden while building a kit (Kai, 11 Nov 2026).
  const hidden = !!teamId && stored && !buildingAny;

  return (
    <div className="space-y-6">
      {teamId && !buildingAny && (
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
        EQUIPMENT_GUIDE.map((g) => {
          // A new kit (new organiser, or nothing from the base kit yet): one
          // list, base kit first with an Essential pill (no ring, Kai 11 Nov), upgrades
          // after with 0 to start; all of it counts in the kit total (Kai,
          // 11 Nov 2026).
          const building =
            newOrganiser || (!!teamId && !g.items.some((i) => hasAny(i)));
          const row = (i: EquipmentItem, base: boolean) => (
            <EquipmentRow
              key={i.key}
              item={i}
              noAbout={base}
              hoverAbout={building}
              recommended={building && base}
              suggested={building && !base && suggestedItem(i)}
              portable={building && portable}
              pick={
                building || base ? (picks[i.key] ?? startPick(i)) : undefined
              }
              kitQty={
                building && (i.price || i.options?.some((o) => o.price))
                  ? qtyOf(i)
                  : undefined
              }
              onKitQty={(n) => setQtys((q) => ({ ...q, [i.key]: n }))}
              onPick={(n) => setPicks((p) => ({ ...p, [i.key]: n }))}
              inventory={have}
              onOwned={teamId ? (opt, c) => setOwned(i, opt, c) : undefined}
              onHave={
                teamId
                  ? (opt, on) =>
                      on ? add(i, opt) : removeFromInventory(i, opt)
                  : undefined
              }
              photos={photos}
              onUpload={canEditPhotos ? upload : undefined}
              people={people}
              places={places}
            />
          );
          return (
            <div key={g.area} className="space-y-6">
              <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
                {building && isGod && (
                  <div className="-mt-1 mb-2 text-right">
                    <EquipmentOrderButton
                      items={sorted([...g.items, ...g.upgrades]).map((i) => ({
                        key: i.key,
                        name: i.name,
                        essential: essential(i),
                      }))}
                      onSaved={setOrder}
                    />
                  </div>
                )}
                {/* No "Equipment · Australia" heading while building a kit
                    (Kai, 11 Nov 2026): the Build Your Kit box leads. */}
                {!building && (
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
                )}
                {building && (
                  <div>
                    <HoverDetails text="For communities without a car, or carrying the kit on public transport.">
                      <button
                        type="button"
                        aria-pressed={portable}
                        onClick={(e) => {
                          e.currentTarget.blur(); // closes the pop-up
                          setPortable(!portable);
                          // Start the items it changes again from the new
                          // defaults.
                          const keys = [...g.items, ...g.upgrades]
                            .filter(
                              (i) =>
                                i.portable ||
                                i.options?.some((x) => x.portable),
                            )
                            .map((i) => i.key);
                          const drop = <T,>(r: Record<string, T>) =>
                            Object.fromEntries(
                              Object.entries(r).filter(
                                ([k]) => !keys.includes(k),
                              ),
                            );
                          setQtys(drop);
                          setPicks(drop);
                        }}
                        className={`rounded-full px-3.5 py-1 text-sm font-semibold ring-1 ${portable ? "bg-navy text-white ring-navy" : "bg-white text-navy ring-black/15 hover:ring-navy"}`}
                      >
                        Portable kit
                      </button>
                    </HoverDetails>
                  </div>
                )}
                {building && (
                  <KitTotal
                    items={[...g.items, ...g.upgrades]}
                    pickOf={(i) => picks[i.key] ?? startPick(i)}
                    qtyOf={qtyOf}
                  />
                )}
                <ul className="mt-2 divide-y divide-black/5">
                  {building
                    ? sorted([...g.items, ...g.upgrades]).map((i) =>
                        row(i, essential(i)),
                      )
                    : sorted(g.items).map((i) => row(i, true))}
                </ul>
              </section>
              {!building && g.upgrades.length > 0 && (
                <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
                  <h2 className="font-semibold">Upgrades</h2>
                  <p className="text-sm text-stone-500">
                    Nice to have once the base kit is sorted.
                  </p>
                  <ul className="mt-1 divide-y divide-black/5">
                    {sorted(g.upgrades).map((i) => row(i, false))}
                  </ul>
                </section>
              )}
            </div>
          );
        })}
      {!hidden && (
        <p className="-mt-3 text-xs text-stone-500">
          Prices are from each shop&apos;s listing on {PRICES_CHECKED},
          including GST but not shipping. They change, so check before you buy.
        </p>
      )}
    </div>
  );
}

type Option = NonNullable<EquipmentItem["options"]>[number];
type Owned = {
  condition: Condition | null;
  quantity: number;
  holder_person_id: string | null; // who has it
  holder_note: string | null; // ...or where it is (e.g. storage unit)
  moved_at: string | null;
};
const EMPTY: Owned = {
  condition: null,
  quantity: 1,
  holder_person_id: null,
  holder_note: null,
  moved_at: null,
};

// Which inventory entry: the item, or one version of it (Budget and Best are
// tracked separately), e.g. "a_frame:budget".
// The version a row opens on: the one the community has, else the first.
function firstPick(item: EquipmentItem, inventory: Map<string, Owned>) {
  return Math.max(
    0,
    (item.options ?? []).findIndex((o) => inventory.has(invKey(item, o))),
  );
}

// The height of the page's sticky header (if any), kept up to date.
function readHeader() {
  const h = document.querySelector("header");
  return h && getComputedStyle(h).position === "sticky" ? h.offsetHeight : 0;
}
function subscribeHeader(cb: () => void) {
  const h = document.querySelector("header");
  const ro = h ? new ResizeObserver(cb) : null;
  if (h) ro?.observe(h);
  window.addEventListener("resize", cb);
  return () => {
    ro?.disconnect();
    window.removeEventListener("resize", cb);
  };
}

// The base kit's cost with the versions showing below, for new organisers.
function KitTotal({
  items,
  pickOf,
  qtyOf,
}: {
  items: EquipmentItem[];
  pickOf: (i: EquipmentItem) => number;
  qtyOf: (i: EquipmentItem) => number;
}) {
  let total = 0;
  const unpriced: string[] = [];
  for (const i of items) {
    const opt = i.options?.[pickOf(i)];
    const n = qtyOf(i);
    if (n === 0) continue;
    const c = kitCost(i, opt, n);
    if (c === null)
      unpriced.push(
        opt
          ? `${opt.label.toLowerCase()} ${i.name.toLowerCase()}`
          : i.name.toLowerCase(),
      );
    else total += c;
  }

  const money = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;
  const gap = total - EQUIPMENT_GRANT; // > 0: to cover; < 0: left over
  // Stays on screen under the app's header while scrolling the list (Kai,
  // 11 Nov 2026).
  const headerHeight = useSyncExternalStore(
    subscribeHeader,
    readHeader,
    () => 0,
  );
  return (
    <div
      className="sticky z-[5] mt-2 rounded-xl bg-navy px-3.5 py-3 text-white shadow-lg"
      style={{ top: headerHeight + 8 }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="leading-snug">
          <span className="block font-semibold">Build Your Kit</span>
          <span className="mt-0.5 block text-xs text-white/70">
            Hover over an item&apos;s name or picture to get more details.
          </span>
        </p>
        <p className="shrink-0 text-right leading-tight">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-pink">
            Kit total
          </span>
          <span className="text-xl font-semibold tabular-nums">
            ~{money(total)}
          </span>
          {unpriced.length > 0 && (
            <span className="block text-[11px] text-white/60">
              + {unpriced.join(", ")} (no price yet)
            </span>
          )}
        </p>
      </div>
      <div className="mt-2.5 border-t border-white/15 pt-2.5">
        <div className="flex items-baseline justify-between text-xs text-white/75">
          <span>Grant used</span>
          <span className="tabular-nums">
            <b className="font-semibold text-white">
              {money(Math.min(total, EQUIPMENT_GRANT))}
            </b>{" "}
            of {money(EQUIPMENT_GRANT)}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Equipment grant used"
          aria-valuemin={0}
          aria-valuemax={EQUIPMENT_GRANT}
          aria-valuenow={Math.round(Math.min(total, EQUIPMENT_GRANT))}
          className="mt-1 h-2.5 overflow-hidden rounded-full bg-white/15"
        >
          <div
            className={`h-full rounded-full transition-all ${gap > 0 ? "bg-pink" : "bg-cyan"}`}
            style={{
              width: `${Math.min(100, (total / EQUIPMENT_GRANT) * 100)}%`,
            }}
          />
        </div>
      </div>
      <dl className="mt-2 space-y-1 text-sm tabular-nums">
        {gap <= 0 ? (
          <div className="flex justify-between gap-3">
            <dt className="font-semibold text-cyan">
              Left over from the grant
            </dt>
            <dd className="font-semibold text-cyan">{money(-gap)}</dd>
          </div>
        ) : (
          <>
            <div className="flex justify-between gap-3">
              <dt className="text-white/75">You cover (without sponsorship)</dt>
              <dd className="font-semibold">{money(gap)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-white/75">
                You cover (with the 2× sponsorship match)
              </dt>
              <dd className="font-semibold text-pink">{money(gap / 2)}</dd>
            </div>
            <p className="pt-0.5 text-[11px] leading-snug text-white/55">
              Raise it as a local recurring sponsorship (you can sponsor your
              own community) and We The Free matches it 2 for 1.
            </p>
          </>
        )}
      </dl>
    </div>
  );
}

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
  people = [],
  places = [],
  matched = false,
  onPick,
  pick: pickProp,
  kitQty,
  onKitQty,
  noAbout = false,
  hoverAbout = false,
  recommended = false,
  suggested = false,
  portable = false,
}: {
  // Portable kit: only the portable version, when the item has one (Kai,
  // 11 Nov 2026: no budget table in portable mode).
  portable?: boolean;
  suggested?: boolean; // new kit: a recommended upgrade, cyan pill
  // Building a kit: details only when hovering over the name (Kai, 11 Nov).
  hoverAbout?: boolean;
  recommended?: boolean; // new kit: base kit item, Essential pill
  noAbout?: boolean; // base kit: no description line under the name
  kitQty?: number; // building a kit: how many to get (undefined = hidden)
  onKitQty?: (n: number) => void;
  pick?: number;
  onPick?: (n: number) => void; // the Budget / Best toggle changed
  matched?: boolean; // also show the 2x fundraising match price
  people?: Person[]; // the community's people (for where it is)
  places?: string[]; // places typed before for any kit
  item: EquipmentItem;
  inventory: Map<string, Owned>; // what the community has, by inventory key
  onOwned?: (opt: Option | undefined, change: Partial<Owned>) => void;
  onHave?: (opt: Option | undefined, on: boolean) => void;
  photos: Record<string, string>; // uploaded, by photo key
  onUpload?: (key: string, file: File) => Promise<boolean>; // staff only
}) {
  // Open on the version the community has, else the first.
  const [ownPick, setPick] = useState(() => firstPick(item, inventory));
  const pick = pickProp ?? ownPick; // base kit: the page keeps it (kit total)
  const [guideOpen, setGuideOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  // DIY versions: how to make it (and the sign splitter) in a Purchasing
  // guide pop-up, not on the row (Kai, 11 Nov 2026).
  const [diyOpen, setDiyOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  // Hovering over the photo opens the details too (Kai, 11 Nov 2026).
  const [photoHover, setPhotoHover] = useState(false);
  const opt = item.options?.[pick];
  // Items with a purchasing guide keep their shop link inside the guide
  // (Kai, 11 Nov 2026): read it before buying.
  const hasGuide = !!item.guide && opt?.instructions === undefined;
  const onlyPortable = portable && !!item.options?.some((o) => o.portable);
  const shopUrl = opt?.url ?? item.url;
  const url = hasGuide ? undefined : shopUrl;
  const key = photoKey(item.key, opt);
  const owned = inventory.get(invKey(item, opt)) ?? null;
  const has = !!owned;
  const photo = photos[key] ?? opt?.image ?? item.image ?? null;
  const name = url ? (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-navy hover:underline"
    >
      {item.name}
    </a>
  ) : (
    <span className="font-medium text-navy">{item.name}</span>
  );
  return (
    <li id={`item-${item.key}`} className="flex scroll-mt-32 gap-3 py-2.5">
      <div
        className="shrink-0"
        onMouseEnter={hoverAbout ? () => setPhotoHover(true) : undefined}
        onMouseLeave={hoverAbout ? () => setPhotoHover(false) : undefined}
      >
        <PhotoSlot
          key={key}
          photo={photo}
          alt={opt?.product ?? item.name}
          href={url}
          onUpload={onUpload ? (f) => onUpload(key, f) : undefined}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <span>
            <span className="flex flex-wrap items-center gap-x-2">
              {hoverAbout ? (
                <HoverDetails
                  open={photoHover}
                  text={[item.about, opt?.about].filter(Boolean).join(" ")}
                >
                  {name}
                </HoverDetails>
              ) : (
                name
              )}
              {recommended && (
                <span className="rounded-full bg-pink px-2 py-0.5 text-[11px] font-semibold text-navy">
                  Essential
                </span>
              )}
              {suggested && (
                <span className="rounded-full bg-cyan px-2 py-0.5 text-[11px] font-semibold text-navy">
                  Recommended
                </span>
              )}
            </span>
            {!noAbout && !hoverAbout && (
              <span className="block text-sm text-stone-600">{item.about}</span>
            )}
            {((opt ? opt.price : item.price) ||
              (kitQty !== undefined && onKitQty)) && (
              <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-navy">
                {opt ? opt.price : item.price}
                {matched && (
                  <span
                    className="text-pink-ink"
                    title="With the 2× local fundraising match"
                  >
                    {matchedShort((opt ? opt.price : item.price) ?? "")}
                  </span>
                )}
                {kitQty !== undefined && onKitQty && (
                  <span
                    className="inline-flex items-center rounded-full font-normal ring-1 ring-black/10"
                    title="How many for your kit"
                  >
                    <button
                      type="button"
                      aria-label={`One less ${item.name}`}
                      onClick={() => onKitQty(Math.max(0, kitQty - 1))}
                      className="h-7 w-7 rounded-l-full text-base font-semibold text-navy hover:bg-stone-100"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-semibold tabular-nums text-navy">
                      {kitQty}
                    </span>
                    <button
                      type="button"
                      aria-label={`One more ${item.name}`}
                      onClick={() => onKitQty(Math.min(50, kitQty + 1))}
                      className="h-7 w-7 rounded-r-full text-base font-semibold text-navy hover:bg-stone-100"
                    >
                      +
                    </button>
                  </span>
                )}
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
            {/* Get it from the RSL: the same Purchasing guide button, its
                pop-up says to ask them (Kai, 11 Nov 2026). */}
            {opt?.instructions !== undefined && (
              <button
                type="button"
                onClick={() => setDiyOpen(true)}
                className="rounded-lg px-2 py-0.5 text-xs font-semibold text-navy ring-1 ring-black/10 hover:bg-stone-50"
              >
                Purchasing guide
              </button>
            )}
            {opt?.contactLead && (
              <button
                type="button"
                onClick={() => setContactOpen(true)}
                className="rounded-lg px-2 py-0.5 text-xs font-semibold text-navy ring-1 ring-black/10 hover:bg-stone-50"
              >
                Purchasing guide
              </button>
            )}
            {hasGuide && (
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
            {item.steps && (
              <ol className="mb-3 space-y-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
                {item.steps.map((step, n) => (
                  <li key={n} className="flex gap-3 text-stone-700">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white">
                      {n + 1}
                    </span>
                    <span className="relative pt-0.5">
                      <StepText
                        text={typeof step === "string" ? step : step.text}
                        onJump={() => setGuideOpen(false)}
                        tip={
                          typeof step !== "string" && step.note ? (
                            <StepText
                              text={step.note}
                              onJump={() => setGuideOpen(false)}
                            />
                          ) : undefined
                        }
                      />
                      {typeof step !== "string" && step.sub && (
                        <ul className="mt-1.5 list-disc space-y-1 pl-5 marker:text-stone-400">
                          {step.sub.map((sub) =>
                            typeof sub === "string" ? (
                              <li key={sub}>
                                <StepText
                                  text={sub}
                                  onJump={() => setGuideOpen(false)}
                                />
                              </li>
                            ) : "text" in sub ? (
                              <li key={sub.text} className="relative">
                                <StepText
                                  text={sub.text}
                                  onJump={() => setGuideOpen(false)}
                                  tip={sub.note}
                                />
                              </li>
                            ) : (
                              <li
                                key={sub.label}
                                className="-ml-5 flex list-none items-center gap-2"
                              >
                                <ul className="list-disc space-y-1 pl-5 marker:text-stone-400">
                                  {sub.group.map((g) => (
                                    <li key={g}>{g}</li>
                                  ))}
                                </ul>
                                <span
                                  aria-hidden
                                  className="w-2 self-stretch rounded-r-md border-y-2 border-r-2 border-stone-300"
                                />
                                <span className="text-sm text-stone-500">
                                  ({sub.label})
                                </span>
                              </li>
                            ),
                          )}
                        </ul>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            )}
            <ul className="space-y-3">
              {item.guide.map((g) => (
                <li
                  key={g.label}
                  className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
                >
                  <p className="font-semibold text-navy">{g.label}</p>
                  <p className="mt-1 text-stone-700">
                    <StepText
                      text={g.text}
                      onJump={() => setGuideOpen(false)}
                    />
                  </p>
                </li>
              ))}
            </ul>
            {shopUrl && (
              <a
                href={shopUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block rounded-full bg-pink px-4 py-2 text-sm font-semibold text-navy hover:bg-pink/90"
              >
                {opt
                  ? `Buy the ${opt.label.toLowerCase()} one from ${opt.shop ?? item.shop}`
                  : `Buy from ${item.shop}`}{" "}
                ↗
              </a>
            )}
          </Sheet>
        )}
        {item.options && (
          <div className="mt-2">
            <div
              role="tablist"
              aria-label={`${item.name} options`}
              className={`${onlyPortable ? "hidden" : "inline-flex"} rounded-full bg-stone-100 p-0.5`}
            >
              {item.options.map((o, n) => (
                <button
                  key={o.label}
                  type="button"
                  role="tab"
                  aria-selected={pick === n}
                  onClick={() => {
                    setPick(n);
                    onPick?.(n);
                  }}
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
            {opt && !hoverAbout && (
              <p className="mt-1 text-sm text-stone-600">
                {/* Product name left off (Kai, 11 Nov); the photo and shop
                    link still go to it. */}
                {opt.about}
              </p>
            )}
            {diyOpen && opt?.instructions !== undefined && (
              <Sheet
                title={`Making ${item.name.toLowerCase()} (${opt.label})`}
                onClose={() => setDiyOpen(false)}
              >
                <p className="text-stone-700">{opt.about}</p>
                {opt.instructions ? (
                  <a
                    href={opt.instructions}
                    {...(opt.instructions.startsWith("/")
                      ? {}
                      : { target: "_blank", rel: "noopener noreferrer" })}
                    className="mt-4 inline-block rounded-full bg-pink px-4 py-2 text-sm font-semibold text-navy hover:bg-pink/90"
                  >
                    {opt.instructions.startsWith("/")
                      ? "Print it with the sign splitter →"
                      : "Instructions ↗"}
                  </a>
                ) : (
                  <p className="mt-3 text-sm text-stone-400">
                    Instructions coming soon.
                  </p>
                )}
              </Sheet>
            )}
            {contactOpen && opt?.contactLead && (
              <Sheet
                title={`Buying ${item.name.toLowerCase()} (${opt.label})`}
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
        {onHave && has && onOwned && owned && (
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-stone-500">
            {(() => {
              const holder = owned.holder_person_id
                ? people.find((p) => p.id === owned.holder_person_id)
                : null;
              const where = holder ? full(holder) : owned.holder_note;
              return where ? (
                <span>
                  With <span className="text-stone-700">{where}</span>
                  {owned.moved_at && ` since ${since(owned.moved_at)}`}
                </span>
              ) : (
                <span>Nobody&apos;s marked as having it</span>
              );
            })()}
            <button
              type="button"
              onClick={() => setLocating(true)}
              className="rounded-lg px-2 py-0.5 text-xs font-semibold text-navy ring-1 ring-black/10 hover:bg-stone-50"
            >
              Location
            </button>
          </p>
        )}
        {locating && onOwned && (
          <LocationSheet
            name={item.name}
            people={people}
            places={places}
            personId={owned?.holder_person_id ?? null}
            note={owned?.holder_note ?? null}
            onPick={(personId, note) => {
              setLocating(false);
              onOwned(opt, {
                holder_person_id: personId,
                holder_note: personId ? null : note,
                moved_at: new Date().toISOString(),
              });
            }}
            onClose={() => setLocating(false)}
          />
        )}
      </div>
    </li>
  );
}

// The item's details in a small pop-up when hovering over (or tabbing to)
// its name, for the Build Your Kit list (Kai, 11 Nov 2026).
function HoverDetails({
  text,
  open = false,
  children,
}: {
  text: string;
  open?: boolean; // shown anyway (e.g. hovering over the photo)
  children: React.ReactNode;
}) {
  if (!text) return <>{children}</>;
  return (
    <span className="group/details relative inline-block">
      <span className="cursor-help">{children}</span>
      <span
        role="tooltip"
        className={`pointer-events-none absolute left-0 top-full z-20 mt-1.5 w-72 max-w-[80vw] rounded-lg bg-navy px-3 py-2 text-sm font-normal leading-snug text-white shadow-lg transition-opacity group-focus-within/details:visible group-focus-within/details:opacity-100 group-hover/details:visible group-hover/details:opacity-100 ${open ? "visible opacity-100" : "invisible opacity-0"}`}
      >
        {text}
      </span>
    </span>
  );
}

// "[text](url)" in a purchasing guide step becomes a link.
// "#item-<key>" links close the pop-up and scroll to that item, with a
// short pink glow so it's easy to spot.
function jumpTo(hash: string) {
  window.setTimeout(() => {
    const el = document.getElementById(hash.slice(1));
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("rounded-xl", "ring-2", "ring-pink", "bg-pink/10");
    window.setTimeout(
      () => el.classList.remove("ring-2", "ring-pink", "bg-pink/10"),
      2500,
    );
  }, 50);
}

// With a tip, the bold words are highlighted and show the tip in a yellow
// box on hover (or tap, on phones) (Kai, 12 Nov 2026). The box spans the
// nearest positioned parent (the step, or the sub-point) so it never runs
// off a phone screen.
function StepText({
  text,
  onJump,
  tip,
}: {
  text: string;
  onJump?: () => void;
  tip?: React.ReactNode;
}) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*)/);
  return (
    <>
      {parts.map((p, i) => {
        const bold = p.match(/^\*\*([^*]+)\*\*$/);
        if (bold && tip)
          return (
            <span key={i} tabIndex={0} className="group outline-none">
              <strong className="cursor-help rounded bg-yellow-100 px-1 font-semibold text-navy ring-1 ring-yellow-300">
                {bold[1]}
              </strong>
              <span className="invisible absolute inset-x-0 top-full z-20 pt-1.5 opacity-0 transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                <span className="block rounded-xl bg-yellow-100 px-3 py-2 text-sm font-normal text-stone-800 shadow-md ring-1 ring-yellow-300">
                  {tip}
                </span>
              </span>
            </span>
          );
        if (bold)
          return (
            <strong key={i} className="font-semibold text-navy">
              {bold[1]}
            </strong>
          );
        const m = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (m && m[2].startsWith("#"))
          return (
            <a
              key={i}
              href={m[2]}
              onClick={(e) => {
                e.preventDefault();
                onJump?.();
                jumpTo(m[2]);
              }}
              className="font-semibold text-navy underline hover:text-pink"
            >
              {m[1]}
            </a>
          );
        return m ? (
          <a
            key={i}
            href={m[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-navy underline hover:text-pink"
          >
            {m[1]}
          </a>
        ) : (
          p
        );
      })}
    </>
  );
}
