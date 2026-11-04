"use client";

import { PhotoGraphic } from "@/components/photo-graphic";
import { useEffect, useRef, useState } from "react";
import { PhotoCrop, resetCrop } from "@/components/photo-crop";
import { CarouselMaker } from "@/components/carousel-maker";
import { RecapMaker } from "@/components/recap-maker";
import { Sheet } from "@/components/sheet";
import { createClient } from "@/lib/supabase/client";
import { PHOTO_TAGS, type EventPhoto, type PhotoTag } from "@/lib/event-photos";

// url and cropped are only updated on screen (cropping saves itself).
export type PhotoChange = Partial<
  Pick<
    EventPhoto,
    | "favourite"
    | "noPromo"
    | "tags"
    | "url"
    | "cropped"
    | "eventKind"
    | "eventId"
    | "takenYear"
    | "takenMonth"
  >
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
      ...(c.eventKind !== undefined && { event_kind: c.eventKind }),
      ...(c.eventId !== undefined && { event_id: c.eventId }),
      ...(c.takenYear !== undefined && {
        taken_year: c.takenYear,
        taken_month: c.takenYear === null ? null : (c.takenMonth ?? null),
      }),
      ...(c.remove && { archived_at: new Date().toISOString() }),
    })
    .eq("id", id);
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Shift-click (Kai, 4 Nov 2026): ticks every photo between the last one
// clicked (`anchor`) and this one, in the order they're shown. If this photo
// was already ticked, the range is unticked instead, like Google Photos.
export function selectRange(
  sel: Set<string> | null,
  order: string[],
  anchor: string | null,
  id: string,
): Set<string> {
  const n = new Set(sel ?? []);
  const to = order.indexOf(id);
  const from = anchor ? order.indexOf(anchor) : -1;
  if (from < 0 || to < 0) {
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  }
  const untick = n.has(id) && from !== to;
  const [a, b] = from < to ? [from, to] : [to, from];
  for (const x of order.slice(a, b + 1)) {
    if (untick) n.delete(x);
    else n.add(x);
  }
  return n;
}

