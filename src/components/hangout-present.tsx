"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { drawHangoutSlide } from "@/components/hangout-slide";
import type { DeckSlide } from "@/lib/hangouts";

// Present: the slides full screen in the browser. Arrow keys / space / click
// move on; "Notes window" opens the speaker notes in a second window that
// follows along (and can move the slides) through a BroadcastChannel.

export type PresentMsg =
  | { type: "hello" }
  | { type: "go"; index: number; startedAt?: number }
  | { type: "move"; by: number }
  | { type: "bye" };

export const channelName = (planId: string) => `wtf-hangout-${planId}`;

export function HangoutPresent({
  deck,
  region,
  mark,
  start,
  planId,
  onClose,
}: {
  deck: DeckSlide[];
  region: string;
  mark: HTMLImageElement | null;
  start: number;
  planId: string;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(start);
  const [idle, setIdle] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const channel = useRef<BroadcastChannel | null>(null);
  const startedAt = useRef(0);
  const indexRef = useRef(start);
  const wasFull = useRef(false);

  const go = useCallback(
    (i: number) => {
      const n = Math.max(0, Math.min(deck.length - 1, i));
      indexRef.current = n;
      setIndex(n);
      channel.current?.postMessage({
        type: "go",
        index: n,
        startedAt: startedAt.current,
      } satisfies PresentMsg);
    },
    [deck.length],
  );

  useEffect(() => {
    startedAt.current = Date.now();
    const ch = new BroadcastChannel(channelName(planId));
    channel.current = ch;
    ch.onmessage = (e: MessageEvent<PresentMsg>) => {
      const m = e.data;
      if (m.type === "hello")
        ch.postMessage({
          type: "go",
          index: indexRef.current,
          startedAt: startedAt.current,
        } satisfies PresentMsg);
      if (m.type === "move") go(indexRef.current + m.by);
      if (m.type === "go") {
        indexRef.current = m.index;
        setIndex(m.index);
      }
    };
    ch.postMessage({
      type: "go",
      index: indexRef.current,
      startedAt: startedAt.current,
    } satisfies PresentMsg);
    box.current?.requestFullscreen?.().catch(() => {});
    return () => {
      ch.postMessage({ type: "bye" } satisfies PresentMsg);
      ch.close();
      channel.current = null;
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [planId, go]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        ["ArrowRight", "ArrowDown", " ", "PageDown", "Enter"].includes(e.key)
      ) {
        e.preventDefault();
        go(indexRef.current + 1);
      } else if (
        ["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(e.key)
      ) {
        e.preventDefault();
        go(indexRef.current - 1);
      } else if (e.key === "Home") go(0);
      else if (e.key === "End") go(deck.length - 1);
      else if (e.key === "Escape") onClose();
      else if (e.key.toLowerCase() === "n") openNotes();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [go, deck.length, onClose]);

  // Leaving full screen (Esc in the browser) also ends the show.
  useEffect(() => {
    const onFs = () => {
      if (!document.fullscreenElement && wasFull.current) onClose();
      if (document.fullscreenElement) wasFull.current = true;
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, [onClose]);

  useEffect(() => {
    const s = deck[index];
    if (s && canvas.current)
      drawHangoutSlide(canvas.current, s, {
        index,
        total: deck.length,
        region,
        mark,
      });
  }, [deck, index, region, mark]);

  // Hide the controls when the mouse rests.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const wake = () => {
      setIdle(false);
      clearTimeout(t);
      t = setTimeout(() => setIdle(true), 2500);
    };
    wake();
    window.addEventListener("pointermove", wake);
    return () => {
      clearTimeout(t);
      window.removeEventListener("pointermove", wake);
    };
  }, []);

  function openNotes() {
    window.open(
      `/hangout-notes/${planId}`,
      "wtf-hangout-notes",
      "width=900,height=700",
    );
  }

  const btn =
    "rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/20";
  return (
    <div
      ref={box}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black"
      style={{ cursor: idle ? "none" : "default" }}
    >
      <canvas
        ref={canvas}
        onClick={() => go(index + 1)}
        className="max-h-full max-w-full"
        style={{ aspectRatio: "16 / 9", width: "100%", height: "auto" }}
      />
      <div
        className={`absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-center gap-2 bg-gradient-to-t from-black/70 to-transparent p-4 transition-opacity ${idle ? "opacity-0" : "opacity-100"}`}
      >
        <button type="button" className={btn} onClick={() => go(index - 1)}>
          ‹ Back
        </button>
        <span className="px-2 text-sm text-white/80">
          {index + 1} / {deck.length}
        </span>
        <button type="button" className={btn} onClick={() => go(index + 1)}>
          Next ›
        </button>
        <button type="button" className={btn} onClick={openNotes}>
          Notes window
        </button>
        <button type="button" className={btn} onClick={onClose}>
          End
        </button>
      </div>
    </div>
  );
}
