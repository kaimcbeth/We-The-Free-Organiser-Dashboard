"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { loadCommunityPhotos, type EventPhoto } from "@/lib/event-photos";
import {
  TagFilter,
  matchesFilter,
  type PhotoFilter,
} from "@/components/photo-tile";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const when = (p: EventPhoto) =>
  !p.takenYear
    ? "Date unknown"
    : p.takenMonth
      ? `${MONTHS[p.takenMonth - 1]} ${p.takenYear}`
      : String(p.takenYear);

// The Photo Hub for members: look, filter and download. No changes.
export function PhotoHubView({ teamId }: { teamId: string }) {
  const [photos, setPhotos] = useState<EventPhoto[] | null>(null);
  const [filter, setFilter] = useState<PhotoFilter>(null);
  const [big, setBig] = useState<EventPhoto | null>(null);

  useEffect(() => {
    let live = true;
    loadCommunityPhotos(createClient(), teamId).then((p) => {
      if (live) setPhotos(p);
    });
    return () => {
      live = false;
    };
  }, [teamId]);

  useEffect(() => {
    if (!big) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setBig(null);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [big]);

  if (photos === null)
    return <p className="text-sm text-stone-500">Loading…</p>;
  if (photos.length === 0)
    return (
      <p className="rounded-2xl border border-dashed border-stone-300 px-4 py-5 text-center text-sm text-stone-500">
        No photos here yet.
      </p>
    );

  const groups: { label: string; list: EventPhoto[] }[] = [];
  for (const p of photos.filter((x) => matchesFilter(x, filter))) {
    const label = when(p);
    const g = groups.find((x) => x.label === label);
    if (g) g.list.push(p);
    else groups.push({ label, list: [p] });
  }

  return (
    <div>
      <TagFilter photos={photos} value={filter} onChange={setFilter} />
      {groups.map((g) => (
        <div key={g.label} className="mt-4">
          <h2 className="mb-1.5 text-sm font-semibold text-navy">
            {g.label}{" "}
            <span className="font-normal text-stone-400">{g.list.length}</span>
          </h2>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {g.list.map((p) => (
              <li key={p.id} className="relative">
                <button
                  type="button"
                  onClick={() => setBig(p)}
                  className="block aspect-square w-full overflow-hidden rounded-xl bg-stone-200"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
                  <img
                    src={p.url}
                    alt={p.caption ?? ""}
                    className="h-full w-full object-cover"
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {big && (
        <div
          role="dialog"
          aria-label="Photo"
          onClick={() => setBig(null)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/85 p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
          <img
            src={big.url}
            alt={big.caption ?? ""}
            className="max-h-[80vh] max-w-full rounded-lg object-contain shadow-2xl"
          />
          {big.caption && (
            <p className="text-center text-sm text-white/80">{big.caption}</p>
          )}
          <a
            href={big.url}
            download
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-navy"
          >
            Download
          </a>
        </div>
      )}
    </div>
  );
}
