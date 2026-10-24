"use client";

import { useEffect, useMemo, useState } from "react";
import { Sheet } from "@/components/sheet";
import { createClient } from "@/lib/supabase/client";

type Gear = {
  id: string;
  name: string;
  notes: string | null;
  holder_person_id: string | null;
  holder_note: string | null;
  moved_at: string | null;
};
type Person = { id: string; first_name: string; last_name: string | null };

const full = (p: Person) =>
  [p.first_name, p.last_name].filter(Boolean).join(" ");
const since = (iso: string) =>
  new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short" });

// Your community's kit and who has it right now.
export function GearTracker({ teamId }: { teamId: string }) {
  const [gear, setGear] = useState<Gear[] | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [moving, setMoving] = useState<Gear | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const db = createClient();
    db.from("gear_items")
      .select("id, name, notes, holder_person_id, holder_note, moved_at")
      .eq("team_id", teamId)
      .order("name")
      .then(({ data }) => setGear((data as Gear[]) ?? []));
    db.from("people")
      .select("id, first_name, last_name")
      .eq("team_id", teamId)
      .eq("is_test", false)
      .order("first_name")
      .then(({ data }) => setPeople((data as Person[]) ?? []));
  }, [teamId]);

  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return;
    const { data, error: err } = await createClient()
      .from("gear_items")
      .insert({
        team_id: teamId,
        name: name.trim(),
        notes: notes.trim() || null,
      })
      .select("id, name, notes, holder_person_id, holder_note, moved_at")
      .single();
    if (err) return setError("Couldn't add that. Please try again.");
    setGear((g) =>
      [...(g ?? []), data as Gear].sort((a, b) => a.name.localeCompare(b.name)),
    );
    setName("");
    setNotes("");
    setAdding(false);
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
  }

  return (
    <section id="gear" className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Gear
        </h2>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-sm font-semibold text-pink-ink hover:underline"
          >
            + Add gear
          </button>
        )}
      </div>
      {adding && (
        <form
          onSubmit={add}
          className="mb-3 space-y-2 rounded-2xl bg-white p-4 shadow-sm ring-2 ring-pink/50"
        >
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            placeholder="What is it? e.g. Laptop 1, TV screen, Gazebo"
            className="w-full rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-cyan"
          />
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            placeholder="Notes (optional), e.g. charger in the blue bag"
            className="w-full rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-cyan"
          />
          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="rounded-xl px-4 py-2 text-sm text-stone-600 hover:bg-black/5"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {gear === null ? (
        <p className="text-sm text-stone-500">Loading…</p>
      ) : gear.length === 0 ? (
        !adding && (
          <p className="rounded-2xl border border-dashed border-stone-300 px-4 py-4 text-sm text-stone-500">
            Add your community&apos;s kit (laptops, screens, gazebo, signs) and
            keep track of who has each thing.
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
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-navy">{g.name}</p>
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
                <button
                  type="button"
                  onClick={() => setMoving(g)}
                  className="shrink-0 rounded-xl px-3 py-1.5 text-sm font-semibold text-navy ring-1 ring-black/10 hover:bg-stone-50"
                >
                  Handed to…
                </button>
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
          onClose={() => setMoving(null)}
        />
      )}
    </section>
  );
}

function HandOver({
  item,
  people,
  onPick,
  onRemove,
  onClose,
}: {
  item: Gear;
  people: Person[];
  onPick: (personId: string | null, note: string | null) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [place, setPlace] = useState("");
  const [sure, setSure] = useState(false);
  const shown = people
    .filter((p) => full(p).toLowerCase().includes(q.trim().toLowerCase()))
    .slice(0, 30);
  return (
    <Sheet title={`Who has the ${item.name}?`} onClose={onClose}>
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
          <button
            type="button"
            onClick={() => setSure(true)}
            className="text-stone-500 hover:text-stone-800 hover:underline"
          >
            Remove this item
          </button>
        )}
      </div>
    </Sheet>
  );
}
