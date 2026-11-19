"use client";

import { NewTag } from "@/components/new-tag";

// One look for every Resources card (Kai, 19 Nov 2026: cards had uneven
// white space and the pins sat on the titles). Content sits at the top, the
// arrow sits in the title row, and pinnable cards leave room for the pin.
export const RESOURCE_CARD =
  "flex h-full w-full flex-col rounded-2xl bg-white px-4 py-3 text-left text-navy shadow-sm ring-1 ring-black/5 hover:ring-pink";

export function ResourceCardBody({
  emoji,
  title,
  about,
  newKey,
  tag,
  tip,
  external = false,
  pinned = false,
}: {
  emoji?: string;
  title: React.ReactNode;
  about: React.ReactNode;
  newKey?: string;
  tag?: string;
  tip?: string;
  external?: boolean;
  pinned?: boolean; // leave room for the pin button (Pinnable)
}) {
  return (
    <>
      <span className="flex items-start gap-2">
        <span
          className={`min-w-0 flex-1 font-semibold leading-snug ${pinned ? "pr-8" : ""}`}
        >
          {emoji && (
            <span aria-hidden className="mr-1.5">
              {emoji}
            </span>
          )}
          {title}
          {tag && (
            <span className="ml-2 inline-block rounded-full bg-cyan/25 px-2 py-0.5 align-middle text-[11px] font-semibold text-navy">
              {tag}
            </span>
          )}
          {newKey && <NewTag k={newKey} />}
        </span>
        <span aria-hidden className="shrink-0 leading-snug text-stone-400">
          {external ? "↗" : "→"}
        </span>
      </span>
      <span className="mt-1 block text-sm text-stone-600">{about}</span>
      {tip && <span className="mt-1 block text-xs text-stone-500">{tip}</span>}
    </>
  );
}
