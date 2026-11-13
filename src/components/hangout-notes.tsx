"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { loadPosterFonts } from "@/components/graphic-poster";
import { loadMark } from "@/components/hangout-slide";
import { SlideThumb } from "@/components/hangout-builder";
import { channelName, type PresentMsg } from "@/components/hangout-present";
import { loadPlanDeck } from "@/lib/hangout-data";
import { buildDeck, clock, sectionOf, type DeckSlide } from "@/lib/hangouts";

// Speaker notes. On the same computer as Present it follows the slides (and
// Back / Next move them); on a phone it's a run sheet you step through.

export function HangoutNotes({ planId }: { planId: string }) {
  const [deck, setDeck] = useState<DeckSlide[] | null>(null);
  const [title, setTitle] = useState("");
  const [region, setRegion] = useState("");
  const [missing, setMissing] = useState(false);
  const [index, setIndex] = useState(0);
  const [linked, setLinked] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [mark, setMark] = useState<HTMLImageElement | null>(null);
  const [fonts, setFonts] = useState(0);
  const channel = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    let live = true;
    loadMark().then((m) => live && setMark(m));
    loadPosterFonts()?.then(() => live && setFonts((n) => n + 1));
    loadPlanDeck(createClient(), planId).then((d) => {
      if (!live) return;
      if (!d) return setMissing(true);
      setTitle(d.plan.title);
      setRegion(d.region);
      setDeck(buildDeck(d.plan, d.blocks, d.fill));
    });
    return () => {
      live = false;
    };
  }, [planId]);

  useEffect(() => {
    const ch = new BroadcastChannel(channelName(planId));
    channel.current = ch;
    ch.onmessage = (e: MessageEvent<PresentMsg>) => {
      const m = e.data;
      if (m.type === "go") {
        setLinked(true);
        setIndex(m.index);
        if (m.startedAt) setStartedAt(m.startedAt);
      }
      if (m.type === "bye") setLinked(false);
    };
    ch.postMessage({ type: "hello" } satisfies PresentMsg);
    return () => ch.close();
  }, [planId]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const move = (by: number) => {
    if (!deck) return;
    if (linked)
      channel.current?.postMessage({ type: "move", by } satisfies PresentMsg);
    else setIndex((i) => Math.max(0, Math.min(deck.length - 1, i + by)));
  };
  const goTo = (i: number) => {
    setIndex(i);
    if (linked)
      channel.current?.postMessage({
        type: "go",
        index: i,
      } satisfies PresentMsg);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowRight", " ", "PageDown"].includes(e.key)) {
        e.preventDefault();
        move(1);
      }
      if (["ArrowLeft", "PageUp"].includes(e.key)) {
        e.preventDefault();
        move(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const elapsed = useMemo(() => {
    if (!startedAt || !now) return null;
    const s = Math.max(0, Math.floor((now - startedAt) / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }, [now, startedAt]);

  if (missing)
    return (
      <p className="p-6 text-sm text-stone-600">
        Couldn&apos;t find this hangout. It may have been deleted, or you may
        need to sign in as a Regional Support Lead.
      </p>
    );
  if (!deck) return <p className="p-6 text-sm text-stone-500">Loading…</p>;
  const s = deck[index];
  const next = deck[index + 1];
  const btn =
    "rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-40";

  return (
    <div className="min-h-dvh bg-navy p-4 text-white sm:p-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <p className="font-semibold">{title}</p>
          <span className="text-white/60">
            {linked ? "Following the slides" : "Speaker notes"}
          </span>
          <span className="ml-auto font-mono text-lg text-yellow">
            {elapsed ?? (
              <button
                type="button"
                onClick={() => setStartedAt(Date.now())}
                className="font-sans text-sm text-white/70 underline"
              >
                Start the clock
              </button>
            )}
          </span>
        </div>

        {s && (
          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_240px]">
            <div>
              <p
                className="text-xs font-semibold tracking-wider"
                style={{ color: sectionOf(s.section).colour }}
              >
                {s.blockTitle.toUpperCase()} · {s.minutes} MIN · FROM{" "}
                {clock(s.startsAt)}
              </p>
              <h1 className="mt-1 text-xl font-semibold">{s.heading}</h1>
              <p className="mt-3 whitespace-pre-wrap text-lg leading-relaxed text-white/90">
                {s.notes || "No notes for this slide."}
              </p>
            </div>
            <div className="space-y-2">
              <div className="overflow-hidden rounded-lg ring-1 ring-white/20">
                <SlideThumb
                  slide={s}
                  index={index}
                  total={deck.length}
                  region={region}
                  mark={mark}
                  tick={fonts}
                />
              </div>
              {next && (
                <p className="text-xs text-white/60">Next: {next.heading}</p>
              )}
            </div>
          </div>
        )}

        <div className="sticky bottom-0 mt-5 flex items-center gap-2 bg-navy py-3">
          <button
            type="button"
            className={btn}
            onClick={() => move(-1)}
            disabled={index === 0}
          >
            ‹ Back
          </button>
          <span className="text-sm text-white/70">
            {index + 1} / {deck.length}
          </span>
          <button
            type="button"
            className={btn}
            onClick={() => move(1)}
            disabled={index === deck.length - 1}
          >
            Next ›
          </button>
        </div>

        <h2 className="mt-6 text-sm font-semibold text-white/70">
          All the slides
        </h2>
        <ol className="mt-2 space-y-2 pb-10">
          {deck.map((d, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => goTo(i)}
                className={`block w-full rounded-xl p-3 text-left ${i === index ? "bg-white/15 ring-1 ring-pink" : "bg-white/5 hover:bg-white/10"}`}
              >
                <p className="text-xs text-white/50">
                  {i + 1} · {clock(d.startsAt)} · {d.blockTitle}
                </p>
                <p className="font-semibold">{d.heading}</p>
                {d.notes && (
                  <p className="mt-1 line-clamp-2 text-sm text-white/70">
                    {d.notes}
                  </p>
                )}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
