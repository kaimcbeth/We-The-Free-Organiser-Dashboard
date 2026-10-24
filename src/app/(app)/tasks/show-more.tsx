"use client";

import { useState } from "react";
import { useSearchOpen } from "./action-search";

// Later events' actions, tucked away behind a small button.
export function ShowMoreEvents({
  count,
  children,
}: {
  count: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const searching = useSearchOpen();
  if (count === 0) return null;
  if (searching) return <>{children}</>;
  return open ? (
    <>
      {children}
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded-full px-3 py-1.5 text-sm font-medium text-stone-500 ring-1 ring-stone-200 hover:bg-white hover:text-navy"
      >
        Show fewer events ▴
      </button>
    </>
  ) : (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="rounded-full px-3 py-1.5 text-sm font-medium text-stone-500 ring-1 ring-stone-200 hover:bg-white hover:text-navy"
    >
      Show more upcoming events ({count}) ▾
    </button>
  );
}
