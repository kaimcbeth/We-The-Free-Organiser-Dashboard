"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MAX = 2000; // longest side, px

// Shrinks a photo on the phone before it's uploaded (fast on mobile data).
async function shrink(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
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
}: {
  teamId: string;
  eventId: string | null;
  extra?: {
    taken_year?: number | null;
    taken_month?: number | null;
    caption?: string | null;
    tags?: string[];
  };
  label?: string;
  className?: string;
  onUploaded?: () => void; // e.g. the graphics panel reloads its photos
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");

  async function upload(files: FileList) {
    const supabase = createClient();
    const list = [...files];
    let done = 0;
    let failed = 0;
    for (const file of list) {
      setStatus(`Uploading ${done + failed + 1} of ${list.length}…`);
      try {
        const { blob, w, h } = await shrink(file);
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
          ...extra,
        });
        if (row.error) throw row.error;
        done++;
      } catch {
        failed++;
      }
    }
    setStatus(
      failed
        ? `${done} uploaded, ${failed} didn't work. Try those again?`
        : `${done} photo${done === 1 ? "" : "s"} added ✓`,
    );
    router.refresh();
    if (done) onUploaded?.();
  }

  return (
    <span className="inline-flex items-center gap-2">
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
