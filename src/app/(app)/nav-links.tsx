"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sheet } from "@/components/sheet";
import { MAX_PINS, NAV_PINS, pinsFor } from "@/lib/nav-pins";

type NavLink = {
  href: string;
  label: string;
  match: (p: string) => boolean;
  pinned?: boolean;
};

const LINKS: NavLink[] = [
  {
    href: "/",
    label: "Events",
    match: (p) =>
      p === "/" || p.startsWith("/events") || p.startsWith("/calendar"),
  },
  {
    href: "/tasks",
    label: "Actions",
    match: (p) => p.startsWith("/tasks"),
  },
  // People lives inside Insights (Kai, 19 Nov 2026: Insights | People switch).
  {
    href: "/insights",
    label: "Insights",
    match: (p) => p.startsWith("/insights") || p.startsWith("/people"),
  },
  {
    href: "/resources",
    label: "Resources",
    // FB groups (God Mode) opens from Resources.
    match: (p) =>
      p.startsWith("/resources") || p.startsWith("/facebook-groups"),
  },
  {
    href: "/funding",
    label: "Funding",
    match: (p) => p.startsWith("/funding"),
  },
];

export function NavLinks({
  openTasks = 0,
  pins = [],
  rsl = false,
}: {
  openTasks?: number;
  isGod?: boolean; // FB groups moved to Resources; kept for callers
  pins?: string[]; // the person's pinned items (nav_pins)
  rsl?: boolean; // regional lead or God: can pin RSL-only items
}) {
  const path = usePathname();
  const [mine, setMine] = useState(pins);
  const [editing, setEditing] = useState(false);
  const pinned: NavLink[] = pinsFor(mine, rsl).map((p) => ({
    href: p.href,
    label: p.label,
    pinned: true,
    match: (x) => !p.match.includes("#") && x.startsWith(p.match),
  }));
  // A pinned page lights up its own tab, not Resources.
  const onPinned = pinned.some((x) => x.match(path));
  const links = [...LINKS, ...pinned].map((l) => ({
    ...l,
    active: l.match(path) && (l.pinned || !onPinned),
  }));
  return (
    <>
      <nav className="mx-auto flex max-w-2xl items-center gap-1 overflow-x-auto whitespace-nowrap px-4 pt-2 [scrollbar-width:none]">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            data-tour={`nav-${l.label.toLowerCase().replace(/\W+/g, "-")}`}
            className={`border-b-2 px-2.5 pb-2.5 pt-1 text-sm font-medium sm:px-3 ${
              l.active
                ? "border-pink text-white"
                : l.pinned
                  ? "border-transparent text-cyan/80 hover:text-cyan"
                  : "border-transparent text-white/65 hover:text-white"
            }`}
          >
            {l.label}
            {l.href === "/tasks" && openTasks > 0 && (
              <span className="ml-1.5 rounded-full bg-pink px-1.5 py-0.5 text-[10px] font-bold text-navy">
                {openTasks}
              </span>
            )}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Pin things to the top bar"
          title="Pin things to the top bar"
          className="mb-1.5 ml-0.5 shrink-0 rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white"
        >
          <PinIcon />
        </button>
      </nav>
      {/* Outside the nav, which doesn't wrap its text. */}
      {editing && (
        <PinSheet
          pins={mine}
          rsl={rsl}
          onChange={setMine}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}

function PinIcon({ className = "h-4 w-4" }: { className?: string }) {
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

function PinSheet({
  pins,
  rsl,
  onChange,
  onClose,
}: {
  pins: string[];
  rsl: boolean;
  onChange: (pins: string[]) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const options = NAV_PINS.filter((p) => !p.rsl || rsl);
  async function toggle(key: string) {
    const next = pins.includes(key)
      ? pins.filter((k) => k !== key)
      : [...pins, key];
    if (next.length > MAX_PINS) return;
    const before = pins;
    onChange(next);
    setError("");
    const { error } = await createClient()
      .from("nav_pins")
      .upsert({ pins: next, updated_at: new Date().toISOString() });
    if (error) {
      onChange(before);
      setError("Couldn't save. Please try again.");
    } else router.refresh();
  }
  const full = pins.length >= MAX_PINS;
  return (
    <Sheet title="Pin to the top bar" onClose={onClose}>
      <p className="text-sm text-stone-600">
        Pick up to {MAX_PINS} things you open a lot. They sit after the main
        tabs, just for you.
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {options.map((p) => {
          const on = pins.includes(p.key);
          return (
            <li key={p.key}>
              <button
                type="button"
                onClick={() => toggle(p.key)}
                disabled={!on && full}
                aria-pressed={on}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium ring-1 transition-colors disabled:opacity-40 ${
                  on
                    ? "bg-navy text-white ring-navy"
                    : "bg-white text-navy ring-stone-200 hover:ring-navy/40"
                }`}
              >
                <PinIcon
                  className={`h-4 w-4 shrink-0 ${on ? "text-cyan" : "text-stone-400"}`}
                />
                {p.label}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-stone-500">
        {full
          ? `That's ${MAX_PINS}. Unpin one to pin something else.`
          : `${pins.length} of ${MAX_PINS} pinned.`}
      </p>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </Sheet>
  );
}
