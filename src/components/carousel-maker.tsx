"use client";

import { useEffect, useRef, useState } from "react";
import { zipSync } from "fflate";
import { PHOTO_TAGS, type EventPhoto } from "@/lib/event-photos";
import { createClient } from "@/lib/supabase/client";
import { Option } from "@/components/copy-maker";
import {
  drawNextEvent,
  loadNextEvent,
  loadNextEventFonts,
  type NextEvent,
} from "@/components/next-event-slide";

// Carousel (Instagram or Facebook) from an event's photos: each photo full-bleed at 4:5,
// with the logo bubble top-right and www.activism.wtf bottom-left (like our
// usual posts). Shared straight to Instagram on a phone, or downloaded.

const MAX = 20;
const W = 1080;
const H = 1350; // portrait 4:5; other shapes work out their own height

// Every slide in an Instagram carousel has the first slide's shape: portrait
// 4:5, square, or the first photo's own shape (kept within 4:5 to 1.91:1).
type Shape = "portrait" | "square" | "original";
const SHAPES: { id: Shape; label: string }[] = [
  { id: "portrait", label: "Portrait 4:5" },
  { id: "square", label: "Square" },
  { id: "original", label: "Original" },
];
const heightFor = (shape: Shape, firstRatio: number | null) =>
  shape === "square"
    ? W
    : shape === "original" && firstRatio
      ? Math.round(W / Math.min(1.91, Math.max(0.8, firstRatio)))
      : H;
const URL_TEXT = "www.activism.wtf";

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });

// x, y 0–1: which part of the photo shows; z: zoom (1 = just fills the frame).
type Pos = { x: number; y: number; z?: number };
const CENTRE: Pos = { x: 0.5, y: 0.5, z: 1 };

async function renderSlide(
  photo: HTMLImageElement,
  mark: HTMLImageElement | null, // null: no logo or website (Kai, 1 Nov 2026)
  pos: Pos,
  H: number,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  // Fill the frame, cropped where they dragged it (like CSS object-position).
  const s =
    Math.max(W / photo.naturalWidth, H / photo.naturalHeight) * (pos.z ?? 1);
  const pw = photo.naturalWidth * s;
  const ph = photo.naturalHeight * s;
  ctx.drawImage(photo, (W - pw) * pos.x, (H - ph) * pos.y, pw, ph);

  if (mark) {
    // Logo bubble, top right.
    const mh = 72;
    const mw = (mark.naturalWidth / mark.naturalHeight) * mh;
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 12;
    ctx.drawImage(mark, W - 44 - mw, 44, mw, mh);

    // Website, bottom left.
    const font =
      getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
    ctx.font = `500 34px ${font}`;
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 10;
    ctx.textBaseline = "alphabetic";
    ctx.fillText(URL_TEXT, 68, H - 66);
  }

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("no image"))),
      "image/jpeg",
      0.92,
    ),
  );
}

