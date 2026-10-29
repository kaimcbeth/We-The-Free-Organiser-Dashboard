"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/sheet";
import { CarouselMaker } from "@/components/carousel-maker";
import { createClient } from "@/lib/supabase/client";
import { loadMonthPhotos, type EventPhoto } from "@/lib/event-photos";

// Monthly recap: a carousel made from the month's event photos, with the
// favourites already picked, in event order.
export function MonthCarousel({
  teamId,
  year,
  month,
  tz,
  className,
}: {
  teamId: string;
  year: number;
  month: number; // 1-12
  tz: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [photos, setPhotos] = useState<EventPhoto[] | null>(null);
  const name = new Date(Date.UTC(year, month - 1, 15)).toLocaleDateString(
    "en-AU",
    { month: "long", year: "numeric", timeZone: "UTC" },
  );

  useEffect(() => {
    if (!open || photos) return;
    let live = true;
    loadMonthPhotos(createClient(), teamId, year, month, tz).then((p) => {
      if (live) setPhotos(p);
    });
    return () => {
      live = false;
    };
  }, [open, photos, teamId, year, month, tz]);

  const favourites = (photos ?? []).filter((p) => p.favourite).length;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        Make carousel
      </button>
      {open && (
        <Sheet title={`${name} recap`} onClose={() => setOpen(false)}>
          {photos === null ? (
            <p className="text-sm text-stone-500">Loading photos…</p>
          ) : photos.length === 0 ? (
            <p className="text-sm text-stone-600">
              No photos from {name}&apos;s events yet. Add some on each
              event&apos;s page and star the best ones.
            </p>
          ) : (
            <>
              <p className="mb-3 text-sm text-stone-600">
                {favourites
                  ? `Your ${favourites} favourite${favourites === 1 ? "" : "s"} from ${name} ${favourites === 1 ? "is" : "are"} picked, in event order. Tap others to add them.`
                  : `No favourites starred in ${name} yet, so it starts with the first photos. Star your best ones on each event's page to have them picked.`}
              </p>
              <CarouselMaker
                photos={photos}
                title={`${name} recap`}
                onlyFavourites={favourites > 0}
                teamId={teamId}
              />
            </>
          )}
        </Sheet>
      )}
    </>
  );
}
