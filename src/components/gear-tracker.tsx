"use client";

import { useEffect, useMemo, useState } from "react";
import { Sheet } from "@/components/sheet";
import { createClient } from "@/lib/supabase/client";
import { PhotoSlot } from "@/components/photo-slot";
import { CONDITIONS, type Condition } from "@/lib/resources";
import { shrink } from "@/components/photo-uploader";

type Gear = {
  id: string;
  name: string;
  notes: string | null;
  holder_person_id: string | null;
  holder_note: string | null;
  moved_at: string | null;
  model: string | null;
  source: string | null;
  condition: Condition | null;
  photo_path: string | null;
  quantity: number;
  guide_key: string | null;
};

const COLS =
  "id, name, notes, holder_person_id, holder_note, moved_at, model, source, condition, photo_path, quantity, guide_key";
type Details = Pick<
  Gear,
  "name" | "notes" | "model" | "source" | "condition" | "quantity"
>;
const isLink = (s: string) => /^https?:\/\//i.test(s.trim());
export type Person = {
  id: string;
  first_name: string;
  last_name: string | null;
};

export const full = (p: Person) =>
  [p.first_name, p.last_name].filter(Boolean).join(" ");
export const since = (iso: string) =>
  new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short" });

// Your community's kit and who has it right now.
export function GearTracker({
  teamId,
  version = 0,
  onChanged,
  guidePhotos = {},
}: {
  teamId: string;
  guidePhotos?: Record<string, string>; // recommended-list photos, by guide key
  version?: number; // bump to reload (e.g. after the guide adds something)
  onChanged?: () => void; // after adding, editing or removing gear
}) {
  const [gear, setGear] = useState<Gear[] | null>(null);
  const [photos, setPhotos] = useState<Record<string, string>>({}); // by gear id
  const [people, setPeople] = useState<Person[]>([]);
  const [adding, setAdding] = useState(false);
  const [moving, setMoving] = useState<Gear | null>(null);
  const [editing, setEditing] = useState<Gear | null>(null);

  useEffect(() => {
    const db = createClient();
    db.from("gear_items")
      .select(COLS)
      .eq("team_id", teamId)
      .order("name")
      .then(async ({ data }) => {
        const list = (data as Gear[]) ?? [];
        setGear(list);
        // Photos are private to the community: signed links, for an hour.
        const withPhoto = list.filter((g) => g.photo_path);
        if (!withPhoto.length) return setPhotos({});
        const { data: signed } = await db.storage
          .from("event-photos")
          .createSignedUrls(
            withPhoto.map((g) => g.photo_path!),
            3600,
          );
        const byPath = new Map(
          (signed ?? []).map((x) => [x.path, x.signedUrl]),
        );
        setPhotos(
          Object.fromEntries(
            withPhoto.map((g) => [g.id, byPath.get(g.photo_path!) ?? ""]),
          ),
        );
      });
    db.from("people")
      .select("id, first_name, last_name")
      .eq("team_id", teamId)
      .eq("is_test", false)
      .order("first_name")
      .then(({ data }) => setPeople((data as Person[]) ?? []));
  }, [teamId, version]);

  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  async function add(d: Details) {
    const { data, error: err } = await createClient()
      .from("gear_items")
      .insert({ team_id: teamId, ...d })
      .select(COLS)
      .single();
    if (err) return "Couldn't add that. Please try again.";
    setGear((g) =>
      [...(g ?? []), data as Gear].sort((a, b) => a.name.localeCompare(b.name)),
    );
    setAdding(false);
    onChanged?.();
    return "";
  }

  async function save(item: Gear, d: Details) {
    const { error: err } = await createClient()
      .from("gear_items")
      .update(d)
      .eq("id", item.id);
    if (err) return "Couldn't save that. Please try again.";
    setGear((g) =>
      (g ?? [])
        .map((x) => (x.id === item.id ? { ...x, ...d } : x))
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
    setEditing(null);
    onChanged?.();
    return "";
  }

  async function addPhoto(item: Gear, file: File) {
    const db = createClient();
    const { blob } = await shrink(file, 800);
    const path = `${teamId}/gear/${crypto.randomUUID()}.jpg`;
    const up = await db.storage
      .from("event-photos")
      .upload(path, blob, { contentType: "image/jpeg" });
    if (up.error) return false;
    const row = await db
      .from("gear_items")
      .update({ photo_path: path })
      .eq("id", item.id);
    if (row.error) return false;
    const { data } = await db.storage
      .from("event-photos")
      .createSignedUrl(path, 3600);
    setPhotos((p) => ({ ...p, [item.id]: data?.signedUrl ?? "" }));
    return true;
  }

  async function move(
    item: Gear,
    personId: string | null,
    note: string | null,
  ) {
    const patch = {
      holder_person_id: personId,
      holder_note: personId ? null : note,
      moved_at: new Date().toISOString(),
    };
    setGear((g) =>
      (g ?? []).map((x) => (x.id === item.id ? { ...x, ...patch } : x)),
    );
    setMoving(null);
    await createClient().from("gear_items").update(patch).eq("id", item.id);
  }

  async function remove(item: Gear) {
    setGear((g) => (g ?? []).filter((x) => x.id !== item.id));
    setMoving(null);
    await createClient().from("gear_items").delete().eq("id", item.id);
    onChanged?.();
  }

  return (
    <section id="gear" className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Your gear
        </h2>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-sm font-semibold text-pink-ink hover:underline"
          >
            + Add your own
          </button>
        )}
      </div>
      {adding && (
        <GearForm
          submitLabel="Add"
          onSubmit={add}
          onCancel={() => setAdding(false)}
        />
      )}
      {gear === null ? (
        <p className="text-sm text-stone-500">Loading…</p>
      ) : gear.length === 0 ? (
        !adding && (
          <p className="rounded-2xl border border-dashed border-stone-300 px-4 py-4 text-sm text-stone-500">
            Everything your community owns, including things that aren&apos;t on
            the list above (laptops, screens, gazebo…). Tick In community
            inventory on the list above, or Add your own, then keep track of who
            has each thing.
          </p>
        )
      ) : (
        <ul className="divide-y divide-black/5 rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          {gear.map((g) => {
            const holder = g.holder_person_id
              ? byId.get(g.holder_person_id)
              : null;
            const where = holder ? full(holder) : g.holder_note;
            return (
              <li key={g.id} className="flex items-center gap-3 px-4 py-3">
                <PhotoSlot
                  // Their own photo, or the recommended list's for that item.
                  photo={
                    photos[g.id] ||
                    (g.guide_key ? guidePhotos[g.guide_key] : null) ||
                    null
                  }
                  alt={g.name}
                  onUpload={(f) => addPhoto(g, f)}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-navy">
                    {g.name}
                    {g.quantity > 1 && (
                      <span className="ml-1 font-semibold text-pink-ink">
                        ×{g.quantity}
                      </span>
                    )}
                    {g.model && (
                      <span className="font-normal text-stone-500">
                        {" "}
                        · {g.model}
                      </span>
                    )}
                    {g.condition && g.condition !== "good" && (
                      <span
                        className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                          g.condition === "needs_replacing"
                            ? "bg-red-50 text-red-700"
                            : "bg-stone-100 text-stone-600"
                        }`}
                      >
                        {CONDITIONS.find((c) => c.id === g.condition)?.label}
                      </span>
                    )}
                  </p>
                  <p className="truncate text-sm text-stone-500">
                    {where ? (
                      <>
                        With <span className="text-stone-700">{where}</span>
                        {g.moved_at && ` since ${since(g.moved_at)}`}
                      </>
                    ) : (
                      "Nobody's marked as having it"
                    )}
                    {g.notes && ` · ${g.notes}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditing(g)}
                    className="rounded-xl px-2.5 py-1.5 text-sm font-medium text-stone-500 hover:bg-stone-50 hover:text-navy"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setMoving(g)}
                    className="rounded-xl px-3 py-1.5 text-sm font-semibold text-navy ring-1 ring-black/10 hover:bg-stone-50"
                  >
                    Location
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {moving && (
        <HandOver
          item={moving}
          people={people}
          onPick={(id, note) => move(moving, id, note)}
          onRemove={() => remove(moving)}
          onEdit={() => {
            setEditing(moving);
            setMoving(null);
          }}
          onClose={() => setMoving(null)}
        />
      )}
      {editing && (
        <Sheet title={`Edit ${editing.name}`} onClose={() => setEditing(null)}>
          <GearForm
            initial={editing}
            submitLabel="Save"
            onSubmit={(d) => save(editing, d)}
            onCancel={() => setEditing(null)}
          />
        </Sheet>
      )}
    </section>
  );
}

function HandOver({
  item,
  people,
  onPick,
  onRemove,
  onEdit,
  onClose,
}: {
  item: Gear;
  people: Person[];
  onPick: (personId: string | null, note: string | null) => void;
  onRemove: () => void;
  onEdit: () => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [place, setPlace] = useState("");
  const [sure, setSure] = useState(false);
  const shown = people
    .filter((p) => full(p).toLowerCase().includes(q.trim().toLowerCase()))
    .slice(0, 30);
  return (
    <Sheet title={`Where is the ${item.name}?`} onClose={onClose}>
      {(item.model || item.source || item.condition || item.notes) && (
        <div className="mb-3 space-y-0.5 text-sm text-stone-600">
          {item.model && <p>Model: {item.model}</p>}
          {item.condition && (
            <p>
              Condition:{" "}
              {CONDITIONS.find((c) => c.id === item.condition)?.label}
            </p>
          )}
          {item.source && (
            <p className="truncate">
              From:{" "}
              {isLink(item.source) ? (
                <a
                  href={item.source.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-navy underline"
                >
                  {item.source.trim().replace(/^https?:\/\/(www\.)?/i, "")}
                </a>
              ) : (
                item.source
              )}
            </p>
          )}
          {item.notes && <p>{item.notes}</p>}
        </div>
      )}
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search people"
        className="w-full rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-cyan"
      />
      <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto">
        {shown.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onPick(p.id, null)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white ${p.id === item.holder_person_id ? "bg-white font-semibold" : ""}`}
            >
              {full(p)}
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (place.trim()) onPick(null, place.trim());
        }}
      >
        <input
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          maxLength={100}
          placeholder="Or somewhere else, e.g. storage unit"
          className="min-w-0 flex-1 rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-cyan"
        />
        <button
          type="submit"
          className="rounded-xl bg-navy px-3 py-2 text-sm font-semibold text-white"
        >
          Save
        </button>
      </form>
      <div className="mt-5 border-t border-black/10 pt-3 text-sm">
        {sure ? (
          <span className="flex items-center gap-3">
            Remove {item.name} from the list?
            <button
              type="button"
              onClick={onRemove}
              className="font-semibold text-red-700 hover:underline"
            >
              Remove
            </button>
            <button
              type="button"
              onClick={() => setSure(false)}
              className="text-stone-500 hover:underline"
            >
              Keep
            </button>
          </span>
        ) : (
          <span className="flex items-center gap-4">
            <button
              type="button"
              onClick={onEdit}
              className="text-stone-500 hover:text-stone-800 hover:underline"
            >
              Edit details
            </button>
            <button
              type="button"
              onClick={() => setSure(true)}
              className="text-stone-500 hover:text-stone-800 hover:underline"
            >
              Remove this item
            </button>
          </span>
        )}
      </div>
    </Sheet>
  );
}

// Add or edit a piece of gear. Only the name is needed.
function GearForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Details;
  submitLabel: string;
  onSubmit: (d: Details) => Promise<string>; // "" when it worked, or an error
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [model, setModel] = useState(initial?.model ?? "");
  const [source, setSource] = useState(initial?.source ?? "");
  const [quantity, setQuantity] = useState(String(initial?.quantity ?? 1));
  const [condition, setCondition] = useState<Condition | "">(
    initial?.condition ?? "",
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const field =
    "w-full rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-cyan";

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim() || busy) return;
        setBusy(true);
        setError(
          await onSubmit({
            name: name.trim(),
            notes: notes.trim() || null,
            model: model.trim() || null,
            source: source.trim() || null,
            condition: condition || null,
            quantity: Math.min(
              999,
              Math.max(1, Math.round(Number(quantity) || 1)),
            ),
          }),
        );
        setBusy(false);
      }}
      className={
        initial
          ? "space-y-2"
          : "mb-3 space-y-2 rounded-2xl bg-white p-4 shadow-sm ring-2 ring-pink/50"
      }
    >
      <input
        autoFocus={!initial}
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={100}
        placeholder="What is it? e.g. Laptop 1, TV screen, Gazebo"
        className={field}
      />
      <div className="grid grid-cols-[1fr_1fr_4.5rem] gap-2">
        <input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          maxLength={100}
          placeholder="Model (optional)"
          className={`${field} min-w-0`}
        />
        <select
          value={condition}
          onChange={(e) => setCondition(e.target.value as Condition | "")}
          aria-label="Condition"
          className={`${field} min-w-0 ${condition ? "" : "text-stone-400"}`}
        >
          <option value="">Condition</option>
          {CONDITIONS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          max={999}
          inputMode="numeric"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          aria-label="How many"
          title="How many"
          className={`${field} min-w-0 px-2`}
        />
      </div>
      <input
        value={source}
        onChange={(e) => setSource(e.target.value)}
        maxLength={500}
        placeholder="Where it's from (optional), a link or a shop"
        className={field}
      />
      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        maxLength={500}
        placeholder="Notes (optional), e.g. charger in the blue bag"
        className={field}
      />
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-4 py-2 text-sm text-stone-600 hover:bg-black/5"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// Where a piece of kit is: one of the community's people, or somewhere else
// (e.g. a storage unit). Used on the equipment list's inventory items.
export function LocationSheet({
  name,
  people,
  personId,
  onPick,
  onClose,
}: {
  name: string;
  people: Person[];
  personId: string | null; // who has it now
  onPick: (personId: string | null, note: string | null) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [place, setPlace] = useState("");
  const shown = people
    .filter((p) => full(p).toLowerCase().includes(q.trim().toLowerCase()))
    .slice(0, 30);
  return (
    <Sheet title={`Who has the ${name.toLowerCase()}?`} onClose={onClose}>
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search people"
        className="w-full rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-cyan"
      />
      <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto">
        {shown.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onPick(p.id, null)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white ${p.id === personId ? "bg-white font-semibold" : ""}`}
            >
              {full(p)}
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (place.trim()) onPick(null, place.trim());
        }}
      >
        <input
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          maxLength={100}
          placeholder="Or somewhere else, e.g. storage unit"
          className="min-w-0 flex-1 rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-cyan"
        />
        <button
          type="submit"
          className="rounded-xl bg-navy px-3 py-2 text-sm font-semibold text-white"
        >
          Save
        </button>
      </form>
    </Sheet>
  );
}