export function CarouselMaker({
  photos,
  title,
  onlyFavourites = false,
  keepOrder = false,
  teamId,
  eventId,
}: {
  teamId?: string; // to write a caption (organisers)
  eventId?: string; // the photos are from this event
  photos: EventPhoto[];
  title: string;
  onlyFavourites?: boolean; // start with just the favourites, in given order
  keepOrder?: boolean; // start with all of them, in the order given
}) {
  // Favourites first, then the rest, up to 20 (or just the favourites, or
  // all of them as given).
  const [order, setOrder] = useState<string[]>(() =>
    (keepOrder
      ? photos
      : onlyFavourites
        ? photos.filter((p) => p.favourite)
        : [...photos].sort((a, b) => Number(b.favourite) - Number(a.favourite))
    )
      .slice(0, MAX)
      .map((p) => p.id),
  );
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const [made, setMade] = useState<File[] | null>(null); // ready to share
  const [pos, setPos] = useState<Record<string, Pos>>({});
  const [editing, setEditing] = useState<string | null>(null); // double-clicked slide
  const [shape, setShape] = useState<Shape>("portrait");
  const [branded, setBranded] = useState(true); // WTF logo + website on slides
  const [ratios, setRatios] = useState<Record<string, number>>({}); // w / h, as loaded
  // Last slide: the next event of the same type (Kai, 11 Nov 2026).
  const [found, setNext] = useState<NextEvent | null>(null);
  const [withNext, setWithNext] = useState(true);
  const [nextPreview, setNextPreview] = useState<string | null>(null);
  // From the Photo Hub there's no event given: use the event most of the
  // chosen photos are from (Kai, 11 Nov 2026: "Where is it?").
  const counts = new Map<string, number>();
  for (const id of order) {
    const e = photos.find((p) => p.id === id)?.eventId;
    if (e) counts.set(e, (counts.get(e) ?? 0) + 1);
  }
  const fromEvent =
    eventId ?? [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  useEffect(() => {
    if (!fromEvent) return;
    let live = true;
    loadNextEvent(createClient(), fromEvent)
      .then((n) => {
        if (live) setNext(n);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [fromEvent]);
  // None of the chosen photos is from an event: no last slide.
  const next = fromEvent ? found : null;
  const setOne = (id: string, p: Pos) => {
    setPos((all) => ({ ...all, [id]: p }));
    setMade(null);
  };

  const byId = new Map(photos.map((p) => [p.id, p]));
  const chosen = order.map((id) => byId.get(id)).filter((p) => !!p);
  const slideH = heightFor(
    shape,
    chosen[0] ? (ratios[chosen[0].id] ?? null) : null,
  );

  const coverUrl = chosen[0]?.url ?? null;
  const slideCount = chosen.length + (next && withNext ? 1 : 0);
  // The next-event slide on a canvas, `width` wide (W for the real one).
  async function drawNext(width: number) {
    await loadNextEventFonts();
    const [photo, mark] = await Promise.all([
      coverUrl ? loadImage(coverUrl).catch(() => null) : null,
      branded ? loadImage("/brand/wtf-mark.png") : null,
    ]);
    const full = document.createElement("canvas");
    drawNextEvent(full, next!, W, slideH, photo, mark);
    if (width >= W) return full;
    const small = document.createElement("canvas");
    small.width = width;
    small.height = Math.round((width * slideH) / W);
    small.getContext("2d")!.drawImage(full, 0, 0, small.width, small.height);
    return small;
  }

  useEffect(() => {
    if (!next || !withNext) return;
    let live = true;
    drawNext(320)
      .then((c) => {
        if (live) setNextPreview(c.toDataURL("image/jpeg", 0.85));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
    // drawNext reads these; redraw when they change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [next, withNext, slideH, branded, coverUrl]);

  function toggle(id: string) {
    setNote("");
    setMade(null);
    setOrder((o) =>
      o.includes(id)
        ? o.filter((x) => x !== id)
        : o.length >= MAX
          ? o
          : [...o, id],
    );
  }

  function move(i: number, by: number) {
    setMade(null);
    setOrder((o) => {
      const n = [...o];
      const j = i + by;
      if (j < 0 || j >= n.length) return o;
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  }

  async function build(): Promise<File[]> {
    const mark = branded ? await loadImage("/brand/wtf-mark.png") : null;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const files: File[] = [];
    for (let i = 0; i < chosen.length; i++) {
      setBusy(`Making slide ${i + 1} of ${chosen.length}…`);
      const img = await loadImage(chosen[i].url);
      const blob = await renderSlide(
        img,
        mark,
        pos[chosen[i].id] ?? CENTRE,
        slideH,
      );
      files.push(
        new File([blob], `${slug}-${String(i + 1).padStart(2, "0")}.jpg`, {
          type: "image/jpeg",
        }),
      );
    }
    if (next && withNext) {
      setBusy("Making the next event slide…");
      const c = await drawNext(W);
      const blob = await new Promise<Blob>((resolve, reject) =>
        c.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("no image"))),
          "image/jpeg",
          0.92,
        ),
      );
      files.push(
        new File(
          [blob],
          `${slug}-${String(files.length + 1).padStart(2, "0")}.jpg`,
          { type: "image/jpeg" },
        ),
      );
    }
    return files;
  }

  async function make() {
    setNote("");
    try {
      setMade(await build());
    } catch {
      setNote("Something went wrong making the slides. Try again?");
    } finally {
      setBusy("");
    }
  }

  // Straight from a tap: phones only open the share menu right after one.
  async function share() {
    if (!made) return;
    setNote("");
    try {
      await navigator.share({ files: made });
    } catch (e) {
      if ((e as Error).name !== "AbortError")
        setNote("Couldn't open sharing here. Use Download instead.");
    }
  }
  const canShare =
    !!made &&
    typeof navigator !== "undefined" &&
    !!navigator.canShare?.({ files: made });

  async function downloadZip(given?: File[]) {
    setNote("");
    try {
      const files = given ?? made ?? (await build());
      setBusy("Zipping…");
      const entries: Record<string, Uint8Array> = {};
      for (const f of files)
        entries[f.name] = new Uint8Array(await f.arrayBuffer());
      const zip = zipSync(entries, { level: 0 });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(
        new Blob([zip as BlobPart], { type: "application/zip" }),
      );
      a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-carousel.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
    } catch {
      setNote("Something went wrong making the slides. Try again?");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="mt-3">
      <PhotoPicker
        photos={photos}
        order={order}
        max={MAX}
        onToggle={toggle}
        onMove={(from, to) => {
          setMade(null);
          setOrder((o) => {
            const n = [...o];
            const [x] = n.splice(from, 1);
            n.splice(to, 0, x);
            return n;
          });
        }}
      />

      {chosen.length > 0 && (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-stone-500">Shape:</span>
            {SHAPES.map((sh) => (
              <button
                key={sh.id}
                type="button"
                onClick={() => {
                  setShape(sh.id);
                  setMade(null);
                }}
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${shape === sh.id ? "bg-navy text-white ring-navy" : "bg-white text-stone-600 ring-stone-300"}`}
              >
                {sh.label}
              </button>
            ))}
            <label className="ml-auto flex items-center gap-1.5 text-xs text-stone-500">
              <input
                type="checkbox"
                checked={!branded}
                onChange={(e) => {
                  setBranded(!e.target.checked);
                  setMade(null);
                }}
              />
              No WTF logo
            </label>
          </div>
          <p className="mt-4 text-xs font-medium text-stone-500">
            Preview · drag a photo to move it, double-click to zoom and crop
          </p>
          <div className="mt-1.5 flex snap-x gap-2 overflow-x-auto rounded-2xl bg-stone-100 p-2">
            {chosen.map((p, i) => (
              <div key={p.id} className="w-44 shrink-0 snap-start">
                <SlideFrame
                  photo={p}
                  pos={pos[p.id] ?? CENTRE}
                  onPos={(np) => setOne(p.id, np)}
                  onDoubleClick={() => setEditing(p.id)}
                  className="rounded-lg shadow"
                  small
                  branded={branded}
                  aspect={W / slideH}
                  onRatio={(r) =>
                    setRatios((all) =>
                      all[p.id] === r ? all : { ...all, [p.id]: r },
                    )
                  }
                />
                <div className="mt-1 flex items-center justify-between text-xs text-stone-500">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="px-1.5 disabled:opacity-30"
                    aria-label="Move earlier"
                  >
                    ←
                  </button>
                  <span>{i + 1}</span>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === chosen.length - 1}
                    className="px-1.5 disabled:opacity-30"
                    aria-label="Move later"
                  >
                    →
                  </button>
                </div>
              </div>
            ))}
            {next && withNext && (
              <div className="w-44 shrink-0 snap-start">
                <div
                  className="overflow-hidden rounded-lg bg-navy shadow"
                  style={{ aspectRatio: `${W} / ${slideH}` }}
                >
                  {nextPreview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={nextPreview}
                      alt="Next event slide"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <p className="mt-1 text-center text-xs text-stone-500">
                  {chosen.length + 1} · Next event
                </p>
              </div>
            )}
          </div>
          {next && (
            <label className="mt-2 flex items-start gap-2 text-sm text-stone-600">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={withNext}
                onChange={(e) => {
                  setWithNext(e.target.checked);
                  setMade(null);
                }}
              />
              <span>
                End with the next {next.typeName ?? "event like this"}:{" "}
                <b className="font-semibold text-navy">
                  {new Intl.DateTimeFormat("en-AU", {
                    timeZone: next.tz,
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  }).format(new Date(next.startsAt))}
                </b>
              </span>
            </label>
          )}
        </>
      )}

      {note && <p className="mt-2 text-sm text-red-700">{note}</p>}
      <div className="mt-3 flex gap-2">
        {made && canShare ? (
          <button
            type="button"
            onClick={share}
            className="flex-1 rounded-xl bg-pink px-4 py-2.5 font-semibold text-navy hover:bg-pink-strong"
          >
            Share {made.length} slide{made.length === 1 ? "" : "s"}
          </button>
        ) : (
          <button
            type="button"
            onClick={made ? () => downloadZip() : make}
            disabled={!chosen.length || !!busy}
            className="flex-1 rounded-xl bg-pink px-4 py-2.5 font-semibold text-navy hover:bg-pink-strong disabled:opacity-50"
          >
            {busy ||
              (made
                ? `Download ${made.length} slide${made.length === 1 ? "" : "s"}`
                : `Make ${slideCount} slide${slideCount === 1 ? "" : "s"}`)}
          </button>
        )}
        <button
          type="button"
          onClick={() => downloadZip()}
          disabled={!chosen.length || !!busy}
          className="rounded-xl px-3 py-2.5 text-sm font-semibold text-navy ring-1 ring-black/10 hover:bg-white disabled:opacity-50"
        >
          Download
        </button>
      </div>
      <p className="mt-1.5 text-xs text-stone-500">
        On your phone, Share opens Instagram or Facebook with every slide ready
        to post.
      </p>
      {teamId && chosen.length > 0 && (
        <CaptionWriter teamId={teamId} eventId={eventId} photos={chosen} />
      )}
    </div>
  );
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

// Write a caption to post with the carousel, from what the photos show
// (their event types, tags, notes and dates).
export function CaptionWriter({
  teamId,
  eventId,
  photos,
  extra,
}: {
  teamId: string;
  eventId?: string;
  photos: EventPhoto[];
  extra?: string; // more to tell the writer (e.g. a monthly recap's events)
}) {
  const [open, setOpen] = useState(false);
  const [places, setPlaces] = useState<Set<"instagram" | "facebook">>(
    new Set(["instagram"]),
  );
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [options, setOptions] = useState<Record<string, string[]> | null>(null);
  const [round, setRound] = useState(0);

  function context() {
    const count = (xs: string[]) => {
      const m = new Map<string, number>();
      for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
      return [...m.entries()].map(([k, n]) => (n > 1 ? `${k} (${n})` : k));
    };
    const kinds = count(
      photos.flatMap((p) => (p.eventKind ? [p.eventKind] : [])),
    );
    const tags = count(
      photos.flatMap((p) =>
        p.tags.map((t) => PHOTO_TAGS.find((x) => x.id === t)?.label ?? t),
      ),
    );
    const notes = [
      ...new Set(photos.flatMap((p) => (p.caption ? [p.caption] : []))),
    ];
    const dates = [
      ...new Set(
        photos.flatMap((p) =>
          p.takenYear
            ? [
                `${p.takenMonth ? MONTH_NAMES[p.takenMonth - 1] + " " : ""}${p.takenYear}`,
              ]
            : [],
        ),
      ),
    ];
    return [
      `${photos.length} photos`,
      kinds.length ? `events: ${kinds.join(", ")}` : "",
      tags.length ? `showing: ${tags.join(", ")}` : "",
      notes.length ? `notes: ${notes.join("; ")}` : "",
      dates.length ? `taken: ${dates.join(", ")}` : "",
      extra ?? "",
    ]
      .filter(Boolean)
      .join(". ");
  }

  async function write() {
    setError("");
    setBusy(true);
    const { data, error: e } = await createClient().functions.invoke(
      "write-copy",
      {
        body: {
          purpose: "carousel",
          teamId,
          eventId,
          platforms: [...places],
          note,
          context: context(),
        },
      },
    );
    setBusy(false);
    let msg = data?.error as string | undefined;
    if (!msg && e && "context" in e) {
      try {
        msg = (await (e.context as Response).json()).error;
      } catch {}
    }
    if (e || msg)
      return setError(msg ?? "Couldn't write that. Please try again.");
    setOptions(data.options);
    setRound((r) => r + 1);
  }

  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 w-full rounded-xl px-3 py-2.5 text-sm font-semibold text-navy ring-1 ring-black/10 hover:bg-white"
      >
        Write caption
      </button>
    );

  return (
    <div className="mt-3 rounded-2xl bg-white p-3 ring-1 ring-black/5">
      <div className="flex flex-wrap gap-1.5">
        {(["instagram", "facebook"] as const).map((pl) => {
          const on = places.has(pl);
          return (
            <button
              key={pl}
              type="button"
              onClick={() => {
                const n = new Set(places);
                if (on) n.delete(pl);
                else n.add(pl);
                setPlaces(n);
              }}
              className={`rounded-full px-3 py-1 text-sm font-medium ring-1 ${on ? "bg-navy text-white ring-navy" : "bg-white text-stone-600 ring-stone-300"}`}
            >
              {pl === "instagram" ? "Instagram" : "Facebook"}
            </button>
          );
        })}
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Anything to mention? (optional) e.g. our biggest coworking day yet"
        className="mt-2 w-full rounded-xl bg-white p-2 text-sm ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-cyan"
      />
      <button
        type="button"
        disabled={busy || places.size === 0}
        onClick={write}
        className="mt-2 w-full rounded-xl bg-pink px-4 py-2 text-sm font-semibold text-navy hover:bg-pink-strong disabled:opacity-60"
      >
        {busy ? "Writing…" : options ? "Write new options" : "Write it"}
      </button>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      {options &&
        (["instagram", "facebook"] as const)
          .filter((pl) => options[pl]?.length)
          .map((pl) => (
            <section key={`${pl}-${round}`} className="mt-3">
              <h3 className="mb-1.5 text-sm font-semibold">
                {pl === "instagram" ? "Instagram" : "Facebook"}
              </h3>
              <ul className="space-y-2">
                {options[pl].map((t, i) => (
                  <Option key={i} text={t} />
                ))}
              </ul>
            </section>
          ))}
    </div>
  );
}

// One set of photos: the chosen ones first, in slide order (drag to
// reorder, tap to take out), then the rest, faded (tap to add).
export function PhotoPicker({
  photos,
  order,
  max,
  onToggle,
  onMove,
}: {
  photos: EventPhoto[];
  order: string[];
  max: number;
  onToggle: (id: string) => void;
  onMove: (from: number, to: number) => void;
}) {
  const [from, setFrom] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false); // moved past a tap
  const start = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const byId = new Map(photos.map((p) => [p.id, p]));
  const chosen = order.map((id) => byId.get(id)).filter((p) => !!p);
  const rest = photos.filter((p) => !order.includes(p.id));

  const indexAt = (x: number, y: number) => {
    for (const el of document.elementsFromPoint(x, y)) {
      const i = (el as HTMLElement).dataset?.slide;
      if (i !== undefined) return Number(i);
    }
    return null;
  };
  const end = () => {
    setFrom(null);
    setOver(null);
    setDragging(false);
    start.current = null;
  };

  return (
    <div>
      <p className="text-xs font-medium text-stone-500">
        Tap to add or take out, drag to reorder (up to {max}). {chosen.length}{" "}
        chosen.
      </p>
      <div className="mt-1.5 grid grid-cols-5 gap-1.5 sm:grid-cols-6">
        {chosen.map((p, i) => (
          <div
            key={p.id}
            data-slide={i}
            role="button"
            aria-label={`Slide ${i + 1}: drag to move, tap to take out`}
            onPointerDown={(e) => {
              e.preventDefault();
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              start.current = { x: e.clientX, y: e.clientY, moved: false };
              setFrom(i);
              setOver(i);
            }}
            onPointerMove={(e) => {
              const st = start.current;
              if (!st || from === null) return;
              if (
                !st.moved &&
                Math.hypot(e.clientX - st.x, e.clientY - st.y) > 6
              )
                st.moved = true;
              if (!st.moved) return;
              const at = indexAt(e.clientX, e.clientY);
              if (at !== null) setOver(at);
            }}
            onPointerUp={() => {
              const st = start.current;
              if (st && !st.moved) onToggle(p.id);
              else if (from !== null && over !== null && over !== from)
                onMove(from, over);
              end();
            }}
            onPointerCancel={end}
            style={{ touchAction: "none" }}
            className={`relative aspect-square cursor-grab select-none overflow-hidden rounded-lg ring-2 transition active:cursor-grabbing ${
              from === i && dragging
                ? "opacity-40 ring-pink"
                : over === i && from !== null && from !== i
                  ? "scale-105 ring-navy"
                  : "ring-pink"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
            <img
              src={p.url}
              alt=""
              draggable={false}
              className="pointer-events-none h-full w-full object-cover"
            />
            <span className="pointer-events-none absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-pink px-1 text-[11px] font-bold text-navy">
              {i + 1}
            </span>
          </div>
        ))}
        {rest.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onToggle(p.id)}
            disabled={chosen.length >= max}
            className="relative aspect-square overflow-hidden rounded-lg opacity-50 ring-2 ring-transparent hover:opacity-80"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
            <img src={p.url} alt="" className="h-full w-full object-cover" />
            {p.favourite && (
              <span className="absolute bottom-0.5 left-0.5 text-[10px]">
                ⭐
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// One slide at 4:5, as it'll come out: drag to move the photo in the frame.
// Zoom (pos.z) scales around the same point the canvas uses, so it matches.
function SlideFrame({
  photo,
  pos,
  onPos,
  onDoubleClick,
  className = "",
  small = false,
  branded = true,
  aspect,
  onRatio,
}: {
  branded?: boolean;
  aspect: number; // width / height of the slide
  onRatio?: (r: number) => void; // the photo's own shape, once loaded
  photo: EventPhoto;
  pos: Pos;
  onPos: (p: Pos) => void;
  onDoubleClick?: () => void;
  className?: string;
  small?: boolean;
}) {
  const drag = useRef<{ x: number; y: number } | null>(null);
  const z = pos.z ?? 1;
  return (
    <div
      style={{ aspectRatio: aspect }}
      className={`relative cursor-grab touch-none select-none overflow-hidden active:cursor-grabbing ${className}`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        const img = e.currentTarget.querySelector("img");
        if (!d || !img?.naturalWidth) return;
        const box = e.currentTarget.getBoundingClientRect();
        const s =
          Math.max(
            box.width / img.naturalWidth,
            box.height / img.naturalHeight,
          ) * z;
        const overX = img.naturalWidth * s - box.width;
        const overY = img.naturalHeight * s - box.height;
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        drag.current = { x: e.clientX, y: e.clientY };
        const clamp = (n: number) => Math.min(1, Math.max(0, n));
        onPos({
          z,
          x: overX > 0.5 ? clamp(pos.x - dx / overX) : 0.5,
          y: overY > 0.5 ? clamp(pos.y - dy / overY) : 0.5,
        });
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      onDoubleClick={onDoubleClick}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
      <img
        src={photo.url}
        alt=""
        draggable={false}
        onLoad={(e) =>
          onRatio?.(
            e.currentTarget.naturalWidth / e.currentTarget.naturalHeight,
          )
        }
        style={{
          objectPosition: `${pos.x * 100}% ${pos.y * 100}%`,
          transform: z !== 1 ? `scale(${z})` : undefined,
          transformOrigin: `${pos.x * 100}% ${pos.y * 100}%`,
        }}
        className="pointer-events-none h-full w-full object-cover"
      />
      {branded && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- static logo */}
          <img
            src="/brand/wtf-mark.png"
            alt=""
            className="absolute right-[4%] top-[3.3%] h-[5.3%] w-auto drop-shadow"
          />
          <span
            className={`absolute bottom-[4%] left-[6.3%] font-medium text-white drop-shadow ${small ? "text-[5px] sm:text-[5.5px]" : "text-[9px]"}`}
          >
            {URL_TEXT}
          </span>
        </>
      )}
    </div>
  );
}
