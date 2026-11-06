"use client";

import { useState, type ReactNode } from "react";

/** A row in "Moved for later": double-click (or the small arrow) opens the full action. */
export function LaterRow({
  label,
  when,
  card,
}: {
  label: ReactNode;
  when: string;
  card: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <li>
      <div
        className="flex cursor-pointer select-none items-center justify-between gap-3 px-4 py-2.5 hover:bg-stone-50"
        onDoubleClick={() => setOpen((o) => !o)}
        title="Double-click to open"
      >
        <span className="truncate">{label}</span>
        <span className="flex shrink-0 items-center gap-2 text-stone-500">
          {when}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? "Close this action" : "Open this action"}
            className="rounded px-1 text-xs text-stone-400 hover:text-navy"
          >
            {open ? "▲" : "▼"}
          </button>
        </span>
      </div>
      {open && <ul className="bg-stone-50 px-3 pb-3 pt-1 text-base">{card}</ul>}
    </li>
  );
}
