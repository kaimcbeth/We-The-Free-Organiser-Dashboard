"use client";

import { MIN_WEEK_MINUTES, SLIDER_STEP } from "@/lib/task-setup";

export const fmtHours = (min: number) => {
  const h = Math.round((min / 60) * 10) / 10;
  return `${h} hour${h === 1 ? "" : "s"}`;
};

// Hours a week, events included (Kai, 6 Nov 2026: a slider from 2 hours up to
// the time every action would take).
export function HoursSlider({
  value,
  max,
  onChange,
  note,
  min = MIN_WEEK_MINUTES,
  maxLabel = "Every action",
  label = "Hours a week, events included",
  everything = true,
}: {
  value: number;
  max: number;
  onChange: (minutes: number) => void;
  note?: string;
  min?: number;
  maxLabel?: string; // under the right end of the slider
  label?: string; // for screen readers
  everything?: boolean; // the top of the slider means "every action"
}) {
  const v = Math.min(Math.max(value, min), max);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-2xl font-semibold text-navy">
          {v >= max && everything ? "Everything" : fmtHours(v)}
          <span className="ml-1 text-sm font-normal text-stone-500">
            {v >= max && everything ? `(${fmtHours(max)})` : ""} a week
          </span>
        </p>
        {note && <p className="text-sm text-stone-500">{note}</p>}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={SLIDER_STEP}
        value={v}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="mt-2 h-5 w-full cursor-pointer appearance-auto rounded-none border-0 bg-transparent p-0 shadow-none accent-pink"
      />
      <div className="flex justify-between text-xs text-stone-400">
        <span>{fmtHours(min)}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}
