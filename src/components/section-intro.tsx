"use client";

import { createContext, useContext, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { introForPath, type SectionIntro } from "@/lib/section-intros";

// Section introductions (Kai, 7 Nov 2026): a card at the top of each tab
// that you step through in place. It never takes over the screen; it goes
// away when you finish it or close it, and the "?" in the header brings
// the page's one back.

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

function glow(selectors: string) {
  const el = selectors
    .split(/,(?![^[]*\])/)
    .map((s) => document.querySelector<HTMLElement>(s.trim()))
    .find((e) => e && e.getBoundingClientRect().height > 0);
  if (!el) return false;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.animate(
    [
      { boxShadow: "0 0 0 0 rgb(244 114 182 / 0)" },
      { boxShadow: "0 0 0 6px rgb(244 114 182 / 0.85)" },
      { boxShadow: "0 0 0 0 rgb(244 114 182 / 0)" },
    ],
    { duration: 900, iterations: 3, delay: 300 },
  );
  return true;
}

function Card({
  intro,
  onClose,
}: {
  intro: SectionIntro;
  onClose: (key: string) => void;
}) {
  const [i, setI] = useState(0);
  const [missing, setMissing] = useState<number | null>(null);
  const step = intro.steps[i];
  const last = i === intro.steps.length - 1;
  return (
    <section
      aria-label={`${intro.name} introduction`}
      className="mb-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
    >
      <div className="flex items-start gap-3">
        <div
          aria-hidden
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl ${intro.tone}`}
        >
          {intro.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              {intro.name} introduction{" "}
              <span className="font-normal normal-case tracking-normal text-stone-400">
                · {i + 1} of {intro.steps.length}
              </span>
            </p>
            <button
              type="button"
              onClick={() => onClose(intro.key)}
              aria-label="Close the introduction"
              className="-mr-1 -mt-1 rounded-lg px-2 py-1 text-stone-400 hover:bg-black/5 hover:text-stone-700"
            >
              ×
            </button>
          </div>
          <h2 className="mt-1 font-semibold tracking-tight">{step.title}</h2>
          <p className="mt-1 text-sm leading-snug text-stone-600">
            {step.body}
          </p>
          {missing === i && (
            <p className="mt-1 text-xs text-stone-400">
              Nothing to show here yet.
            </p>
          )}
          <div className="mt-3 flex items-center gap-1">
            <div aria-hidden className="mr-auto flex gap-1">
              {intro.steps.map((_, n) => (
                <span
                  key={n}
                  className={`h-1.5 rounded-full transition-all ${
                    n === i ? "w-4 bg-pink" : "w-1.5 bg-stone-300"
                  }`}
                />
              ))}
            </div>
            {i > 0 && (
              <button
                type="button"
                onClick={() => setI(i - 1)}
                className="rounded-lg px-2 py-1 text-sm font-medium text-stone-500 hover:bg-black/5"
              >
                Back
              </button>
            )}
            {step.target && (
              <button
                type="button"
                onClick={() => setMissing(glow(step.target!) ? null : i)}
                className="rounded-lg px-2 py-1 text-sm font-medium text-stone-600 hover:bg-black/5"
              >
                Show me
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
  );
}
