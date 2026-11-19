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
  onCreate,
}: {
  // Adds an event that isn't listed; returns the new one, or an error to show.
  onCreate?: (
    title: string,
    date: string,
    time: string,
  ) => Promise<PickEvent | string>;
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
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", date: "", time: "" });
  const [addNote, setAddNote] = useState("");
  const [saving, setSaving] = useState(false);
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

  function startAdding() {
    // Words typed into the search start the name, unless they look like a date.
    const words = q.trim();
    setForm({
      title: /\d/.test(words) ? "" : words,
      date: "",
      time: "",
    });
    setAddNote("");
    setAdding(true);
  }

  async function add() {
    if (!onCreate) return;
    if (!form.title.trim() || !form.date) {
      setAddNote("Add a name and a date.");
      return;
    }
    setSaving(true);
    const out = await onCreate(form.title.trim(), form.date, form.time);
    setSaving(false);
    if (typeof out === "string") {
      setAddNote(out);
      return;
    }
    setAdding(false);
    choose(out.id);
  }

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
          setAdding(false);
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
          {onCreate &&
            (adding ? (
              <div className="border-t border-black/5 p-2.5">
                <p className="text-xs font-semibold text-navy">
                  Add an event that isn&apos;t listed
                </p>
                <input
                  autoFocus
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") add();
                    if (e.key === "Escape") setAdding(false);
                  }}
                  placeholder="Event name"
                  aria-label="Event name"
                  className="mt-1.5 w-full rounded-lg px-2.5 py-1.5 text-sm ring-1 ring-stone-300"
                />
                <div className="mt-1.5 flex gap-1.5">
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    aria-label="Date"
                    className="min-w-0 flex-1 rounded-lg px-2 py-1.5 text-sm ring-1 ring-stone-300"
                  />
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    aria-label="Start time (optional)"
                    title="Start time (optional)"
                    className="w-28 rounded-lg px-2 py-1.5 text-sm ring-1 ring-stone-300"
                  />
                </div>
                <p className="mt-1 text-[11px] text-stone-500">
                  Start time is optional.
                </p>
                {addNote && (
                  <p className="mt-1 text-xs text-red-700">{addNote}</p>
                )}
                <div className="mt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={add}
                    disabled={saving}
                    className="rounded-lg bg-pink px-3 py-1.5 text-sm font-semibold text-navy disabled:opacity-50"
                  >
                    {saving ? "Adding…" : "Add and pick it"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdding(false)}
                    className="text-xs text-stone-500 hover:text-navy"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={startAdding}
                className="border-t border-black/5 px-3 py-2 text-left text-sm font-medium text-stone-500 hover:bg-stone-50 hover:text-navy"
              >
                + Add an event that isn&apos;t listed
              </button>
            ))}
        </div>
      )}
    </>
  );
}
