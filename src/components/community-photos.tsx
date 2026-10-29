"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  loadCommunityPhotos,
  loadRemovedCommunityPhotos,
  PHOTO_TAGS,
  type EventPhoto,
  type PhotoTag,
} from "@/lib/event-photos";
import { PhotoUploader } from "@/components/photo-uploader";
import { Sheet } from "@/components/sheet";
import { loadEventKinds } from "@/lib/event-kinds";
import {
  BulkBar,
  PhotoTile,
  savePhoto,
  TagFilter,
  matchesFilter,
  type PhotoChange,
  type PhotoFilter,
} from "@/components/photo-tile";

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

export function CommunityPhotos({ teamId }: { teamId: string }) {
  const [photos, setPhotos] = useState<EventPhoto[] | null>(null);
  const [reload, setReload] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [caption, setCaption] = useState("");
  const [tags, setTags] = useState<PhotoTag[]>([]);
  const [filter, setFilter] = useState<PhotoFilter>(null);
  const [sel, setSel] = useState<Set<string> | null>(null); // select mode
  const [trash, setTrash] = useState<EventPhoto[] | null>(null); // Removed, open
  const [kinds, setKinds] = useState<string[]>([]); // from the event listings
  const [kind, setKind] = useState(""); // for the next upload
  const [events, setEvents] = useState<{ id: string; label: string }[]>([]);
  const [moved, setMoved] = useState(""); // after attaching to an event

  useEffect(() => {
    let live = true;
    loadEventKinds(createClient(), teamId).then((k) => {
      if (live) setKinds(k);
    });
    // Events to attach photos to: the last 6 months and the next month.
    createClient()
      .from("events")
      .select("id, title, starts_at")
      .eq("team_id", teamId)
      .gte("starts_at", new Date(Date.now() - 183 * 864e5).toISOString())
      .lte("starts_at", new Date(Date.now() + 31 * 864e5).toISOString())
      .order("starts_at", { ascending: false })
      .then(({ data }) => {
        if (live)
          setEvents(
            (data ?? []).map((e) => ({
              id: e.id as string,
              label: `${new Date(e.starts_at as string).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}: ${e.title}`,
            })),
          );
      });
    return () => {
      live = false;
    };
  }, [teamId]);

  useEffect(() => {
    let live = true;
    loadCommunityPhotos(createClient(), teamId).then((p) => {
      if (live) setPhotos(p);
    });
    return () => {
      live = false;
    };
  }, [teamId, reload]);

  function change(p: EventPhoto, c: PhotoChange) {
    if (c.remove) setOpen(null);
    setPhotos((all) =>
      (all ?? [])
        .filter((x) => !(c.remove && x.id === p.id))
        .map((x) => (x.id === p.id ? { ...x, ...c } : x)),
    );
    savePhoto(p.id, c);
  }

  function bulk(make: (p: EventPhoto) => PhotoChange) {
    const chosen = (photos ?? []).filter((x) => sel?.has(x.id));
    for (const p of chosen) change(p, make(p));
    if (chosen.length && make(chosen[0]).remove) setSel(new Set());
  }

  // eslint-disable-next-line react-hooks/purity -- only used for the year list
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: thisYear - 2014 }, (_, i) => thisYear - i);

  // Grouped by rough date, in the order they came back (newest first).
  const groups: { label: string; list: EventPhoto[] }[] = [];
  for (const p of (photos ?? []).filter((x) => matchesFilter(x, filter))) {
    const label = when(p);
    const g = groups.find((x) => x.label === label);
    if (g) g.list.push(p);
    else groups.push({ label, list: [p] });
  }

  return (
    <section id="photos" className="mt-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
        Photo Hub
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
        {kinds.length > 0 && (
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            aria-label="Event type"
            className={`mt-2 rounded-lg bg-white px-2 py-1.5 text-sm ring-1 ring-black/10 ${kind ? "" : "text-stone-400"}`}
          >
            <option value="">Event type (optional)</option>
            {kinds.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-stone-500">Tags (optional):</span>
          {PHOTO_TAGS.map((t) => {
            const on = tags.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() =>
                  setTags(on ? tags.filter((x) => x !== t.id) : [...tags, t.id])
                }
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${on ? "bg-navy text-white ring-navy" : "bg-white text-stone-600 ring-stone-300"}`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <div className="mt-2">
          <PhotoUploader
            teamId={teamId}
            eventId={null}
            extra={{
              taken_year: year ? Number(year) : null,
              taken_month: year && month ? Number(month) : null,
              caption: caption.trim() || null,
              tags,
              event_kind: kind || null,
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
        <>
          {moved && (
            <p className="mt-3 rounded-xl bg-cyan/15 px-3 py-2 text-sm text-navy">
              {moved}
            </p>
          )}
          <div className="mt-3">
            <div className="flex items-start justify-between gap-3">
              <TagFilter photos={photos} value={filter} onChange={setFilter} />
              {photos.length > 1 && !sel && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(null);
                    setSel(new Set());
                  }}
                  className="ml-auto shrink-0 text-sm font-medium text-stone-500 hover:text-stone-800 hover:underline"
                >
                  Select
                </button>
              )}
            </div>
          </div>
          {groups.map((g) => (
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
                    teamId={teamId}
                    open={open === p.id}
                    onToggle={() => setOpen(open === p.id ? null : p.id)}
                    onChange={(c) => change(p, c)}
                    canRemove
                    kinds={kinds}
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
            </div>
          ))}
        </>
      )}
      {sel && photos && (
        <>
          <div className="h-40" aria-hidden />
          <BulkBar
            photos={photos.filter((p) => sel.has(p.id))}
            total={photos.filter((x) => matchesFilter(x, filter)).length}
            onApply={bulk}
            onSelectAll={() =>
              setSel(
                new Set(
                  photos
                    .filter((x) => matchesFilter(x, filter))
                    .map((p) => p.id),
                ),
              )
            }
            onDone={() => setSel(null)}
            canRemove
            kinds={kinds}
            events={events}
            onAttach={async (eventId) => {
              const ids = [...sel];
              const ev = events.find((e) => e.id === eventId);
              await createClient()
                .from("event_photos")
                .update({ event_id: eventId })
                .in("id", ids);
              setSel(null);
              setMoved(
                `${ids.length} photo${ids.length === 1 ? "" : "s"} moved to ${ev?.label ?? "the event"}. Find them on that event's page.`,
              );
              setReload((r) => r + 1);
            }}
          />
        </>
      )}
      <div className="mt-4 text-right">
        <button
          type="button"
          onClick={() =>
            loadRemovedCommunityPhotos(createClient(), teamId).then(setTrash)
          }
          className="text-xs font-medium text-stone-400 hover:text-stone-700 hover:underline"
        >
          Removed photos
        </button>
      </div>
      {trash && (
        <Sheet title="Removed photos" onClose={() => setTrash(null)}>
          {trash.length === 0 ? (
            <p className="text-sm text-stone-500">Nothing removed.</p>
          ) : (
            <>
              <p className="mb-3 text-sm text-stone-600">
                Tap Restore to put a photo back.
              </p>
              <ul className="grid grid-cols-3 gap-2">
                {trash.map((p) => (
                  <li key={p.id} className="space-y-1">
                    {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
                    <img
                      src={p.url}
                      alt={p.caption ?? ""}
                      className="aspect-square w-full rounded-xl object-cover opacity-70"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        setTrash((t) => (t ?? []).filter((x) => x.id !== p.id));
                        await createClient()
                          .from("event_photos")
                          .update({ archived_at: null })
                          .eq("id", p.id);
                        setReload((r) => r + 1);
                      }}
                      className="w-full rounded-lg py-1 text-xs font-semibold text-navy ring-1 ring-black/10 hover:bg-stone-50"
                    >
                      Restore
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Sheet>
      )}
    </section>
  );
}
