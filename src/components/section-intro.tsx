"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { readHeader, subscribeHeader } from "@/lib/header-height";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { introForPath, type SectionIntro } from "@/lib/section-intros";

// Section introductions (Kai, 7 Nov 2026): a card at the top of each tab
// that you step through in place. It never takes over the screen; it goes
// away when you finish it or close it, and the "?" in the header brings
// the page's one back. Since 13 Nov 2026 (Kai) the card stays stuck under
// the header and each step spotlights the part of the page it's about.

type IntroState = {
  enabled: boolean;
  seen: Set<string>;
  open: string | null; // reopened from the "?" button
  dismiss: (key: string) => void;
  reopen: (key: string) => void;
};

const IntroContext = createContext<IntroState | null>(null);

export function IntroProvider({
  seen: initial,
  enabled,
  preview,
  children,
}: {
  seen: string[];
  enabled: boolean;
  preview: boolean; // God "View as": nothing saved
  children: React.ReactNode;
}) {
  const [seen, setSeen] = useState(() => new Set(initial));
  const [open, setOpen] = useState<string | null>(null);
  const dismiss = (key: string) => {
    setOpen(null);
    if (seen.has(key)) return;
    setSeen(new Set([...seen, key]));
    if (!preview)
      void createClient()
        .from("intro_dismissals")
        .upsert({ key }, { onConflict: "user_id,key", ignoreDuplicates: true });
  };
  return (
    <IntroContext.Provider
      value={{ enabled, seen, open, dismiss, reopen: setOpen }}
    >
      {children}
    </IntroContext.Provider>
  );
}

function useIntro(forPath?: string): {
  intro: SectionIntro | null;
  state: IntroState | null;
} {
  const here = usePathname();
  const path = forPath ?? here;
  const state = useContext(IntroContext);
  return { intro: state?.enabled ? introForPath(path) : null, state };
}

// The small "?" in the header: only on pages with an introduction.
export function IntroButton() {
  const { intro, state } = useIntro();
  if (!intro || !state) return null;
  const showing = state.open === intro.key || !state.seen.has(intro.key);
  return (
    <button
      type="button"
      onClick={() =>
        showing ? state.dismiss(intro.key) : state.reopen(intro.key)
      }
      aria-label={
        showing
          ? `Hide the ${intro.name} introduction`
          : `${intro.name} introduction`
      }
      aria-pressed={showing}
      className="group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/85 hover:bg-white/10"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 whitespace-nowrap rounded-lg bg-white px-2 py-1 text-xs font-medium text-navy opacity-0 shadow-md ring-1 ring-black/10 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        {intro.name} introduction
      </span>
      <span
        aria-hidden
        className={`flex h-5 w-5 items-center justify-center rounded-full text-[12px] font-bold leading-none ring-[1.5px] ${
          showing ? "bg-white text-navy ring-white" : "ring-current"
        }`}
      >
        ?
      </span>
    </button>
  );
}

// The card itself, above the page.
export function SectionIntroCard({ forPath }: { forPath?: string }) {
  const { intro, state } = useIntro(forPath); // forPath: for tests
  if (!intro || !state) return null;
  const showing = state.open === intro.key || !state.seen.has(intro.key);
  if (!showing) return null;
  // Keyed so each tab (and each reopen) starts at its first step.
  return <Card key={intro.key} intro={intro} onClose={state.dismiss} />;
}

// The first of the comma-separated selectors that's on screen.
function findTarget(selectors: string) {
  return (
    selectors
      .split(/,(?![^[]*\])/)
      .map((s) => document.querySelector<HTMLElement>(s.trim()))
      .find((e) => e && e.getBoundingClientRect().height > 0) ?? null
  );
}

