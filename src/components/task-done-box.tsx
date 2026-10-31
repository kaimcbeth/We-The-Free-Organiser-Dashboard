"use client";

import { useState, useTransition } from "react";
import { setTaskDone } from "@/app/actions";

// A tick box on an action's notification: mark the action done (or not)
// without opening it.
export function TaskDoneBox({
  taskId,
  initialDone,
  onChange,
}: {
  taskId: string;
  initialDone: boolean;
  onChange?: (done: boolean) => void;
}) {
  const [done, setDone] = useState(initialDone);
  const [pending, start] = useTransition();
  function toggle() {
    const next = !done;
    setDone(next);
    onChange?.(next);
    start(async () => {
      const r = await setTaskDone(taskId, next);
      if (r.error) {
        setDone(!next);
        onChange?.(!next);
      }
    });
  }
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={done ? "Done. Tap to undo" : "Mark as done"}
      title={done ? "Done" : "Mark as done"}
      disabled={pending}
      onClick={toggle}
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ring-2 transition ${
        done
          ? "bg-cyan text-navy ring-cyan"
          : "bg-white text-transparent ring-stone-300 hover:ring-navy"
      }`}
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
        <path
          d="M5 10.5l3.2 3L15 7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
