"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Sheet } from "@/components/sheet";
import { PinIcon, usePins } from "@/components/nav-pins-context";
import { MAX_PINS, NAV_PINS, pinsFor } from "@/lib/nav-pins";

type NavLink = {
  key?: string; // main tabs: can be taken off the top bar
  href: string;
  label: string;
  match: (p: string) => boolean;
  pinned?: boolean;
};

const LINKS: NavLink[] = [
  {
    key: "events",
    href: "/",
    label: "Events",
    match: (p) =>
      p === "/" || p.startsWith("/events") || p.startsWith("/calendar"),
  },
  {
    key: "actions",
    href: "/tasks",
    label: "Actions",
    match: (p) => p.startsWith("/tasks"),
  },
  // People lives inside Insights (Kai, 19 Nov 2026: Insights | People switch).
  {
    key: "insights",
    href: "/insights",
    label: "Insights",
    match: (p) => p.startsWith("/insights") || p.startsWith("/people"),
  },
  {
    key: "resources",
    href: "/resources",
    label: "Resources",
    // FB groups (God Mode) opens from Resources.
    match: (p) =>
      p.startsWith("/resources") || p.startsWith("/facebook-groups"),
  },
  {
    key: "funding",
    href: "/funding",
    label: "Funding",
    match: (p) => p.startsWith("/funding"),
  },
];

export function NavLinks({
  openTasks = 0,
}: {
  openTasks?: number;
  isGod?: boolean; // FB groups moved to Resources; kept for callers
}) {
  const path = usePathname();
  const ctx = usePins();
  const [editing, setEditing] = useState(false);
  // Drag a tab to move it (Kai, 19 Nov 2026); `preview` is the order while
  // dragging, saved on drop.
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [preview, setPreview] = useState<string[] | null>(null);
  // The tab we last moved past, so hovering it again doesn't flip back.
  const lastOver = useRef<string | null>(null);
  const pinned: NavLink[] = pinsFor(ctx?.pins ?? [], ctx?.rsl ?? false).map(
    (p) => ({
      key: p.key,
      href: p.href,
      label: p.label,
      pinned: true,
      match: (x) => !p.match.includes("#") && x.startsWith(p.match),
    }),
  );
  // A pinned page lights up its own tab, not Resources.
  const onPinned = pinned.some((x) => x.match(path));
  const hidden = ctx?.hidden ?? [];
  const main = LINKS.filter((l) => !l.key || !hidden.includes(l.key));
  const saved = preview ?? ctx?.order ?? [];
  const rank = (k: string | undefined, i: number) => {
    const at = k ? saved.indexOf(k) : -1;
    return at >= 0 ? at : 1000 + i;
  };
  const links = [...main, ...pinned]
    .map((l, i) => ({
      ...l,
      rank: rank(l.key, i),
      active: l.match(path) && (l.pinned || !onPinned),
    }))
    .sort((a, b) => a.rank - b.rank);
  const keys = links.map((l) => l.key!).filter(Boolean);
  const moveOver = (target: string) => {
    if (!dragKey || dragKey === target || lastOver.current === target) return;
    lastOver.current = target;
    const next = keys.filter((k) => k !== dragKey);
    const to = keys.indexOf(target);
    const from = keys.indexOf(dragKey);
    // Dragging right puts it after the target, left before it.
    next.splice(next.indexOf(target) + (from < to ? 1 : 0), 0, dragKey);
    if (next.join() !== keys.join()) setPreview(next);
  };
  const endDrag = () => {
    if (preview && ctx && preview.join() !== (ctx.order ?? []).join())
      void ctx.reorder(preview);
    setDragKey(null);
    setPreview(null);
  };
  return (
    <>
      <nav className="mx-auto flex max-w-2xl items-center gap-1 overflow-x-auto whitespace-nowrap px-4 pt-2 [scrollbar-width:none]">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            draggable={!!ctx && !!l.key}
            onDragStart={(e) => {
              if (!l.key) return;
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", l.label);
              lastOver.current = null;
              setDragKey(l.key);
            }}
            onDragOver={(e) => {
              if (!dragKey || !l.key) return;
              e.preventDefault();
              moveOver(l.key);
            }}
            onDrop={(e) => {
              if (dragKey) e.preventDefault();
            }}
            onDragEnd={endDrag}
            data-tour={`nav-${l.label.toLowerCase().replace(/\W+/g, "-")}`}
            className={`border-b-2 px-2.5 pb-2.5 pt-1 text-sm font-medium sm:px-3 ${
              dragKey === l.key ? "opacity-40" : ""
            } ${
              l.active
                ? "border-pink text-white"
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
      {editing && <PinSheet onClose={() => setEditing(false)} />}
    </>
  );
}

function PinSheet({ onClose }: { onClose: () => void }) {
  const ctx = usePins();
  if (!ctx) return null;
  const { pins, hidden, rsl, toggle, toggleMain, error } = ctx;
  const options = NAV_PINS.filter((p) => !p.rsl || rsl);
  const full = pins.length >= MAX_PINS;
  return (
    <Sheet title="Pin to the top bar" onClose={onClose}>
      <p className="text-sm text-stone-600">
        Choose what sits in your top bar. Only you see your choices. You can
        also tap the pin on any Resources card, and drag the tabs in the top bar
        to put them in any order.
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {LINKS.filter((l) => l.key).map((l) => {
          const on = !hidden.includes(l.key!);
          return (
            <li key={l.key}>
              <button
                type="button"
                onClick={() => toggleMain(l.key!)}
                aria-pressed={on}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium ring-1 transition-colors ${
                  on
                    ? "bg-navy text-white ring-navy"
                    : "bg-white text-navy ring-stone-200 hover:ring-navy/40"
                }`}
              >
                <PinIcon
                  className={`h-4 w-4 shrink-0 ${on ? "text-cyan" : "text-stone-400"}`}
                />
                {l.label}
              </button>
            </li>
          );
        })}
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
          : `${pins.length} of ${MAX_PINS} extra pins used.`}
      </p>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </Sheet>
  );
}
