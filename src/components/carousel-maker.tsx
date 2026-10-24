"use client";

import { useState } from "react";
import { zipSync } from "fflate";
import type { EventPhoto } from "@/lib/event-photos";

// Instagram carousel from an event's photos: each photo full-bleed at 4:5,
// with the logo bubble top-right and www.activism.wtf bottom-left (like our
// usual posts). Shared straight to Instagram on a phone, or downloaded.

const MAX = 20;
const W = 1080;
const H = 1350;
const URL_TEXT = "www.activism.wtf";

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });

async function renderSlide(
  photo: HTMLImageElement,
  mark: HTMLImageElement,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  // Fill the frame, cropping the middle.
  const s = Math.max(W / photo.naturalWidth, H / photo.naturalHeight);
  const pw = photo.naturalWidth * s;
  const ph = photo.naturalHeight * s;
  ctx.drawImage(photo, (W - pw) / 2, (H - ph) / 2, pw, ph);

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
}: {
  photos: EventPhoto[];
  title: string;
}) {
  // Favourites first, then the rest, up to 20.
  const [order, setOrder] = useState<string[]>(() =>
    [...photos]
      .sort((a, b) => Number(b.favourite) - Number(a.favourite))
      .slice(0, MAX)
      .map((p) => p.id),
  );
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const [made, setMade] = useState<File[] | null>(null); // ready to share
  const byId = new Map(photos.map((p) => [p.id, p]));
  const chosen = order.map((id) => byId.get(id)).filter((p) => !!p);

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
    const mark = await loadImage("/brand/wtf-mark.png");
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const files: File[] = [];
    for (let i = 0; i < chosen.length; i++) {
      setBusy(`Making slide ${i + 1} of ${chosen.length}…`);
      const img = await loadImage(chosen[i].url);
      const blob = await renderSlide(img, mark);
      files.push(
        new File([blob], `${slug}-${String(i + 1).padStart(2, "0")}.jpg`, {
          type: "image/jpeg",
        }),
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
      <p className="text-xs font-medium text-stone-500">
        Tap photos to add them, in order (up to {MAX}). {chosen.length} chosen.
      </p>
      <div className="mt-1.5 grid grid-cols-5 gap-1.5 sm:grid-cols-6">
        {photos.map((p) => {
          const n = order.indexOf(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              className={`relative aspect-square overflow-hidden rounded-lg ring-2 ${n >= 0 ? "ring-pink" : "opacity-60 ring-transparent"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
              <img src={p.url} alt="" className="h-full w-full object-cover" />
              {n >= 0 && (
                <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-pink px-1 text-[11px] font-bold text-navy">
                  {n + 1}
                </span>
              )}
              {p.favourite && (
                <span className="absolute bottom-0.5 left-0.5 text-[10px]">
                  ⭐
                </span>
              )}
            </button>
          );
        })}
      </div>

      {chosen.length > 0 && (
        <>
          <p className="mt-4 text-xs font-medium text-stone-500">
            Preview · swipe through
          </p>
          <div className="mt-1.5 flex snap-x gap-2 overflow-x-auto rounded-2xl bg-stone-100 p-2">
            {chosen.map((p, i) => (
              <div key={p.id} className="w-40 shrink-0 snap-start">
                <div className="relative aspect-[4/5] overflow-hidden rounded-lg shadow">
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
                  <img
                    src={p.url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element -- static logo */}
                  <img
                    src="/brand/wtf-mark.png"
                    alt=""
                    className="absolute right-[4%] top-[3.3%] h-[5.3%] w-auto drop-shadow"
                  />
                  <span className="absolute bottom-[4%] left-[6.3%] text-[5px] font-medium text-white drop-shadow sm:text-[5.5px]">
                    {URL_TEXT}
                  </span>
                </div>
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
          </div>
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
            Share {made.length} slides
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
                ? `Download ${made.length} slides`
                : `Make ${chosen.length} slides`)}
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
        On your phone, Share lets you pick Instagram with every slide ready to
        post.
      </p>
    </div>
  );
}
