"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

// Boxes inside a merged action (0191: "Event promoted" = WhatsApp + Facebook
// groups + Instagram, etc.). Ticking every box completes the action.
export function TaskChecklist({
  taskId,
  items,
  initial,
  onDone,
}: {
  taskId: string;
  items: { key: string; label: string }[];
  initial: string[];
  onDone: (done: boolean) => void;
}) {
  const [checked, setChecked] = useState<string[]>(initial);
  const [error, setError] = useState("");
  const [, start] = useTransition();

  function toggle(key: string) {
    const on = !checked.includes(key);
    const before = checked;
    const next = on ? [...checked, key] : checked.filter((k) => k !== key);
    setChecked(next);
    setError("");
    start(async () => {
      const { data, error } = await createClient().rpc("set_task_check", {
        p_task_id: taskId,
        p_key: key,
        p_on: on,
      });
      if (error) {
        setChecked(before);
        setError("Couldn't save that. Try again?");
        return;
      }
      const r = data as { checked: string[]; done: boolean };
      setChecked(r.checked);
      onDone(r.done);
    });
  }

  return (
    <div className="mt-2">
      <ul className="flex flex-col gap-1">
        {items.map((it) => {
          const on = checked.includes(it.key);
          return (
            <li key={it.key}>
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
            </li>
          );
        })}
      </ul>
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}
