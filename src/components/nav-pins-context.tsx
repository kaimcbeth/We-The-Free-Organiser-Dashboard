"use client";

import { createContext, useContext, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MAX_PINS, NAV_PINS } from "@/lib/nav-pins";

// The person's top-bar pins, shared by the top bar and the pin buttons on
// Resources cards (Kai, 19 Nov 2026). Saved to nav_pins (0244).
type Pins = {
  pins: string[];
  hidden: string[]; // main tabs this person took off (events, actions…)
  order: string[]; // tab keys in the order they dragged them (0247)
  reorder: (keys: string[]) => Promise<void>;
  rsl: boolean;
  error: string;
  toggle: (key: string) => Promise<void>;
  toggleMain: (key: string) => Promise<void>;
};

const PinsContext = createContext<Pins | null>(null);

export function PinsProvider({
  initial,
  initialHidden = [],
  initialOrder = [],
  rsl,
  children,
}: {
  initial: string[];
  initialHidden?: string[];
  initialOrder?: string[];
  rsl: boolean;
  children: React.ReactNode;
}) {
  const [pins, setPins] = useState(initial);
  const [hidden, setHidden] = useState(initialHidden);
  const [order, setOrder] = useState(initialOrder);
  const [error, setError] = useState("");
  async function save(
    nextPins: string[],
    nextHidden: string[],
    nextOrder: string[] = order,
  ) {
    const before = [pins, hidden, order];
    setPins(nextPins);
    setHidden(nextHidden);
    setOrder(nextOrder);
    setError("");
    const { error } = await createClient().from("nav_pins").upsert({
      pins: nextPins,
      hidden: nextHidden,
      tab_order: nextOrder,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      setPins(before[0]);
      setHidden(before[1]);
      setOrder(before[2]);
      setError("Couldn't save. Please try again.");
    }
  }
  async function reorder(keys: string[]) {
    await save(pins, hidden, keys);
  }
  async function toggle(key: string) {
    const next = pins.includes(key)
      ? pins.filter((k) => k !== key)
      : [...pins, key];
    if (next.length > MAX_PINS) {
      setError(`You can pin up to ${MAX_PINS}. Unpin one first.`);
      return;
    }
    await save(next, hidden);
  }
  async function toggleMain(key: string) {
    await save(
      pins,
      hidden.includes(key) ? hidden.filter((k) => k !== key) : [...hidden, key],
    );
  }
  return (
    <PinsContext.Provider
      value={{ pins, hidden, order, reorder, rsl, error, toggle, toggleMain }}
    >
      {children}
    </PinsContext.Provider>
  );
}

export function usePins() {
  return useContext(PinsContext);
}

export function PinIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path
        d="M7.5 3h5l-.8 5 2.8 2.5v1H5.5v-1L8.3 8 7.5 3zM10 11.5V17"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// A small pin button for a Resources card (only where the top bar is: no
// provider, no button). `dark` for the navy Social Hub card.
export function PinToggle({
  k,
  dark = false,
  className = "",
}: {
  k: string;
  dark?: boolean;
  className?: string;
}) {
  const ctx = usePins();
  const item = NAV_PINS.find((p) => p.key === k);
  if (!ctx || !item || (item.rsl && !ctx.rsl)) return null;
  const on = ctx.pins.includes(k);
  const full = !on && ctx.pins.length >= 4;
  const label = on
    ? `Unpin ${item.label} from the top bar`
    : full
      ? "The top bar is full: unpin something first"
      : `Pin ${item.label} to the top bar`;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void ctx.toggle(k);
      }}
      aria-pressed={on}
      aria-label={label}
      title={label}
      className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
        on
          ? dark
            ? "bg-cyan text-navy"
            : "bg-navy text-white"
          : dark
            ? "text-white/50 hover:bg-white/10 hover:text-white"
            : "text-stone-400 hover:bg-stone-100 hover:text-navy"
      } ${className}`}
    >
      <PinIcon className="h-3.5 w-3.5" />
    </button>
  );
}

// A card with a pin button in its top-right corner.
export function Pinnable({
  k,
  dark = false,
  className = "",
  children,
}: {
  k: string;
  dark?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`relative h-full ${className}`}>
      {children}
      <PinToggle k={k} dark={dark} className="absolute right-10 top-1.5" />
    </div>
  );
}
