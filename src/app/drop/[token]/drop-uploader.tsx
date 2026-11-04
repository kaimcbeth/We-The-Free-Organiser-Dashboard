"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { shrink } from "@/components/photo-uploader";
import { hashBlob } from "@/lib/photo-hash";

// Uploads photos through a temporary link: shrinks each one, puts it in the
// link's folder, then adds it to the Photo Hub (add_dropped_photo).
export function DropUploader({
  token,
  teamId,
  eventId,
}: {
  token: string;
  teamId: string;
  eventId: string | null;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [total, setTotal] = useState(0);
  const [ended, setEnded] = useState(false);

  async function upload(files: File[]) {
    const list = files.filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    const supabase = createClient();
    setBusy(true);
    let done = 0;
    let failed = 0;
    for (const file of list) {
      setStatus(`Uploading ${done + failed + 1} of ${list.length}…`);
      try {
        const { blob, w, h } = await shrink(file);
        const phash = (await hashBlob(blob)) ?? "";
        const path = `${teamId}/${eventId ?? "library"}/drop-${token}-${crypto.randomUUID()}.jpg`;
        const up = await supabase.storage
          .from("event-photos")
          .upload(path, blob, { contentType: "image/jpeg" });
        if (up.error) throw up.error;
        const { data } = await supabase.rpc("add_dropped_photo", {
          p_token: token,
          p_path: path,
          p_width: w,
          p_height: h,
          p_phash: phash,
          p_name: name,
        });
        if (data === "ended") {
          setEnded(true);
          break;
        }
        if (data !== "ok") throw new Error(String(data));
        done++;
      } catch {
        failed++;
      }
    }
    setBusy(false);
    setTotal((t) => t + done);
    setStatus(
      failed
        ? `${done} added, ${failed} didn't work. Try those again?`
        : `${done} photo${done === 1 ? "" : "s"} added. Thank you!`,
    );
  }

  if (ended)
    return (
      <p className="mt-6 rounded-2xl bg-white p-4 text-stone-700 shadow-sm ring-1 ring-black/5">
        This link has just ended
        {total
          ? `, but your ${total} photo${total === 1 ? " is" : "s are"} in`
          : ""}
        . Ask an organiser for a new QR code to add more.
      </p>
    );

  return (
    <div className="mt-6 space-y-4">
      <label className="block">
        <span className="text-sm font-medium text-stone-700">
          Your name (optional)
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="So we know who took them"
          className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5"
        />
      </label>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          upload(files);
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!busy) upload([...e.dataTransfer.files]);
        }}
        className="flex w-full flex-col items-center justify-center gap-1 rounded-3xl border-2 border-dashed border-pink bg-pink/10 px-4 py-10 text-navy hover:bg-pink/15 disabled:opacity-60"
      >
        <span className="text-xl font-bold">
          {total ? "Add more photos" : "Choose photos"}
        </span>
        <span className="text-sm text-stone-600">
          From your camera roll (or drop them here on a computer)
        </span>
      </button>
      {status && (
        <p
          className={`text-center ${status.includes("Thank") ? "font-semibold text-navy" : "text-stone-600"}`}
        >
          {status}
        </p>
      )}
    </div>
  );
}
