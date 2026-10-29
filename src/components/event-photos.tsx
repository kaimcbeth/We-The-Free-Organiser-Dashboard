"use client";

import { useState } from "react";
import type { EventPhoto } from "@/lib/event-photos";
import { PhotoUploader } from "@/components/photo-uploader";
import {
  BulkBar,
  PhotoTile,
  savePhoto,
  type PhotoChange,
} from "@/components/photo-tile";

// An event's photos: add more, tag them, star favourites (used first on
// graphics), or keep one out of promo.
export function EventPhotos({
  teamId,
  eventId,
  photos: initial,
}: {
  teamId: string;
  eventId: string;
  photos: EventPhoto[];
}) {
  const [photos, setPhotos] = useState(initial);
  const [open, setOpen] = useState<string | null>(null);
  const [sel, setSel] = useState<Set<string> | null>(null); // select mode

  function flag(p: EventPhoto, c: PhotoChange) {
    setPhotos((all) => all.map((x) => (x.id === p.id ? { ...x, ...c } : x)));
    savePhoto(p.id, c);
  }

  function bulk(make: (p: EventPhoto) => PhotoChange) {
    for (const p of photos.filter((x) => sel?.has(x.id))) flag(p, make(p));
  }

  return (
    <section className="mt-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-navy">
          Photos{" "}
          {photos.length > 0 && (
            <span className="font-normal text-stone-400">{photos.length}</span>
          )}
        </h2>
        <span className="flex items-center gap-3">
          {photos.length > 1 && !sel && (
            <button
              type="button"
              onClick={() => {
                setOpen(null);
                setSel(new Set());
              }}
              className="text-sm font-medium text-stone-500 hover:text-stone-800 hover:underline"
            >
              Select
            </button>
          )}
          <PhotoUploader teamId={teamId} eventId={eventId} />
        </span>
      </div>
      {photos.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-stone-300 px-4 py-5 text-center text-sm text-stone-500">
          No photos yet. Add a few from the event: they&apos;re used on your
          promo graphics.
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((p) => (
            <PhotoTile
              key={p.id}
              p={p}
              teamId={teamId}
              open={open === p.id}
              onToggle={() => setOpen(open === p.id ? null : p.id)}
              onChange={(c) => flag(p, c)}
              selected={sel?.has(p.id)}
              onModSelect={() => {
                setOpen(null);
                setSel((s) => {
                  const n = new Set(s ?? []);
                  if (n.has(p.id)) n.delete(p.id);
                  else n.add(p.id);
                  return n;
                });
              }}
              onSelect={
                sel
                  ? () =>
                      setSel((s) => {
                        const n = new Set(s);
                        if (n.has(p.id)) n.delete(p.id);
                        else n.add(p.id);
                        return n;
                      })
                  : undefined
              }
            />
          ))}
        </ul>
      )}
      {sel && (
        <>
          <div className="h-40" aria-hidden />
          <BulkBar
            teamId={teamId}
            photos={photos.filter((p) => sel.has(p.id))}
            total={photos.length}
            onApply={bulk}
            onSelectAll={() => setSel(new Set(photos.map((p) => p.id)))}
            onDone={() => setSel(null)}
          />
        </>
      )}
    </section>
  );
}
