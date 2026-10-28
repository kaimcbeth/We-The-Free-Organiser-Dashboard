"use client";

import { useRef, useState } from "react";
import { Sheet } from "@/components/sheet";
import { createClient } from "@/lib/supabase/client";

// A light crop tool: drag the box to move it, drag a corner to resize, or
// pick a shape. Saving uploads the cropped copy and makes it the photo; the
// original file is kept so the crop can be reset.

type Box = { x: number; y: number; w: number; h: number }; // 0-1 of the image
type Corner = "nw" | "ne" | "sw" | "se";

const SHAPES: { id: string; label: string; ratio: number | null }[] = [
  { id: "free", label: "Free", ratio: null },
  { id: "square", label: "Square", ratio: 1 },
  { id: "portrait", label: "Portrait 4:5", ratio: 4 / 5 },
  { id: "story", label: "Story 9:16", ratio: 9 / 16 },
  { id: "wide", label: "Wide 16:9", ratio: 16 / 9 },
];
const MIN = 0.08; // smallest box, as a share of the image

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

// The biggest centred box of this shape (ratio is width / height in pixels).
function fit(ratio: number | null, aspect: number): Box {
  if (!ratio) return { x: 0.05, y: 0.05, w: 0.9, h: 0.9 };
  // In image fractions: h = w * aspect / ratio.
  let w = 1;
  let h = aspect / ratio;
  if (h > 1) {
    w = ratio / aspect;
    h = 1;
  }
  w *= 0.9;
  h *= 0.9;
  return { x: (1 - w) / 2, y: (1 - h) / 2, w, h };
}

