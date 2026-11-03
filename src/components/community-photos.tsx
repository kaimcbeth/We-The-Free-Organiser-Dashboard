"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  loadCommunityPhotos,
  loadRemovedCommunityPhotos,
  PHOTO_TAGS,
  type EventPhoto,
  type PhotoTag,
} from "@/lib/event-photos";
import { PhotoUploader } from "@/components/photo-uploader";
import { duplicateSets, hashUrl, loadHashes } from "@/lib/photo-hash";
import { Sheet } from "@/components/sheet";
import { loadEventKinds } from "@/lib/event-kinds";
import {
  BulkBar,
  selectRange,
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
  const anchor = useRef<string | null>(null); // last photo clicked (shift-click)
  const [trash, setTrash] = useState<EventPhoto[] | null>(null); // Removed, open
  const [kinds, setKinds] = useState<string[]>([]); // from the event listings
  const [kind, setKind] = useState(""); // for the next upload
  const [uploadEvent, setUploadEvent] = useState(""); // event for the next upload
  const [events, setEvents] = useState<{ id: string; label: string }[]>([]);
  const [moved, setMoved] = useState(""); // after attaching to an event
  const [dupSets, setDupSets] = useState<string[][] | null>(null); // Find duplicates
  const [dupNote, setDupNote] = useState(""); // progress / result

  useEffect(() => {
    let live = true;
    loadEventKinds(createClient(), teamId).then((k) => {
      if (live) setKinds(k);
    });
    // Events to attach photos to: every past event (incl. ones imported from
    // activism.wtf's history) and the next month. Older years show the year.
    const thisYear = new Date().getFullYear();
    createClient()
      .from("events")
      .select("id, title, starts_at")
      .eq("team_id", teamId)
      .lte("starts_at", new Date(Date.now() + 31 * 864e5).toISOString())
      .order("starts_at", { ascending: false })
      .limit(500)
      .then(({ data }) => {
        if (live)
          setEvents(
            (data ?? []).map((e) => {
              const d = new Date(e.starts_at as string);
              const date = d.toLocaleDateString("en-AU", {
                day: "numeric",
                month: "short",
                ...(d.getFullYear() !== thisYear ? { year: "numeric" } : {}),
              });
              return { id: e.id as string, label: `${date}: ${e.title}` };
            }),
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
    // A new event or date moves the photo to another month: reload so it's
    // grouped (and dated by its event) right.
    const moved = c.eventId !== undefined || c.takenYear !== undefined;
    savePhoto(p.id, c).then(() => moved && setReload((r) => r + 1));
  }

  // Fingerprints every photo (saved ones are reused), groups look-alikes and
  // ticks the extra copies, keeping the best one in each set.
  async function findDuplicates() {
    const list = photos ?? [];
    setOpen(null);
    setSel(null);
    setDupNote("Checking photos…");
    const db = createClient();
    const known = await loadHashes(db, teamId);
    const todo = list.filter((p) => !known.has(p.id));
    let n = 0;
    const work = [...todo];
    await Promise.all(
      Array.from({ length: 4 }, async () => {
        for (let p = work.shift(); p; p = work.shift()) {
          const h = await hashUrl(p.url);
          if (h) {
            known.set(p.id, h);
            await db.from("event_photos").update({ phash: h }).eq("id", p.id);
          }
          setDupNote(`Checking photos… ${++n} of ${todo.length}`);
        }
      }),
    );
    const order = new Map(list.map((p, i) => [p.id, i]));
    const byId = new Map(list.map((p) => [p.id, p]));
    const score = (p: EventPhoto) =>
      (p.favourite ? 8 : 0) +
      (p.eventId ? 4 : 0) +
      p.tags.length +
      (p.caption ? 1 : 0) +
      (p.eventKind ? 1 : 0);
    const sets = duplicateSets(
      list
        .filter((p) => known.has(p.id))
        .map((p) => ({ id: p.id, hash: known.get(p.id)! })),
    )
      .map((ids) =>
        ids.sort(
          (a, b) =>
            score(byId.get(b)!) - score(byId.get(a)!) ||
            order.get(a)! - order.get(b)!,
        ),
      )
      .sort((a, b) => order.get(a[0])! - order.get(b[0])!);
    if (sets.length === 0) {
      setDupNote(
        todo.length > 0 && known.size < list.length
          ? "No duplicates found (a few photos couldn't be checked)."
          : "No duplicates found.",
      );
      return;
    }
    const extras = sets.flatMap((ids) => ids.slice(1));
    setDupSets(sets);
    setSel(new Set(extras));
    setDupNote(
      `${sets.length} set${sets.length === 1 ? "" : "s"} of look-alike photos. The ${extras.length} extra ${extras.length === 1 ? "copy is" : "copies are"} ticked; the first in each set is kept (favourites and photos on an event come first). Check them, then press Remove. Removed photos can be restored.`,
    );
  }

  function closeDuplicates() {
    setDupSets(null);
    setSel(null);
    setDupNote("");
  }

  function bulk(make: (p: EventPhoto) => PhotoChange) {
    const chosen = (photos ?? []).filter((x) => sel?.has(x.id));
    for (const p of chosen) change(p, make(p));
    if (chosen.length && make(chosen[0]).remove) setSel(new Set());
  }

  // eslint-disable-next-line react-hooks/purity -- only used for the year list
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: thisYear - 2014 }, (_, i) => thisYear - i);

  // Grouped by rough date, in the order they came back (newest first); or,
  // after Find duplicates, by look-alike set (removed ones drop out).
  const groups: { label: string; list: EventPhoto[] }[] = [];
  if (dupSets) {
    const byId = new Map((photos ?? []).map((p) => [p.id, p]));
    for (const ids of dupSets) {
      const list = ids.flatMap((id) => byId.get(id) ?? []);
      if (list.length > 1)
        groups.push({ label: `Look-alikes ${groups.length + 1}`, list });
    }
  } else
    for (const p of (photos ?? []).filter((x) => matchesFilter(x, filter))) {
      const label = when(p);
      const g = groups.find((x) => x.label === label);
      if (g) g.list.push(p);
      else groups.push({ label, list: [p] });
    }
  const shown = groups.flatMap((g) => g.list);

  return (
    <section id="photos" className="mt-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
        Photo Hub
      </h2>
      <div className="rounded-2xl bg-white p-3 ring-1 ring-black/5">
        <p className="text-sm text-stone-600">
          Good photos from your events, or older ones. They&apos;re used on your
          promo graphics too.
        </p>
        <select
          value={uploadEvent}
          onChange={(e) => setUploadEvent(e.target.value)}
          aria-label="Event"
          className={`mt-3 w-full max-w-md rounded-lg bg-white px-2 py-1.5 text-sm ring-1 ring-black/10 ${uploadEvent ? "" : "text-stone-400"}`}
        >
          <option value="">Event (optional)</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.label}
            </option>
          ))}
        </select>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {!uploadEvent && (
            <>
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
            </>
          )}
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value.slice(0, 120))}
            placeholder="Note (optional), e.g. Bondi outreach"
            className="min-w-0 basis-full rounded-lg bg-white px-2 py-1.5 text-sm ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-cyan"
          />
        </div>
        {kinds.length > 0 && !uploadEvent && (
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
            eventId={uploadEvent || null}
            extra={
              uploadEvent
                ? // Dated and typed by the event.
                  { caption: caption.trim() || null, tags }
                : {
                    taken_year: year ? Number(year) : null,
                    taken_month: year && month ? Number(month) : null,
                    caption: caption.trim() || null,
                    tags,
                    event_kind: kind || null,
                  }
            }
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
            {(dupNote || dupSets) && (
              <div className="mb-3 rounded-xl bg-cyan/15 px-3 py-2 text-sm text-navy">
                {dupSets && groups.length === 0
                  ? "All tidied up: no look-alikes left."
                  : dupNote}{" "}
                {(dupSets || !dupNote.startsWith("Checking")) && (
                  <button
                    type="button"
                    onClick={closeDuplicates}
                    className="font-semibold underline"
                  >
                    {dupSets ? "Back to all photos" : "OK"}
                  </button>
                )}
              </div>
            )}
            <div className="flex items-start justify-between gap-3">
              {!dupSets && (
                <TagFilter
                  photos={photos}
                  value={filter}
                  onChange={setFilter}
                />
              )}
              {photos.length > 1 && !sel && !dupSets && (
                <button
                  type="button"
                  onClick={findDuplicates}
                  disabled={dupNote.startsWith("Checking")}
                  className="ml-auto shrink-0 text-sm font-medium text-stone-500 hover:text-stone-800 hover:underline disabled:opacity-50"
                >
                  Find duplicates
                </button>
              )}
              {photos.length > 1 && !sel && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(null);
                    setSel(new Set());
                  }}
                  title="Or long-press a photo (Ctrl/Cmd-click on a computer; Shift-click to select a run of photos)"
                  className="shrink-0 text-sm font-medium text-stone-500 hover:text-stone-800 hover:underline"
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
                    events={events}
                    years={years}
                    graphic
                    selected={sel?.has(p.id)}
                    onModSelect={() => {
                      anchor.current = p.id;
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
                        ? () => {
                            anchor.current = p.id;
                            setSel((s) => {
                              const n = new Set(s);
                              if (n.has(p.id)) n.delete(p.id);
                              else n.add(p.id);
                              return n;
                            });
                          }
                        : undefined
                    }
                    onShiftSelect={() => {
                      const from = anchor.current;
                      anchor.current = p.id;
                      setOpen(null);
                      setSel((s) =>
                        selectRange(
                          s,
                          shown.map((x) => x.id),
                          from,
                          p.id,
                        ),
                      );
                    }}
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
            total={shown.length}
            onApply={bulk}
            onSelectAll={() => setSel(new Set(shown.map((p) => p.id)))}
            onDone={() => (dupSets ? closeDuplicates() : setSel(null))}
            canRemove
            kinds={kinds}
            events={events}
            teamId={teamId}
            onAttach={async (eventId) => {
              const ids = [...sel];
              const ev = events.find((e) => e.id === eventId);
              const off = eventId === "-";
              await createClient()
                .from("event_photos")
                .update({ event_id: off ? null : eventId })
                .in("id", ids);
              setSel(null);
              setMoved(
                off
                  ? `${ids.length} photo${ids.length === 1 ? "" : "s"} taken off ${ids.length === 1 ? "its event" : "their events"}. Set a month on ${ids.length === 1 ? "it" : "them"} from the photo's menu if you like.`
                  : `${ids.length} photo${ids.length === 1 ? "" : "s"} attached to ${ev?.label ?? "the event"}. They're on that event's page and still here in the Photo Hub.`,
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
