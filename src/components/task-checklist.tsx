"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

type Items = { key: string; label: string }[];
type State = { checked: string[]; skipped: string[]; done: boolean };

// Boxes inside a merged action (0191: "Event promoted" = WhatsApp + Facebook
// groups + Instagram, etc.). Ticking every box completes the action. A small
// × takes a box off this action (0192, Kai: e.g. no Instagram this time);
// "Removed: … Put back" brings it back. The last box can't be removed.
export function TaskChecklist({
  taskId,
  items,
  initial,
  initialSkipped = [],
  onDone,
}: {
  taskId: string;
  items: Items;
  initial: string[];
  initialSkipped?: string[];
  onDone: (done: boolean) => void;
}) {
  const [checked, setChecked] = useState<string[]>(initial);
  const [skipped, setSkipped] = useState<string[]>(initialSkipped);
  const [error, setError] = useState("");
  const [, start] = useTransition();

  const shown = items.filter((it) => !skipped.includes(it.key));
  const removed = items.filter((it) => skipped.includes(it.key));

  function save(
    rpc: "set_task_check" | "set_task_skip",
    args: Record<string, unknown>,
  ) {
    const before = { checked, skipped };
    setError("");
    start(async () => {
      const { data, error } = await createClient().rpc(rpc, args);
      if (error) {
        setChecked(before.checked);
        setSkipped(before.skipped);
        setError("Couldn't save that. Try again?");
        return;
      }
      const r = data as State;
      setChecked(r.checked);
      setSkipped(r.skipped ?? before.skipped);
      onDone(r.done);
    });
  }

  function toggle(key: string) {
    const on = !checked.includes(key);
    setChecked(on ? [...checked, key] : checked.filter((k) => k !== key));
    save("set_task_check", { p_task_id: taskId, p_key: key, p_on: on });
  }

  function remove(key: string, yes: boolean) {
    setSkipped(yes ? [...skipped, key] : skipped.filter((k) => k !== key));
    if (yes) setChecked(checked.filter((k) => k !== key));
    save("set_task_skip", { p_task_id: taskId, p_key: key, p_remove: yes });
  }

  return (
    <div className="mt-2">
      <ul className="flex flex-col gap-1">
        {shown.map((it) => {
          const on = checked.includes(it.key);
          return (
            <li key={it.key} className="group flex items-center gap-1">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(it.key)}
                  className="h-4 w-4 rounded accent-cyan"
                />
                <span className={on ? "text-stone-400 line-through" : ""}>
                  {it.label}
                </span>
              </label>
              {shown.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(it.key, true)}
                  aria-label={`Remove ${it.label} from this action`}
                  title="Remove from this action"
                  className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-xs leading-none text-stone-300 hover:bg-stone-100 hover:text-stone-600 focus-visible:text-stone-600"
                >
                  ×
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {removed.length > 0 && (
        <p className="mt-1 text-xs text-stone-400">
          Removed:{" "}
          {removed.map((it, i) => (
            <span key={it.key}>
              {i > 0 && ", "}
              {it.label}{" "}
              <button
                type="button"
                onClick={() => remove(it.key, false)}
                className="underline underline-offset-2 hover:text-stone-600"
              >
                Put back
              </button>
            </span>
          ))}
        </p>
      )}
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}