export function PhotoCrop({
  photo,
  onSaved,
  onClose,
}: {
  photo: {
    id: string;
    url: string;
    teamId: string;
    eventId: string | null;
  };
  onSaved: (url: string) => void;
  onClose: () => void;
}) {
  const img = useRef<HTMLImageElement>(null);
  // Natural width / height, read from the image itself (it may have loaded
  // before the page was ready to hear about it).
  const aspectOf = () => {
    const i = img.current;
    return i && i.naturalWidth ? i.naturalWidth / i.naturalHeight : 1;
  };
  const [shape, setShape] = useState("free");
  const [box, setBox] = useState<Box>(fit(null, 1));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const drag = useRef<{
    mode: "move" | Corner;
    startX: number;
    startY: number;
    start: Box;
    rect: DOMRect;
  } | null>(null);
  const ratio = SHAPES.find((s) => s.id === shape)?.ratio ?? null;

  function begin(e: React.PointerEvent, mode: "move" | Corner) {
    if (!img.current) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      start: box,
      rect: img.current.getBoundingClientRect(),
    };
  }

  function move(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / d.rect.width;
    const dy = (e.clientY - d.startY) / d.rect.height;
    const s = d.start;
    if (d.mode === "move") {
      setBox({
        ...s,
        x: clamp(s.x + dx, 0, 1 - s.w),
        y: clamp(s.y + dy, 0, 1 - s.h),
      });
      return;
    }
    // Resize: the opposite corner stays put.
    const west = d.mode === "nw" || d.mode === "sw";
    const north = d.mode === "nw" || d.mode === "ne";
    const fx = west ? s.x + s.w : s.x; // fixed corner
    const fy = north ? s.y + s.h : s.y;
    const px = clamp((west ? s.x : s.x + s.w) + dx, 0, 1);
    const py = clamp((north ? s.y : s.y + s.h) + dy, 0, 1);
    let w = Math.max(MIN, Math.abs(px - fx));
    let h = Math.max(MIN, Math.abs(py - fy));
    const maxW = west ? fx : 1 - fx;
    const maxH = north ? fy : 1 - fy;
    w = Math.min(w, maxW);
    h = Math.min(h, maxH);
    if (ratio) {
      const aspect = aspectOf();
      // Keep the shape: follow the width, and shrink if it won't fit.
      h = (w * aspect) / ratio;
      if (h > maxH) {
        h = maxH;
        w = (h * ratio) / aspect;
      }
    }
    setBox({ x: west ? fx - w : fx, y: north ? fy - h : fy, w, h });
  }

  async function save() {
    setError("");
    setBusy(true);
    try {
      // Load a fresh copy that's allowed onto a canvas.
      const source = new Image();
      source.crossOrigin = "anonymous";
      source.src = photo.url;
      await source.decode();
      const W = source.naturalWidth;
      const H = source.naturalHeight;
      const sx = Math.round(box.x * W);
      const sy = Math.round(box.y * H);
      const sw = Math.round(box.w * W);
      const sh = Math.round(box.h * H);
      const canvas = document.createElement("canvas");
      canvas.width = sw;
      canvas.height = sh;
      canvas.getContext("2d")!.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh);
      const blob = await new Promise<Blob>((ok, fail) =>
        canvas.toBlob(
          (b) => (b ? ok(b) : fail(new Error("no image"))),
          "image/jpeg",
          0.9,
        ),
      );
      const db = createClient();
      const { data: row } = await db
        .from("event_photos")
        .select("path, original_path")
        .eq("id", photo.id)
        .single();
      if (!row) throw new Error("missing");
      const path = `${photo.teamId}/${photo.eventId ?? "library"}/${crypto.randomUUID()}.jpg`;
      const up = await db.storage
        .from("event-photos")
        .upload(path, blob, { contentType: "image/jpeg" });
      if (up.error) throw up.error;
      const done = await db
        .from("event_photos")
        .update({
          path,
          width: sw,
          height: sh,
          original_path: row.original_path ?? row.path,
        })
        .eq("id", photo.id);
      if (done.error) throw done.error;
      const { data: signed } = await db.storage
        .from("event-photos")
        .createSignedUrl(path, 3600);
      onSaved(signed?.signedUrl ?? photo.url);
    } catch {
      setError("Couldn't save the crop. Please try again.");
      setBusy(false);
    }
  }

  const place = {
    left: `${box.x * 100}%`,
    top: `${box.y * 100}%`,
    width: `${box.w * 100}%`,
    height: `${box.h * 100}%`,
  };

  const corner = (c: Corner) => {
    const pos = {
      nw: "-left-2 -top-2 cursor-nwse-resize",
      ne: "-right-2 -top-2 cursor-nesw-resize",
      sw: "-bottom-2 -left-2 cursor-nesw-resize",
      se: "-bottom-2 -right-2 cursor-nwse-resize",
    }[c];
    return (
      <span
        key={c}
        onPointerDown={(e) => begin(e, c)}
        className={`absolute h-5 w-5 rounded-full border-2 border-navy bg-white ${pos}`}
        style={{ touchAction: "none" }}
      />
    );
  };

  return (
    <Sheet title="Crop photo" onClose={onClose}>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {SHAPES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              setShape(s.id);
              setBox(fit(s.ratio, aspectOf()));
            }}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${shape === s.id ? "bg-navy text-white ring-navy" : "bg-white text-stone-600 ring-stone-300"}`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div
        className="relative mx-auto w-fit select-none"
        onPointerMove={move}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        style={{ touchAction: "none" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
        <img
          ref={img}
          src={photo.url}
          alt=""
          crossOrigin="anonymous"
          draggable={false}
          onLoad={() => setBox(fit(ratio, aspectOf()))}
          className="block max-h-[55vh] max-w-full"
        />
        {/* Darken what's cut off (kept inside the photo). */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute"
            style={{
              ...place,
              boxShadow: "0 0 0 9999px rgba(7,17,48,0.55)",
            }}
          />
        </div>
        <div
          onPointerDown={(e) => begin(e, "move")}
          className="absolute cursor-move border-2 border-white"
          style={{ ...place, touchAction: "none" }}
        >
          {(["nw", "ne", "sw", "se"] as Corner[]).map(corner)}
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-stone-500">
        Drag the box to move it, or a corner to resize.
      </p>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      <button
        type="button"
        disabled={busy}
        onClick={save}
        className="mt-3 w-full rounded-xl bg-pink px-4 py-2.5 font-semibold text-navy hover:bg-pink-strong disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save crop"}
      </button>
    </Sheet>
  );
}

// Back to the uncropped photo.
export async function resetCrop(id: string) {
  const db = createClient();
  const { data: row } = await db
    .from("event_photos")
    .select("original_path")
    .eq("id", id)
    .single();
  if (!row?.original_path) return null;
  const { error } = await db
    .from("event_photos")
    .update({
      path: row.original_path,
      original_path: null,
      width: null,
      height: null,
    })
    .eq("id", id);
  if (error) return null;
  const { data } = await db.storage
    .from("event-photos")
    .createSignedUrl(row.original_path, 3600);
  return data?.signedUrl ?? null;
}
