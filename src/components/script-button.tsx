"use client";

import { useState } from "react";
import { Sheet } from "@/components/sheet";
import { SCRIPTS } from "@/lib/scripts";

// "Briefing script" / "Debrief script" pop-up on those actions.
export function ScriptButton({
  kind,
  className,
}: {
  kind: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const s = SCRIPTS[kind];
  if (!s) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {s.label ?? "Script"}
      </button>
      {open && (
        <Sheet title={s.title} onClose={() => setOpen(false)}>
          <p className="text-sm text-stone-500">{s.minutes}</p>
          <ol className="mt-3 space-y-3">
            {s.steps.map((st, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan/30 text-xs font-bold text-navy">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold">{st.heading}</p>
                  <ul className="mt-0.5 space-y-1 text-sm text-stone-700">
                    {st.points.map((p, j) => (
                      <li key={j}>{p}</li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
        </Sheet>
      )}
    </>
  );
}
