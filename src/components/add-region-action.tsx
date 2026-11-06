"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/sheet";
import { createClient } from "@/lib/supabase/client";

// "+ Add an action" on the RSL view of Actions (Kai, 6 Nov 2026: "Want add
// action in the main view not the action planner"). A one-off with a due
// date, or one that repeats (0209 add_region_task).

type How = "once" | "community" | "weekly" | "monthly" | "quarterly";
const HOW: [How, string][] = [
  ["once", "Just once"],
  ["weekly", "Every week"],
  ["monthly", "Every month"],
  ["quarterly", "Every 3 months"],
  ["community", "Each community, every month"],
];

const inWeek = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toLocaleDateString("en-CA"); // YYYY-MM-DD
};

export function AddRegionAction({ regionId }: { regionId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl bg-pink px-4 py-2.5 text-sm font-semibold text-navy hover:bg-pink-strong"
      >
        + Add an action
      </button>
      {open && <AddSheet regionId={regionId} onClose={() => setOpen(false)} />}
    </>
  );
}

function AddSheet({
  regionId,
  onClose,
}: {
  regionId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [how, setHow] = useState<How>("once");
  const [minutes, setMinutes] = useState(15);
  const [due, setDue] = useState(inWeek);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function add() {
    if (!title.trim()) return setError("Give the action a name.");
    setBusy(true);
    setError("");
    const { data, error } = await createClient().rpc("add_region_task", {
      p_region: regionId,
      p_title: title.trim(),
      p_minutes: minutes,
      p_how: how,
      p_due:
        how === "once" && due
          ? new Date(`${due}T23:59:00`).toISOString()
          : null,
    });
    setBusy(false);
    if (error || !data)
      return setError("Couldn't add the action. Try again in a moment.");
    router.refresh();
    onClose();
  }

  const input =
    "mt-1 block w-full rounded-xl bg-white px-3 py-2 text-sm text-navy ring-1 ring-stone-300 placeholder:text-stone-400";
  return (
    <Sheet title="Add an action" onClose={onClose}>
      <div className="space-y-4">
        <label className="block text-sm font-medium text-navy">
          What needs doing?
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="e.g. Organiser hangout planned"
            maxLength={80}
            className={input}
          />
        </label>
        <div>
          <p className="mb-1.5 text-sm font-medium text-navy">How often</p>
          <div className="flex flex-wrap gap-1.5">
            {HOW.map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setHow(v)}
                aria-pressed={how === v}
                className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${
                  how === v
                    ? "bg-navy text-white ring-navy"
                    : "bg-white text-stone-500 ring-stone-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          {how === "once" && (
            <label className="block text-sm font-medium text-navy">
              Due
              <input
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                className={input}
              />
            </label>
          )}
          <label className="block text-sm font-medium text-navy">
            About how long? (minutes
            {how === "community" ? ", for each community" : ""})
            <input
              type="number"
              min={1}
              max={600}
              value={minutes}
              onChange={(e) =>
                setMinutes(Math.max(1, Number(e.target.value) || 1))
              }
              className={`${input} w-28`}
            />
          </label>
        </div>
        {how !== "once" && (
          <p className="text-xs text-stone-500">
            It repeats by itself. Switch it off or remove it any time in Plan
            RSL actions.
          </p>
        )}
        {error && <p className="text-sm text-[#b91c1c]">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={add}
            disabled={busy}
            className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Adding…" : "Add action"}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
