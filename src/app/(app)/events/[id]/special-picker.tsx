"use client";

import { useState, useTransition } from "react";
import { setEventSpecial } from "@/app/actions";

// Marks an event as one of the special events (Christmas social, Halloween
// Movie Challenge...). Special events get a promote action every week from
// 8 weeks before.
export function SpecialPicker({
  eventId,
  value,
  specials,
}: {
  eventId: string;
  value: string | null;
  specials: { id: string; name: string; emoji: string | null }[];
}) {
  const [current, setCurrent] = useState(value ?? "");
  const [pending, start] = useTransition();
  if (!specials.length) return null;
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Special event</span>
      <select
        value={current}
        disabled={pending}
        onChange={(e) => {
          const v = e.target.value;
          setCurrent(v);
          start(async () => {
            const r = await setEventSpecial(eventId, v || null);
            if (r.error) setCurrent(value ?? "");
          });
        }}
        className={`appearance-none rounded-full py-1 pl-3 pr-7 text-xs font-medium outline-none focus:ring-2 focus:ring-pink/40 ${
          current ? "bg-pink/15 text-navy" : "bg-stone-100 text-stone-500"
        } ${pending ? "opacity-60" : ""}`}
      >
        <option value="">Not a special event</option>
        <optgroup label="Special events">
          {specials.map((s) => (
            <option key={s.id} value={s.id}>
              {s.emoji ? `${s.emoji} ` : ""}
              {s.name}
            </option>
          ))}
        </optgroup>
      </select>
      <svg
        viewBox="0 0 20 20"
        className="pointer-events-none absolute right-2 h-3 w-3 text-navy"
        fill="currentColor"
        aria-hidden
      >
        <path d="M5 7l5 6 5-6z" />
      </svg>
    </label>
  );
}
