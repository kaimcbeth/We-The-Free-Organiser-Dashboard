"use client";

import { useState, useTransition } from "react";
import { setEventType } from "@/app/actions";

export function TypePicker({
  eventId,
  value,
  types,
}: {
  eventId: string;
  value: string | null;
  types: { id: string; name: string }[];
}) {
  const [current, setCurrent] = useState(value ?? "");
  const [pending, start] = useTransition();

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Event type</span>
      <select
        value={current}
        disabled={pending}
        onChange={(e) => {
          const v = e.target.value;
          setCurrent(v);
          start(async () => {
            const r = await setEventType(eventId, v || null);
            if (r.error) setCurrent(value ?? "");
          });
        }}
        className={`appearance-none rounded-full py-1 pl-3 pr-7 text-xs font-medium text-navy outline-none focus:ring-2 focus:ring-pink/40 ${
          current ? "bg-cyan/25" : "bg-yellow/40"
        } ${pending ? "opacity-60" : ""}`}
      >
        <option value="">Pick a type…</option>
        {types.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
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
