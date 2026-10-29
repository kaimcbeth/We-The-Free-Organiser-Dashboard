"use client";

import { useEffect, useRef, useState } from "react";
import { PhotoCrop, resetCrop } from "@/components/photo-crop";
import { CarouselMaker } from "@/components/carousel-maker";
import { Sheet } from "@/components/sheet";
import { createClient } from "@/lib/supabase/client";
import { PHOTO_TAGS, type EventPhoto, type PhotoTag } from "@/lib/event-photos";

// url and cropped are only updated on screen (cropping saves itself).
export type PhotoChange = Partial<
  Pick<EventPhoto, "favourite" | "noPromo" | "tags" | "url" | "cropped">
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

// One photo in a grid. Tap it for: tags, favourite, crop, download
// (and remove, where that's allowed).
export function PhotoTile({
  p,
  teamId,
  open,
  onToggle,
  onChange,
  canRemove = false,
  selected,
  onSelect,
  onModSelect,
}: {
  p: EventPhoto;
  teamId: string;
  open: boolean;
  onToggle: () => void;
  onChange: (c: PhotoChange) => void;
  canRemove?: boolean;
  // Select mode (bulk changes): tapping ticks the photo instead.
  selected?: boolean;
  onSelect?: () => void;
  // Cmd/Ctrl-click: tick this photo (starting select mode if need be).
  onModSelect?: () => void;
}) {
  const item = "block w-full rounded-lg px-2 py-1 text-left hover:bg-stone-100";
  const box = useRef<HTMLLIElement>(null);
  const [cropping, setCropping] = useState(false);
  const [big, setBig] = useState(false); // double-click: full screen

  useEffect(() => {
    if (!big) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setBig(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [big]);

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
        onClick={(e) => {
          if ((e.metaKey || e.ctrlKey) && onModSelect) return onModSelect();
          (onSelect ?? onToggle)();
        }}
        onDoubleClick={() => {
          if (open) onToggle();
          setBig(true);
        }}
        aria-pressed={onSelect ? !!selected : undefined}
        className={`block aspect-square w-full overflow-hidden rounded-xl bg-stone-200 ${open || selected ? "ring-2 ring-pink ring-offset-2" : ""}`}
        title={p.caption ?? undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
        <img
          src={p.url}
          alt={p.caption ?? ""}
          className="h-full w-full object-cover"
        />
      </button>
      {p.favourite && (
        <span className="absolute left-1.5 top-1.5 rounded-full bg-white/90 px-1.5 text-xs">
          ⭐
        </span>
      )}
      {p.tags.length > 0 && (
        <span
          aria-label={`Tags: ${p.tags.join(", ")}`}
          className="pointer-events-none absolute bottom-1 left-1 flex max-w-[75%] flex-wrap gap-0.5"
        >
          {PHOTO_TAGS.filter((t) => p.tags.includes(t.id)).map((t) => (
            <span
              key={t.id}
              className="rounded bg-black/35 px-1 text-[9px] font-medium leading-[14px] text-white/85"
            >
              {t.short}
            </span>
          ))}
        </span>
      )}
      {onSelect && (
        <span
          aria-hidden
          className={`pointer-events-none absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ring-2 ring-white ${selected ? "bg-pink text-navy" : "bg-black/30 text-transparent"}`}
        >
          ✓
        </span>
      )}
      {open && !onSelect && (
        <div className="absolute inset-x-0 top-full z-20 mt-1 space-y-1 rounded-xl bg-white p-1.5 text-xs shadow-lg ring-1 ring-black/10">
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
            onClick={() => {
              onToggle();
              setCropping(true);
            }}
            className={item}
          >
            Crop
          </button>
          {p.cropped && (
            <button
              type="button"
              onClick={async () => {
                onToggle();
                const url = await resetCrop(p.id);
                if (url) onChange({ url, cropped: false });
              }}
              className={item}
            >
              Reset to original
            </button>
          )}
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
      {big && (
        <div
          role="dialog"
          aria-label="Photo"
          onClick={() => setBig(false)}
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/85 p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
          <img
            src={p.url}
            alt={p.caption ?? ""}
            className="max-h-[92vh] max-w-full rounded-lg object-contain shadow-2xl"
          />
          {p.caption && (
            <p className="absolute inset-x-0 bottom-4 text-center text-sm text-white/80">
              {p.caption}
            </p>
          )}
        </div>
      )}
      {cropping && (
        <PhotoCrop
          photo={{ id: p.id, url: p.url, teamId, eventId: p.eventId }}
          onSaved={(url) => {
            setCropping(false);
            onChange({ url, cropped: true });
          }}
          onClose={() => setCropping(false)}
        />
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

// Bulk changes for the photos ticked in select mode: tags (on for all, or off
// for all if they all have it already), favourite, remove.
export function BulkBar({
  photos,
  total,
  onApply,
  onSelectAll,
  onDone,
  canRemove = false,
}: {
  photos: EventPhoto[]; // the selected ones
  total: number; // how many could be selected
  onApply: (change: (p: EventPhoto) => PhotoChange) => void;
  onSelectAll: () => void;
  onDone: () => void;
  canRemove?: boolean;
}) {
  const [sure, setSure] = useState(false);
  const [carousel, setCarousel] = useState(false);
  const n = photos.length;
  const chip =
    "rounded-full px-2.5 py-1 text-xs font-medium ring-1 disabled:opacity-40";
  const allFav = n > 0 && photos.every((p) => p.favourite);
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-white/95 px-4 pb-5 pt-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur">
      <div className="mx-auto max-w-2xl space-y-2">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-semibold text-navy">
            {n} selected
            {n < total && (
              <button
                type="button"
                onClick={onSelectAll}
                className="ml-3 font-medium text-pink-ink hover:underline"
              >
                Select all {total}
              </button>
            )}
          </span>
          <button
            type="button"
            onClick={onDone}
            className="rounded-lg px-3 py-1 font-semibold text-navy ring-1 ring-black/10 hover:bg-stone-50"
          >
            Done
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PHOTO_TAGS.map((t) => {
            const all = n > 0 && photos.every((p) => p.tags.includes(t.id));
            return (
              <button
                key={t.id}
                type="button"
                disabled={n === 0}
                onClick={() =>
                  onApply((p) => ({
                    tags: all
                      ? p.tags.filter((x) => x !== t.id)
                      : p.tags.includes(t.id)
                        ? p.tags
                        : [...p.tags, t.id],
                  }))
                }
                className={`${chip} ${all ? "bg-navy text-white ring-navy" : "bg-white text-stone-600 ring-stone-300"}`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            disabled={n === 0 || n > 20}
            onClick={() => setCarousel(true)}
            title={n > 20 ? "A carousel can have up to 20 photos" : undefined}
            className={`${chip} bg-navy text-white ring-navy`}
          >
            {n > 20 ? "Carousel: 20 max" : "Make carousel"}
          </button>
          <button
            type="button"
            disabled={n === 0}
            onClick={() => onApply(() => ({ favourite: !allFav }))}
            className={`${chip} bg-white text-stone-700 ring-stone-300`}
          >
            {allFav ? "Unstar" : "Favourite"}
          </button>
          {canRemove &&
            (sure ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setSure(false);
                    onApply(() => ({ remove: true }));
                  }}
                  className={`${chip} bg-red-700 text-white ring-red-700`}
                >
                  Remove {n}
                </button>
                <button
                  type="button"
                  onClick={() => setSure(false)}
                  className={`${chip} bg-white text-stone-600 ring-stone-300`}
                >
                  Keep
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={n === 0}
                onClick={() => setSure(true)}
                className={`${chip} bg-white text-red-700 ring-stone-300`}
              >
                Remove
              </button>
            ))}
        </div>
      </div>
      {carousel && (
        <Sheet title="Carousel" onClose={() => setCarousel(false)}>
          <CarouselMaker photos={photos} title="carousel" keepOrder />
        </Sheet>
      )}
    </div>
  );
}
