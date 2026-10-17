"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/avatar";

const SIZE = 512;

// Crop to a centred square and shrink, so uploads are small and quick.
async function toSquareJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    SIZE,
    SIZE,
  );
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.85),
  );
}

export function PhotoPicker({
  personId,
  name,
  url,
  size = 88,
}: {
  personId: string;
  name: string;
  url: string | null;
  size?: number;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const shown = preview ?? url;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const blob = await toSquareJpeg(file);
      setPreview(URL.createObjectURL(blob));
      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(`${personId}.jpg`, blob, { upsert: true, contentType: "image/jpeg", cacheControl: "60" });
      if (upErr) throw upErr;
      const { error: rpcErr } = await supabase.rpc("set_person_photo", { p_person_id: personId, p_has_photo: true });
      if (rpcErr) throw rpcErr;
      router.refresh();
    } catch {
      setPreview(null);
      setError("Couldn't save the photo. Please try again.");
    }
    setBusy(false);
  }

  async function remove() {
    setBusy(true);
    setError("");
    const supabase = createClient();
    await supabase.storage.from("avatars").remove([`${personId}.jpg`]);
    const { error: rpcErr } = await supabase.rpc("set_person_photo", { p_person_id: personId, p_has_photo: false });
    if (rpcErr) setError("Couldn't remove the photo. Please try again.");
    setPreview(null);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        aria-label={shown ? "Change photo" : "Add photo"}
        className={`relative rounded-full ${busy ? "opacity-60" : ""}`}
      >
        <Avatar name={name} url={shown} size={size} />
        <span className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-pink text-navy ring-2 ring-background">
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7h3l1.5-2h5L14 7h3v9H3z" strokeLinejoin="round" />
            <circle cx="10" cy="11.5" r="2.75" />
          </svg>
        </span>
      </button>
      <div className="text-sm">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="font-semibold text-pink-ink"
        >
          {busy ? "Saving…" : shown ? "Change photo" : "Add photo"}
        </button>
        {shown && !busy && (
          <button type="button" onClick={remove} className="ml-3 text-stone-500 hover:text-stone-800">
            Remove
          </button>
        )}
        {error && <p className="mt-1 text-red-700">{error}</p>}
      </div>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={onFile} />
    </div>
  );
}