// One photo in a grid. The star in the corner favourites it; tap the photo
// for tags, crop, download
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
  onShiftSelect,
  kinds,
  graphic = false,
  events,
  years,
}: {
  // Photo Hub: which event it's from, and its month (Kai, 2 Nov 2026: there
  // was no way to take a photo off an event or change its date).
  events?: { id: string; label: string }[];
  years?: number[];
  kinds?: string[]; // event kinds to choose from (Photo Hub)
  graphic?: boolean; // "Make graphic" in the menu (Photo Hub)
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
  // Shift-click: tick everything from the last clicked photo to this one.
  onShiftSelect?: () => void;
}) {
  const item = "block w-full rounded-lg px-2 py-1 text-left hover:bg-stone-100";
  const box = useRef<HTMLLIElement>(null);
  const [cropping, setCropping] = useState(false);
  const [making, setMaking] = useState(false); // Make graphic
  const [big, setBig] = useState(false); // double-click: full screen
  // Long press (phones): select this photo, like Ctrl/Cmd-click on a computer.
  const press = useRef<{
    timer: number;
    x: number;
    y: number;
    fired: boolean;
  } | null>(null);
  const cancelPress = () => {
    if (press.current) window.clearTimeout(press.current.timer);
  };

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
        onMouseDown={(e) => {
          // Stop shift-click from highlighting text across the page.
          if (e.shiftKey && onShiftSelect) e.preventDefault();
        }}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" || !onModSelect) return;
          const x = e.clientX;
          const y = e.clientY;
          press.current = {
            x,
            y,
            fired: false,
            timer: window.setTimeout(() => {
              if (!press.current) return;
              press.current.fired = true;
              navigator.vibrate?.(30);
              onModSelect();
            }, 450),
          };
        }}
        onPointerMove={(e) => {
          const p0 = press.current;
          if (p0 && Math.hypot(e.clientX - p0.x, e.clientY - p0.y) > 10)
            cancelPress();
        }}
        onPointerUp={cancelPress}
        onPointerCancel={cancelPress}
        onContextMenu={(e) => {
          // No "save image" menu when long-pressing to select.
          if (onModSelect) e.preventDefault();
        }}
        onClick={(e) => {
          if (press.current?.fired) {
            press.current = null;
            return; // the long press already selected it
          }
          if (e.shiftKey && onShiftSelect) return onShiftSelect();
          if ((e.metaKey || e.ctrlKey) && onModSelect) return onModSelect();
          (onSelect ?? onToggle)();
        }}
        onDoubleClick={() => {
          if (open) onToggle();
          setBig(true);
        }}
        aria-pressed={onSelect ? !!selected : undefined}
        className={`block aspect-square w-full select-none overflow-hidden rounded-xl bg-stone-200 [-webkit-touch-callout:none] ${open || selected ? "ring-2 ring-pink ring-offset-2" : ""}`}
        title={p.caption ?? undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
        <img
          src={p.url}
          alt={p.caption ?? ""}
          draggable={false}
          className="pointer-events-none h-full w-full object-cover"
        />
      </button>
      <button
        type="button"
        onClick={() => onChange({ favourite: !p.favourite })}
        aria-pressed={p.favourite}
        aria-label={p.favourite ? "Unstar" : "Favourite"}
        title={p.favourite ? "Unstar" : "Favourite"}
        className={`absolute left-1.5 top-1.5 rounded-full px-1.5 text-xs transition ${
          p.favourite
            ? "bg-white/90"
            : "bg-white/30 opacity-50 grayscale hover:opacity-100 hover:grayscale-0"
        }`}
      >
        ⭐
      </button>
      {(p.tags.length > 0 || p.eventKind) && (
        <span
          aria-label={`Tags: ${[p.eventKind, ...p.tags].filter(Boolean).join(", ")}`}
          className="pointer-events-none absolute bottom-1 left-1 flex max-w-[75%] flex-wrap gap-0.5"
        >
          {p.eventKind && (
            <span className="rounded bg-navy/60 px-1 text-[9px] font-medium leading-[14px] text-white/90">
              {p.eventKind}
            </span>
          )}
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
          {kinds && kinds.length > 0 && (
            <select
              value={p.eventKind ?? ""}
              onChange={(e) => onChange({ eventKind: e.target.value || null })}
              aria-label="Event type"
              className={`mx-1 mb-1 w-[calc(100%-0.5rem)] rounded-lg bg-white px-1.5 py-1 text-xs ring-1 ring-black/10 ${p.eventKind ? "text-navy" : "text-stone-400"}`}
            >
              <option value="">Event type…</option>
              {kinds.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          )}
          {events && (
            <select
              value={p.eventId ?? ""}
              onChange={(e) => onChange({ eventId: e.target.value || null })}
              aria-label="Event"
              className={`mx-1 mb-1 w-[calc(100%-0.5rem)] rounded-lg bg-white px-1.5 py-1 text-xs ring-1 ring-black/10 ${p.eventId ? "text-navy" : "text-stone-400"}`}
            >
              <option value="">Not attached to an event</option>
              {p.eventId && !events.some((ev) => ev.id === p.eventId) && (
                <option value={p.eventId}>{p.eventTitle ?? "Its event"}</option>
              )}
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.label}
                </option>
              ))}
            </select>
          )}
          {years && (
            <div className="mx-1 mb-1 flex gap-1">
              <select
                value={p.handDated ? (p.takenMonth ?? "") : ""}
                disabled={!p.handDated}
                onChange={(e) =>
                  onChange({
                    takenYear: p.takenYear,
                    takenMonth: e.target.value ? Number(e.target.value) : null,
                  })
                }
                aria-label="Month taken"
                className="min-w-0 flex-1 rounded-lg bg-white px-1.5 py-1 text-xs text-navy ring-1 ring-black/10 disabled:text-stone-400"
              >
                <option value="">
                  {p.handDated
                    ? "Month?"
                    : p.eventId
                      ? "Month from event"
                      : "Month"}
                </option>
                {MONTH_NAMES.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={p.handDated ? (p.takenYear ?? "") : ""}
                onChange={(e) =>
                  onChange(
                    e.target.value
                      ? {
                          takenYear: Number(e.target.value),
                          takenMonth: p.handDated ? p.takenMonth : null,
                        }
                      : { takenYear: null, takenMonth: null },
                  )
                }
                aria-label="Year taken"
                className={`min-w-0 flex-1 rounded-lg bg-white px-1.5 py-1 text-xs ring-1 ring-black/10 ${p.handDated ? "text-navy" : "text-stone-400"}`}
              >
                <option value="">
                  {p.eventId ? "Year from event" : "Year unknown"}
                </option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}
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
          {graphic && (
            <button
              type="button"
              onClick={() => {
                onToggle();
                setMaking(true);
              }}
              className={item}
            >
              Make graphic
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
      {making && (
        <PhotoGraphic
          photo={p}
          teamId={teamId}
          onClose={() => setMaking(false)}
        />
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
// A photo filter: a tag, or just the favourites.
export type PhotoFilter = PhotoTag | "favourite" | `kind:${string}` | null;
export const matchesFilter = (p: EventPhoto, f: PhotoFilter) =>
  !f ||
  (f === "favourite"
    ? p.favourite
    : f.startsWith("kind:")
      ? p.eventKind === f.slice(5)
      : p.tags.includes(f as PhotoTag));

export function TagFilter({
  photos,
  value,
  onChange,
  small = false,
  showFavourites = true,
}: {
  photos: EventPhoto[];
  value: PhotoFilter;
  onChange: (t: PhotoFilter) => void;
  small?: boolean;
  showFavourites?: boolean; // members don't see favourites
}) {
  const favourites = showFavourites
    ? photos.filter((p) => p.favourite).length
    : 0;
  const kindCounts = new Map<string, number>();
  for (const p of photos)
    if (p.eventKind)
      kindCounts.set(p.eventKind, (kindCounts.get(p.eventKind) ?? 0) + 1);
  const counts = PHOTO_TAGS.map((t) => ({
    ...t,
    n: photos.filter((p) => p.tags.includes(t.id)).length,
  })).filter((t) => t.n > 0);
  if (counts.length === 0 && favourites === 0 && kindCounts.size === 0)
    return null;
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
      {favourites > 0 && (
        <button
          type="button"
          onClick={() => onChange(value === "favourite" ? null : "favourite")}
          className={chip(value === "favourite")}
        >
          ⭐ Favourites <span className="opacity-60">{favourites}</span>
        </button>
      )}
      {[...kindCounts.entries()].map(([k, n]) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(value === `kind:${k}` ? null : `kind:${k}`)}
          className={chip(value === `kind:${k}`)}
        >
          {k} <span className="opacity-60">{n}</span>
        </button>
      ))}
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
  kinds,
  events,
  onAttach,
  teamId,
  years,
}: {
  teamId?: string; // lets the carousel write a caption
  years?: number[]; // Photo Hub: set a hand date (year, then month)
  kinds?: string[]; // event kinds to set (Photo Hub)
  // Photo Hub: move the selected photos onto an event listing.
  events?: { id: string; label: string }[];
  onAttach?: (eventId: string) => void;
  photos: EventPhoto[]; // the selected ones
  total: number; // how many could be selected
  onApply: (change: (p: EventPhoto) => PhotoChange) => void;
  onSelectAll: () => void;
  onDone: () => void;
  canRemove?: boolean;
}) {
  const [sure, setSure] = useState(false);
  const [carousel, setCarousel] = useState(false);
  const [recap, setRecap] = useState(false); // monthly recap carousel
  const n = photos.length;
  const chip =
    "rounded-full px-2.5 py-1 text-xs font-medium ring-1 disabled:opacity-40";
  const allFav = n > 0 && photos.every((p) => p.favourite);
  return (
    <>
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
            {events && events.length > 0 && onAttach && (
              <select
                value=""
                disabled={n === 0}
                onChange={(e) => e.target.value && onAttach(e.target.value)}
                aria-label="Attach to event"
                className={`${chip} max-w-56 bg-white text-stone-700 ring-stone-300`}
              >
                <option value="">Attach to event…</option>
                <option value="-">Not attached to an event</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.label}
                  </option>
                ))}
              </select>
            )}
            {years && years.length > 0 && (
              <>
                <select
                  value=""
                  disabled={n === 0}
                  onChange={(e) => {
                    const y = Number(e.target.value);
                    if (y)
                      onApply((p) => ({
                        takenYear: y,
                        takenMonth: p.handDated ? p.takenMonth : null,
                      }));
                  }}
                  aria-label="Set year"
                  className={`${chip} bg-white text-stone-700 ring-stone-300`}
                >
                  <option value="">Year…</option>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <select
                  value=""
                  disabled={n === 0 || !photos.some((p) => p.handDated)}
                  title={
                    photos.some((p) => p.handDated)
                      ? undefined
                      : "Pick a year first"
                  }
                  onChange={(e) => {
                    const m = Number(e.target.value);
                    if (m)
                      onApply((p) =>
                        p.handDated
                          ? { takenYear: p.takenYear, takenMonth: m }
                          : {},
                      );
                  }}
                  aria-label="Set month"
                  className={`${chip} bg-white text-stone-700 ring-stone-300`}
                >
                  <option value="">Month…</option>
                  {MONTH_NAMES.map((name, i) => (
                    <option key={name} value={i + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </>
            )}
            {kinds && kinds.length > 0 && (
              <select
                value=""
                disabled={n === 0}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v) onApply(() => ({ eventKind: v === "-" ? null : v }));
                }}
                aria-label="Set event type"
                className={`${chip} bg-white text-stone-700 ring-stone-300`}
              >
                <option value="">Event type…</option>
                {kinds.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
                <option value="-">No event type</option>
              </select>
            )}
            <button
              type="button"
              disabled={n === 0 || n > 20}
              onClick={() => setCarousel(true)}
              title={n > 20 ? "A carousel can have up to 20 photos" : undefined}
              className={`${chip} bg-navy text-white ring-navy`}
            >
              {n > 20 ? "Carousel: 20 max" : "Make carousel"}
            </button>
            {teamId && (
              <button
                type="button"
                disabled={n === 0}
                onClick={() => setRecap(true)}
                className={`${chip} bg-pink text-navy ring-pink`}
              >
                Make a recap
              </button>
            )}
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
      </div>
      {/* Outside the bar: its blur would otherwise trap the sheet inside it. */}
      {recap && teamId && (
        <RecapMaker
          teamId={teamId}
          selected={photos}
          onClose={() => setRecap(false)}
        />
      )}
      {carousel && (
        <Sheet title="Carousel" onClose={() => setCarousel(false)}>
          <CarouselMaker
            photos={photos}
            title="carousel"
            keepOrder
            teamId={teamId}
          />
        </Sheet>
      )}
    </>
  );
}
