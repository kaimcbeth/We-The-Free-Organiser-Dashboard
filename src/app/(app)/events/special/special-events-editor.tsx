"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sheet } from "@/components/sheet";
import { MONTHS, shortDate, type SpecialEvent } from "@/lib/special-events";

type Row = SpecialEvent & { on_date: string | null; on_board: string[] };
type Region = { id: string; name: string };

const input =
  "w-full rounded-lg bg-white px-2.5 py-1.5 text-sm ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-cyan";

export function SpecialEventsEditor({
  events,
  regions,
  isGod,
  myRegion,
}: {
  events: Row[];
  regions: Region[];
  isGod: boolean;
  myRegion: string | null;
}) {
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const regionName = (ids: string[] | null) =>
    !ids
      ? "Worldwide"
      : ids
          .map((id) => regions.find((r) => r.id === id)?.name ?? "?")
          .join(", ");
  const canEdit = (e: SpecialEvent) =>
    isGod ||
    (!!myRegion && e.region_ids?.length === 1 && e.region_ids[0] === myRegion);

  return (
    <div className="space-y-3">
      {events.length === 0 && (
        <p className="text-sm text-stone-500">No special events yet.</p>
      )}
      {events.map((e) => (
        <div
          key={e.id}
          className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold">{e.name}</p>
              <p className="text-sm text-stone-500">
                {e.month && e.day
                  ? `${e.day} ${MONTHS[e.month - 1]} every year`
                  : e.next_date
                    ? shortDate(e.next_date)
                    : "No date set"}{" "}
                · suggested {Math.round(e.lead_days / 7)} weeks before ·{" "}
                {regionName(e.region_ids)}
              </p>
            </div>
            {canEdit(e) ? (
              <button
                type="button"
                onClick={() => setEditing(e)}
                className="shrink-0 rounded-lg px-2.5 py-1 text-sm text-stone-500 ring-1 ring-black/10 hover:bg-stone-50"
              >
                Edit
              </button>
            ) : (
              <span className="shrink-0 text-xs text-stone-400">
                Set by We The Free
              </span>
            )}
          </div>
          {e.blurb && <p className="mt-2 text-sm text-stone-600">{e.blurb}</p>}
          {e.on_date && (
            <p className="mt-2 text-xs text-stone-500">
              {e.on_board.length === 0
                ? `No teams on board for ${e.on_date.slice(0, 4)} yet.`
                : `On board for ${e.on_date.slice(0, 4)}: ${e.on_board
                    .map((n) => n.replace(/, [^,]+$/, ""))
                    .join(", ")}`}
            </p>
          )}
        </div>
      ))}
      {(isGod || myRegion) && (
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="rounded-xl bg-pink px-4 py-2.5 text-sm font-semibold text-navy hover:bg-pink-strong"
        >
          Add special event
        </button>
      )}
      {editing && (
        <EditSheet
          key={editing === "new" ? "new" : editing.id}
          event={editing === "new" ? null : editing}
          regions={regions}
          isGod={isGod}
          myRegion={myRegion}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function EditSheet({
  event: e,
  regions,
  isGod,
  myRegion,
  onClose,
}: {
  event: Row | null;
  regions: Region[];
  isGod: boolean;
  myRegion: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState(e?.name ?? "");
  const [blurb, setBlurb] = useState(e?.blurb ?? "");
  const [link, setLink] = useState(e?.link ?? "");
  const [yearly, setYearly] = useState(e ? !!e.month : true);
  const [month, setMonth] = useState(e?.month ?? 1);
  const [day, setDay] = useState(e?.day ?? 1);
  const [date, setDate] = useState(e?.next_date ?? "");
  const [weeks, setWeeks] = useState(e ? Math.round(e.lead_days / 7) : 6);
  const [where, setWhere] = useState<string[] | null>(
    isGod ? (e?.region_ids ?? null) : myRegion ? [myRegion] : null,
  );

  const save = () => {
    setError("");
    if (!name.trim()) return setError("Give it a name.");
    if (!yearly && !date) return setError("Pick the date.");
    if (where && where.length === 0)
      return setError("Pick at least one region, or Worldwide.");
    const row = {
      name: name.trim(),
      blurb: blurb.trim() || null,
      link: link.trim() || null,
      month: yearly ? month : null,
      day: yearly ? day : null,
      next_date: yearly ? null : date,
      lead_days: Math.min(180, Math.max(1, weeks * 7)),
      region_ids: where,
    };
    start(async () => {
      const supabase = createClient();
      const { error } = e
        ? await supabase.from("special_events").update(row).eq("id", e.id)
        : await supabase.from("special_events").insert(row);
      if (error) return setError("Couldn't save that. Try again?");
      onClose();
      router.refresh();
    });
  };
  const remove = () =>
    start(async () => {
      const { error } = await createClient()
        .from("special_events")
        .delete()
        .eq("id", e!.id);
      if (error) return setError("Couldn't remove it. Try again?");
      onClose();
      router.refresh();
    });

  return (
    <Sheet
      title={e ? "Edit special event" : "Add special event"}
      onClose={onClose}
    >
      <div className="space-y-3">
        <label className="block text-sm">
          <span className="font-medium">Name</span>
          <input
            value={name}
            onChange={(v) => setName(v.target.value)}
            placeholder="Halloween Movie Challenge"
            className={`mt-1 ${input}`}
          />
        </label>
        <div className="text-sm">
          <span className="font-medium">Date</span>
          <div className="mt-1 flex gap-4">
            {[
              { v: true, label: "Same date every year" },
              { v: false, label: "Set each year" },
            ].map((o) => (
              <label key={o.label} className="flex items-center gap-1.5">
                <input
                  type="radio"
                  checked={yearly === o.v}
                  onChange={() => setYearly(o.v)}
                />
                {o.label}
              </label>
            ))}
          </div>
          {yearly ? (
            <div className="mt-2 flex gap-2">
              <select
                value={day}
                onChange={(v) => setDay(Number(v.target.value))}
                className={`${input.replace("w-full", "")} w-20`}
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
              <select
                value={month}
                onChange={(v) => setMonth(Number(v.target.value))}
                className={input}
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <input
              type="date"
              value={date}
              onChange={(v) => setDate(v.target.value)}
              className={`mt-2 ${input}`}
            />
          )}
        </div>
        <label className="block text-sm">
          <span className="font-medium">Suggest it</span>
          <span className="mt-1 flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={25}
              value={weeks}
              onChange={(v) => setWeeks(Number(v.target.value) || 1)}
              className={`${input.replace("w-full", "")} w-20`}
            />
            weeks before
          </span>
        </label>
        <label className="block text-sm">
          <span className="font-medium">Short blurb</span>
          <textarea
            value={blurb}
            onChange={(v) => setBlurb(v.target.value)}
            rows={2}
            placeholder="One or two lines on the idea"
            className={`mt-1 ${input}`}
          />
        </label>
        <div className="text-sm">
          <span className="font-medium">Where</span>
          {isGod ? (
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={where === null}
                  onChange={(v) => setWhere(v.target.checked ? null : [])}
                />
                Worldwide
              </label>
              {regions.map((r) => (
                <label key={r.id} className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={!!where?.includes(r.id)}
                    onChange={(v) =>
                      setWhere((w) =>
                        v.target.checked
                          ? [...(w ?? []), r.id]
                          : (w ?? []).filter((x) => x !== r.id),
                      )
                    }
                  />
                  {r.name}
                </label>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-stone-600">
              {regions.find((r) => r.id === myRegion)?.name ?? "Your region"}
            </p>
          )}
        </div>
        <label className="block text-sm">
          <span className="font-medium">Link</span>{" "}
          <span className="text-stone-400">(optional)</span>
          <input
            value={link}
            onChange={(v) => setLink(v.target.value)}
            placeholder="A guide, past example or artwork"
            className={`mt-1 ${input}`}
          />
        </label>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <div className="flex items-center justify-between pt-2">
          {e ? (
            confirmDelete ? (
              <span className="flex items-center gap-2 text-sm">
                Remove for everyone?
                <button
                  type="button"
                  onClick={remove}
                  disabled={pending}
                  className="font-semibold text-red-700 hover:underline"
                >
                  Remove
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="text-stone-500 hover:underline"
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-xs text-stone-400 hover:text-red-700 hover:underline"
              >
                Remove
              </button>
            )
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
