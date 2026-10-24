"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { EventPhoto } from "@/lib/event-photos";
import { PhotoUploader } from "@/components/photo-uploader";

// An event's photos: add more, star favourites (used first on graphics), or
// keep one out of promo.
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

  async function flag(p: EventPhoto, change: Partial<EventPhoto>) {
    setPhotos((all) =>
      all.map((x) => (x.id === p.id ? { ...x, ...change } : x)),
    );
    await createClient()
      .from("event_photos")
      .update({
        ...(change.favourite !== undefined && { favourite: change.favourite }),
        ...(change.noPromo !== undefined && { no_promo: change.noPromo }),
      })
      .eq("id", p.id);
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
            <li key={p.id} className="relative">
              <button
                type="button"
                onClick={() => setOpen(open === p.id ? null : p.id)}
                className="block aspect-square w-full overflow-hidden rounded-xl bg-stone-200"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
                <img
                  src={p.url}
                  alt=""
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
              {open === p.id && (
                <div className="absolute inset-x-1 bottom-1 z-10 space-y-1 rounded-xl bg-white p-1.5 text-xs shadow-lg ring-1 ring-black/10">
                  <button
                    type="button"
                    onClick={() => flag(p, { favourite: !p.favourite })}
                    className="block w-full rounded-lg px-2 py-1 text-left hover:bg-stone-100"
                  >
                    {p.favourite ? "Unstar" : "⭐ Favourite"}
                  </button>
                  <button
                    type="button"
                    onClick={() => flag(p, { noPromo: !p.noPromo })}
                    className="block w-full rounded-lg px-2 py-1 text-left hover:bg-stone-100"
                  >
                    {p.noPromo ? "Use in promo again" : "🚫 Not for promo"}
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
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
