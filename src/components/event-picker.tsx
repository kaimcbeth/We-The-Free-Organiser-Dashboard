"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

// A searchable event list (Kai, 19 Nov 2026: "search through all the big
// events list very easily by typing … October 18, 2025 event"). Typing a
// name, a date in any usual form ("18 Oct", "October 18 2025", "18/10/2025")
// or a year finds the event; best matches first.

export type PickEvent = { id: string; label: string; search?: string };

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];
const DAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];
const IGNORE = new Set(["event", "events", "the", "on", "at", "a", "of", "in"]);

// Words to search an event by: its title plus its date written every way.
export function eventSearchText(title: string, startsAt: string) {
  const d = new Date(startsAt);
  const day = d.getDate();
  const m = d.getMonth();
  const y = d.getFullYear();
  const mm = String(m + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return [
    title,
    `${day} ${MONTHS[m]} ${y}`,
    MONTHS[m].slice(0, 3),
    DAYS[d.getDay()],
    `${day}/${m + 1}/${y} ${dd}/${mm}/${y} ${y}-${mm}-${dd}`,
  ]
    .join(" ")
    .toLowerCase();
}

function tokens(q: string) {
  return q
    .toLowerCase()
    .replace(/(\d+)(st|nd|rd|th)\b/g, "$1")
    .split(/[\s,.]+/)
    .filter((t) => t && !IGNORE.has(t));
}

// Every event with at least one matching word, most matching words first
// (so a typo like "2015" doesn't hide everything).
export function searchEvents<T extends PickEvent>(events: T[], q: string) {
  const ts = tokens(q);
  if (!ts.length) return events;
  const hit = (hay: string, t: string) =>
    /^\d+$/.test(t)
      ? new RegExp(`(^|[^0-9])${t}([^0-9]|$)`).test(hay)
      : hay.includes(t);
  return events
    .map((e, i) => {
      const hay = (e.search ?? e.label).toLowerCase();
      return { e, i, n: ts.filter((t) => hit(hay, t)).length };
    })
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n || a.i - b.i)
    .map((x) => x.e);
}

export function EventPicker({
  events,
  value,
  onChange,
  placeholder = "Event (optional)",
  noneLabel,
  currentLabel,
  disabled = false,
  small = false,
  keepValue = true,
  className = "",
}: {
  events: PickEvent[];
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string; // shown when nothing is picked
  noneLabel?: string; // an option at the top that picks nothing
  currentLabel?: string; // for a picked event that isn't in the list
  disabled?: boolean;
  small?: boolean;
  keepValue?: boolean; // false: always shows the placeholder (an action menu)
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(0);
  const [box, setBox] = useState<{
    left: number;
    width: number;
    top?: number;
    bottom?: number;
    max: number;
  } | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const picked = value ? events.find((e) => e.id === value) : null;
  const shown = keepValue
    ? (picked?.label ?? (value ? (currentLabel ?? "Its event") : null))
    : null;
  const found = searchEvents(events, q).slice(0, 60);
  const options: { id: string | null; label: string }[] = [
    ...(noneLabel && !q ? [{ id: null, label: noneLabel }] : []),
    ...found,
  ];

  // Under the button, or above it when there's more room there.
  useLayoutEffect(() => {
    if (!open || !button.current) return;
    const place = () => {
      const r = button.current!.getBoundingClientRect();
      const width = Math.max(r.width, Math.min(360, window.innerWidth - 16));
      const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
      const below = window.innerHeight - r.bottom - 8;
      const above = r.top - 8;
      setBox(
        below >= 260 || below >= above
          ? { left, width, top: r.bottom + 4, max: Math.min(380, below) }
          : {
              left,
              width,
              bottom: window.innerHeight - r.top + 4,
              max: Math.min(380, above),
            },
      );
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !button.current?.contains(t))
        setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  function choose(id: string | null) {
    onChange(id);
    setOpen(false);
    setQ("");
  }

  const text = small ? "text-xs" : "text-sm";
  return (
    <>
      <button
        ref={button}
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen((o) => !o);
          setQ("");
          setHi(0);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center justify-between gap-2 rounded-lg bg-white text-left ring-1 ring-black/10 disabled:opacity-50 ${small ? "px-1.5 py-1" : "px-2 py-1.5"} ${text} ${shown ? "text-navy" : "text-stone-400"} ${className}`}
      >
        <span className="truncate">{shown ?? placeholder}</span>
        <span aria-hidden className="shrink-0 text-[10px] text-stone-400">
          ▼
        </span>
      </button>
      {open && box && (
        <div
          ref={panel}
          role="dialog"
          className="fixed z-[80] flex flex-col overflow-hidden rounded-xl bg-white text-left text-navy shadow-xl ring-1 ring-black/10"
          style={{
            left: box.left,
            width: box.width,
            top: box.top,
            bottom: box.bottom,
            maxHeight: box.max,
          }}
        >
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setHi(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                setOpen(false);
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setHi((h) => Math.min(h + 1, options.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHi((h) => Math.max(h - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                const o = options[hi];
                if (o) choose(o.id);
              }
            }}
            placeholder="Search by name or date, e.g. 18 October 2025"
            className="m-2 rounded-lg px-2.5 py-1.5 text-sm ring-1 ring-stone-300 outline-none focus:ring-pink"
          />
          <ul role="listbox" className="min-h-0 flex-1 overflow-y-auto pb-1">
            {options.map((o, i) => (
              <li key={o.id ?? "none"}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o.id === value}
                  onMouseEnter={() => setHi(i)}
                  onClick={() => choose(o.id)}
                  className={`block w-full px-3 py-1.5 text-left text-sm ${i === hi ? "bg-pink/15" : ""} ${o.id === null ? "text-stone-500" : ""} ${o.id === value && value ? "font-semibold" : ""}`}
                >
                  {o.label}
                </button>
              </li>
            ))}
            {options.length === 0 && (
              <li className="px-3 py-2 text-sm text-stone-500">
                No events match that.
              </li>
            )}
          </ul>
        </div>
      )}
    </>
  );
}
