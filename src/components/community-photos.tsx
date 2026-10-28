"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { loadCommunityPhotos, type EventPhoto } from "@/lib/event-photos";
import { PhotoUploader } from "@/components/photo-uploader";

// Community photos: good photos that aren't from one event in the app (often
// older ones), with a rough date. They're used on promo graphics like any
// event photo.

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

function when(p: EventPhoto) {
  if (!p.takenYear) return "Date unknown";
  return p.takenMonth
    ? `${MONTHS[p.takenMonth - 1]} ${p.takenYear}`
    : String(p.takenYear);
}

function PhotoTile({
  p,
  open,
  onToggle,
  onChange,
}: {
  p: EventPhoto;
  open: boolean;
  onToggle: () => void;
  onChange: (change: Partial<EventPhoto> & { remove?: boolean }) => void;
}) {
  return (
    <li className="relative">
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
          <button
            type="button"
            onClick={() => onChange({ favourite: !p.favourite })}
            className="block w-full rounded-lg px-2 py-1 text-left hover:bg-stone-100"
          >
            {p.favourite ? "Unstar" : "Favourite"}
          </button>
          <button
            type="button"
            onClick={() => onChange({ noPromo: !p.noPromo })}
            className="block w-full rounded-lg px-2 py-1 text-left hover:bg-stone-100"
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
          <button
            type="button"
            onClick={() => onChange({ remove: true })}
            className="block w-full rounded-lg px-2 py-1 text-left text-red-700 hover:bg-stone-100"
          >
            Remove
          </button>
        </div>
      )}
    </li>
  );
}

export function CommunityPhotos({ teamId }: { teamId: string }) {
  const [photos, setPhotos] = useState<EventPhoto[] | null>(null);
  const [reload, setReload] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [caption, setCaption] = useState("");

  useEffect(() => {
    let live = true;
    loadCommunityPhotos(createClient(), teamId).then((p) => {
      if (live) setPhotos(p);
    });
    return () => {
      live = false;
    };
  }, [teamId, reload]);

  async function change(
    p: EventPhoto,
    c: Partial<EventPhoto> & { remove?: boolean },
  ) {
    setOpen(null);
    setPhotos((all) =>
      (all ?? [])
        .filter((x) => !(c.remove && x.id === p.id))
        .map((x) => (x.id === p.id ? { ...x, ...c } : x)),
    );
    await createClient()
      .from("event_photos")
      .update({
        ...(c.favourite !== undefined && { favourite: c.favourite }),
        ...(c.noPromo !== undefined && { no_promo: c.noPromo }),
        ...(c.remove && { archived_at: new Date().toISOString() }),
      })
      .eq("id", p.id);
  }

  // eslint-disable-next-line react-hooks/purity -- only used for the year list
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: thisYear - 2014 }, (_, i) => thisYear - i);

  // Grouped by rough date, in the order they came back (newest first).
  const groups: { label: string; list: EventPhoto[] }[] = [];
  for (const p of photos ?? []) {
    const label = when(p);
    const g = groups.find((x) => x.label === label);
    if (g) g.list.push(p);
    else groups.push({ label, list: [p] });
  }

  return (
    <section id="photos" className="mt-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
        Community photos
      </h2>
      <div className="rounded-2xl bg-white p-3 ring-1 ring-black/5">
        <p className="text-sm text-stone-600">
          Good photos that aren&apos;t from an event in the app, like older
          ones. They&apos;re used on your promo graphics too.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={year}
            onChange={(e) => {
              setYear(e.target.value);
              if (!e.target.value) setMonth("");
            }}
            className="rounded-lg bg-white px-2 py-1.5 text-sm ring-1 ring-black/10"
            aria-label="Year"
          >
            <option value="">Year (if you know)</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            disabled={!year}
            className="rounded-lg bg-white px-2 py-1.5 text-sm ring-1 ring-black/10 disabled:opacity-50"
            aria-label="Month"
          >
            <option value="">Month (optional)</option>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value.slice(0, 120))}
            placeholder="Note (optional), e.g. Bondi outreach"
            className="min-w-0 basis-full rounded-lg bg-white px-2 py-1.5 text-sm ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-cyan"
          />
        </div>
        <div className="mt-2">
          <PhotoUploader
            teamId={teamId}
            eventId={null}
            extra={{
              taken_year: year ? Number(year) : null,
              taken_month: year && month ? Number(month) : null,
              caption: caption.trim() || null,
            }}
            label="Upload photos"
            onUploaded={() => setReload((r) => r + 1)}
          />
        </div>
      </div>

      {photos === null ? (
        <p className="mt-3 text-sm text-stone-500">Loading…</p>
      ) : photos.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-stone-300 px-4 py-4 text-sm text-stone-500">
          No community photos yet. Pick a rough date, then upload a few.
        </p>
      ) : (
        groups.map((g) => (
          <div key={g.label} className="mt-4">
            <h3 className="mb-1.5 text-sm font-semibold text-navy">
              {g.label}{" "}
              <span className="font-normal text-stone-400">
                {g.list.length}
              </span>
            </h3>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {g.list.map((p) => (
                <PhotoTile
                  key={p.id}
                  p={p}
                  open={open === p.id}
                  onToggle={() => setOpen(open === p.id ? null : p.id)}
                  onChange={(c) => change(p, c)}
                />
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}