// A pink outline that follows the step's part of the page, with the rest of
// the page dimmed a little. It never blocks clicks.
function Spotlight({
  target,
  cardRef,
  onMissing,
}: {
  target: string;
  cardRef: React.RefObject<HTMLElement | null>;
  onMissing: (missing: string | null) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame = 0;
    let el: HTMLElement | null = null;
    let first = true;
    const tick = () => {
      if (!el || !el.isConnected) el = findTarget(target);
      const b = box.current;
      if (first) {
        first = false;
        onMissing(el ? null : target);
        // Bring it into view just under the card.
        if (el) {
          const r = el.getBoundingClientRect();
          const top =
            (cardRef.current?.getBoundingClientRect().bottom ?? 0) + 24;
          if (r.top < top || r.bottom > window.innerHeight - 16)
            window.scrollBy({ top: r.top - top, behavior: "smooth" });
        }
      }
      if (b) {
        if (el) {
          const r = el.getBoundingClientRect();
          const pad = 6;
          b.style.opacity = "1";
          b.style.top = `${r.top - pad}px`;
          b.style.left = `${r.left - pad}px`;
          b.style.width = `${r.width + pad * 2}px`;
          b.style.height = `${r.height + pad * 2}px`;
        } else b.style.opacity = "0";
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, cardRef, onMissing]);
  return (
    <div
      ref={box}
      aria-hidden
      className="pointer-events-none fixed z-[15] rounded-2xl opacity-0 transition-[top,left,width,height,opacity] duration-300 ease-out"
      style={{
        boxShadow:
          "0 0 0 3px rgb(236 72 153), 0 0 28px 6px rgb(244 114 182 / 0.55), 0 0 0 9999px rgb(10 15 40 / 0.32)",
      }}
    />
  );
}

function Card({
  intro,
  onClose,
}: {
  intro: SectionIntro;
  onClose: (key: string) => void;
}) {
  const [i, setI] = useState(0);
  // The target of a step whose part of the page isn't there (yet).
  const [missing, setMissing] = useState<string | null>(null);
  const step = intro.steps[i];
  const last = i === intro.steps.length - 1;
  const card = useRef<HTMLElement>(null);
  const headerHeight = useSyncExternalStore(
    subscribeHeader,
    readHeader,
    () => 0,
  );
  return (
    <>
      {step.target && (
        <Spotlight
          key={i}
          target={step.target}
          cardRef={card}
          onMissing={setMissing}
        />
      )}
      <section
        ref={card}
        aria-label={`${intro.name} introduction`}
        className="sticky z-20 mb-6 overflow-hidden rounded-2xl bg-navy p-3.5 text-white shadow-lg shadow-navy/30 ring-2 ring-pink/70 sm:p-5"
        style={{ top: headerHeight + 8 }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-pink/25 blur-3xl"
        />
        <div className="relative flex items-start gap-3">
          <div
            aria-hidden
            className={`hidden h-11 w-11 shrink-0 items-center sm:flex justify-center rounded-2xl text-xl ${intro.tone}`}
          >
            {intro.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-pink">
                {intro.name} introduction{" "}
                <span className="font-normal normal-case tracking-normal text-white/50">
                  · {i + 1} of {intro.steps.length}
                </span>
              </p>
              <button
                type="button"
                onClick={() => onClose(intro.key)}
                aria-label="Close the introduction"
                className="-mr-1 -mt-1 rounded-lg px-2 py-1 text-white/60 hover:bg-white/10 hover:text-white"
              >
                ×
              </button>
            </div>
            <h2 className="mt-1 text-base font-semibold sm:text-lg tracking-tight text-white">
              {step.title}
            </h2>
            <p className="mt-1 text-sm leading-snug text-white/80">
              {step.body}
            </p>
            {!!step.target && missing === step.target && (
              <p className="mt-1 text-xs text-white/50">
                Nothing to show here yet.
              </p>
            )}
            <div className="mt-3 flex items-center gap-1">
              <div aria-hidden className="mr-auto flex gap-1">
                {intro.steps.map((_, n) => (
                  <span
                    key={n}
                    className={`h-1.5 rounded-full transition-all ${
                      n === i ? "w-4 bg-pink" : "w-1.5 bg-white/30"
                    }`}
                  />
                ))}
              </div>
              {i > 0 && (
                <button
                  type="button"
                  onClick={() => setI(i - 1)}
                  className="rounded-lg px-2 py-1 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white"
                >
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={() => (last ? onClose(intro.key) : setI(i + 1))}
                className="rounded-xl bg-pink px-3.5 py-1.5 text-sm font-semibold text-navy hover:bg-pink-strong"
              >
                {last ? "Done" : "Next"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
