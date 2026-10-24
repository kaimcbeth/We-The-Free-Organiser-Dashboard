"use client";

import { useState } from "react";
import { useSearchOpen } from "./action-search";

// Later events, 3 more at a time until you've seen them all.
const STEP = 3;

export function ShowMoreEvents({ items }: { items: React.ReactNode[] }) {
  const [shown, setShown] = useState(0);
  const searching = useSearchOpen();
  if (items.length === 0) return null;
  if (searching) return <>{items}</>;
  const left = items.length - shown;
  const btn =
    "rounded-full px-3 py-1.5 text-sm font-medium text-stone-500 ring-1 ring-stone-200 hover:bg-white hover:text-navy";
  return (
    <>
      {items.slice(0, shown)}
      <div className="flex flex-wrap gap-2">
        {left > 0 && (
          <button
            type="button"
            onClick={() => setShown(shown + STEP)}
            className={btn}
          >
            Show {Math.min(STEP, left)} more upcoming event
            {Math.min(STEP, left) === 1 ? "" : "s"} ({left} left) ▾
          </button>
        )}
        {left > STEP && (
          <button
            type="button"
            onClick={() => setShown(items.length)}
            className={btn}
          >
            Show all
          </button>
        )}
        {shown > 0 && (
          <button type="button" onClick={() => setShown(0)} className={btn}>
            Show fewer ▴
          </button>
        )}
      </div>
    </>
  );
}
