"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { distance, hashBlob, loadHashes, SAME_PHOTO } from "@/lib/photo-hash";

const MAX = 2000; // longest side, px

// Shrinks a photo on the phone before it's uploaded (fast on mobile data).
export async function shrink(file: File, max = MAX) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  const blob = await new Promise<Blob>((ok, fail) =>
    canvas.toBlob(
      (b) => (b ? ok(b) : fail(new Error("no image"))),
      "image/jpeg",
      0.82,
    ),
  );
  return { blob, w, h };
}

// "Add photos": pick several from the camera roll, upload them to the event,
// or with no event to the community's photos (with a rough date and a note).
export function PhotoUploader({
  teamId,
  eventId,
  extra,
  label = "Add photos",
  className = "rounded-xl bg-navy px-3 py-1.5 text-sm font-semibold text-white hover:bg-navy-2",
  onUploaded,
  droppable = false,
  dropLabel = "Drop photos to add them",
  dropHint,
}: {
  teamId: string;
  eventId: string | null;
  extra?: {
    taken_year?: number | null;
    taken_month?: number | null;
    caption?: string | null;
    tags?: string[];
    event_kind?: string | null;
  };
  label?: string;
  className?: string;
  onUploaded?: (ids: string[]) => void; // e.g. the graphics panel reloads its photos
  droppable?: boolean; // photos dragged anywhere onto the page upload here
  dropLabel?: string;
  dropHint?: string;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");

  const [dragging, setDragging] = useState(false);
  const uploadRef = useRef<(files: File[]) => void>(() => {});

  // Drag and drop (Kai, 5 Nov 2026): drop photos anywhere on the page.
  useEffect(() => {
    if (!droppable) return;
    let depth = 0;
    const hasFiles = (e: DragEvent) =>
      !!e.dataTransfer && [...e.dataTransfer.types].includes("Files");
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth++;
      setDragging(true);
    };
    const over = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      e.dataTransfer!.dropEffect = "copy";
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (!depth) setDragging(false);
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      const files = [...(e.dataTransfer?.files ?? [])].filter((f) =>
        f.type.startsWith("image/"),
      );
      if (files.length) uploadRef.current(files);
      else setStatus("Only photos can be added here.");
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
    };
  }, [droppable]);

  async function upload(files: FileList | File[]) {
    const supabase = createClient();
    const list = [...files];
    let done = 0;
    let failed = 0;
    let dupes = 0; // look like a photo already in the hub
    const ids: string[] = [];
    const known = [...(await loadHashes(supabase, teamId)).values()];
    for (const file of list) {
      setStatus(`Uploading ${done + failed + 1} of ${list.length}…`);
      try {
        const { blob, w, h } = await shrink(file);
        const phash = await hashBlob(blob);
        if (phash && known.some((k) => distance(k, phash) <= SAME_PHOTO))
          dupes++;
        const id = crypto.randomUUID();
        const path = `${teamId}/${eventId ?? "library"}/${id}.jpg`;
        const up = await supabase.storage
          .from("event-photos")
          .upload(path, blob, { contentType: "image/jpeg" });
        if (up.error) throw up.error;
        const row = await supabase.from("event_photos").insert({
          id,
          team_id: teamId,
          event_id: eventId,
          path,
          width: w,
          height: h,
          phash,
          ...extra,
        });
        if (row.error) throw row.error;
        if (phash) known.push(phash);
        ids.push(id);
        done++;
      } catch {
        failed++;
      }
    }
    setStatus(
      (failed
        ? `${done} uploaded, ${failed} didn't work. Try those again?`
        : `${done} photo${done === 1 ? "" : "s"} added ✓`) +
        (dupes
          ? ` ${dupes} look${dupes === 1 ? "s" : ""} like ${dupes === 1 ? "a photo" : "photos"} already in the Photo Hub: tidy up with Find duplicates.`
          : ""),
    );
    router.refresh();
    if (done) onUploaded?.(ids);
  }

  useEffect(() => {
    uploadRef.current = upload;
  });

  return (
    <span className="inline-flex items-center gap-2">
      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-navy/70 p-6">
          <div className="rounded-3xl border-4 border-dashed border-white/80 px-10 py-12 text-center text-white">
            <p className="text-2xl font-bold">{dropLabel}</p>
            {dropHint && (
              <p className="mt-1 text-sm text-white/80">{dropHint}</p>
            )}
          </div>
        </div>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) upload(e.target.files);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        className={className}
      >
        📷 {label}
      </button>
      {status && <span className="text-xs text-stone-500">{status}</span>}
    </span>
  );
}
