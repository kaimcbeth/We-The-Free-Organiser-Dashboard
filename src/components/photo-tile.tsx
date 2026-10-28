"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { PHOTO_TAGS, type EventPhoto, type PhotoTag } from "@/lib/event-photos";

export type PhotoChange = Partial<
  Pick<EventPhoto, "favourite" | "noPromo" | "tags">
> & {
  remove?: boolean;
};

// Saves a change to one photo (the screen updates straight away).
export async function savePhoto(id: string, c: PhotoChange) {
  await createClient()
    .from("event_photos")
    .update({
      ...(c.favourite !== undefined && { favourite: c.favourite }),
      ...(c.noPromo !== undefined && { no_promo: c.noPromo }),
      ...(c.tags !== undefined && { tags: c.tags }),
      ...(c.remove && { archived_at: new Date().toISOString() }),
    })
    .eq("id", id);
}

// One photo in a grid. Tap it for: tags, favourite, not for promo, download
// (and remove, where that's allowed).
export function PhotoTile({
  p,
  open,
  onToggle,
  onChange,
  canRemove = false,
}: {
  p: EventPhoto;
  open: boolean;
  onToggle: () => void;
  onChange: (c: PhotoChange) => void;
  canRemove?: boolean;
}) {
  const item = "block w-full rounded-lg px-2 py-1 text-left hover:bg-stone-100";
  const box = useRef<HTMLLIElement>(null);

  // An open menu closes when you tap anywhere else, or press Escape.
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) onToggle();
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onToggle();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open, onToggle]);

  return (
    <li ref={box} className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="block aspect-square w-full overflow-hidden rounded-xl bg-stone-200"
        title={p.caption ?? undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
        <img
          src={p.url}
          alt={p.caption ?? ""}
          className={`h-full w-full object-cover ${p.noPromo ? "opacity-50" : ""}`}
        />
      </button>
      {p.favourite && (
        <span className="absolute left-1.5 top-1.5 rounded-full bg-white/90 px-1.5 text-xs">
          ⭐
        </span>
      )}
      {p.noPromo && (
        <span className="absolute right-1.5 top-1.5 rounded-full bg-white/90 px-1.5 text-xs">
          🚫
        </span>
      )}
      {open && (
        <div className="absolute inset-x-1 bottom-1 z-10 space-y-1 rounded-xl bg-white p-1.5 text-xs shadow-lg ring-1 ring-black/10">
          {p.caption && <p className="px-2 py-1 text-stone-500">{p.caption}</p>}
          <div className="flex flex-wrap gap-1 px-1 pb-1">
            {PHOTO_TAGS.map((t) => {
              const on = p.tags.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() =>
                    onChange({
                      tags: on
                        ? p.tags.filter((x) => x !== t.id)
                        : [...p.tags, t.id],
                    })
                  }
                  className={`rounded-full px-2 py-0.5 font-medium ring-1 ${on ? "bg-navy text-white ring-navy" : "bg-white text-stone-600 ring-stone-300"}`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => onChange({ favourite: !p.favourite })}
            className={item}
          >
            {p.favourite ? "Unstar" : "Favourite"}
          </button>
          <button
            type="button"
            onClick={() => onChange({ noPromo: !p.noPromo })}
            className={item}
          >
            {p.noPromo ? "Use in promo again" : "Not for promo"}
          </button>
          <a
            href={p.url}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg px-2 py-1 hover:bg-stone-100"
          >
            Download
          </a>
          {canRemove && (
            <button
              type="button"
              onClick={() => onChange({ remove: true })}
              className={`${item} text-red-700`}
            >
              Remove
            </button>
          )}
        </div>
      )}
    </li>
  );
}

// "All / Outreach / Group photo / Volunteers" filter, with counts. Hidden
// when no photo has a tag yet.
export function TagFilter({
  photos,
  value,
  onChange,
  small = false,
}: {
  photos: EventPhoto[];
  value: PhotoTag | null;
  onChange: (t: PhotoTag | null) => void;
  small?: boolean;
}) {
  const counts = PHOTO_TAGS.map((t) => ({
    ...t,
    n: photos.filter((p) => p.tags.includes(t.id)).length,
  })).filter((t) => t.n > 0);
  if (counts.length === 0) return null;
  const chip = (on: boolean) =>
    `rounded-full ${small ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"} font-medium ring-1 ${on ? "bg-navy text-white ring-navy" : "bg-white text-stone-600 ring-stone-300"}`;
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={chip(value === null)}
      >
        All
      </button>
      {counts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(value === t.id ? null : t.id)}
          className={chip(value === t.id)}
        >
          {t.label} <span className="opacity-60">{t.n}</span>
        </button>
      ))}
    </div>
  );
}
