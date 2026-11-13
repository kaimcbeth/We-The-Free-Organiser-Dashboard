"use client";

import { useEffect, useRef } from "react";

// Bottom sheet on phones, centred dialog on bigger screens.
export function Sheet({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean; // a roomier dialog on bigger screens
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Only close when the press both starts and ends on the dark backdrop:
  // dragging to select text inside and letting go outside used to close it.
  const downOnBackdrop = useRef(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy/60 sm:items-center"
      onPointerDown={(e) => {
        downOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && downOnBackdrop.current) onClose();
        downOnBackdrop.current = false;
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-tour="sheet"
        onClick={(e) => e.stopPropagation()}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-background p-5 pb-8 ${wide ? "sm:max-w-3xl" : "sm:max-w-sm"} sm:rounded-3xl`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:bg-black/5"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
