"use client";

import { useState } from "react";
import type { EventPhoto } from "@/lib/event-photos";
import { PhotoUploader } from "@/components/photo-uploader";
import {
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

  function flag(p: EventPhoto, c: PhotoChange) {
    setPhotos((all) => all.map((x) => (x.id === p.id ? { ...x, ...c } : x)));
    savePhoto(p.id, c);
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
        <PhotoUploader teamId={teamId} eventId={eventId} />
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
            />
          ))}
        </ul>
      )}
    </section>
  );
}
