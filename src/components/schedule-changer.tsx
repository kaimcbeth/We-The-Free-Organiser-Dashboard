"use client";

import { useEffect, useState, useTransition } from "react";
import { getTaskSchedule, setTaskSchedule } from "@/app/actions";

const WEEKS = ["1st", "2nd", "3rd", "4th", "Last"];
const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Monthly actions on a set day (e.g. Feedback Fridays, 3rd Friday): shows
// which day, and lets the community pick another week and day.
export function ScheduleChanger({ kind }: { kind: string }) {
  const [s, setS] = useState<{ week: number; weekday: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  useEffect(() => {
    let live = true;
    getTaskSchedule(kind).then((r) => live && setS(r));
    return () => {
      live = false;
    };
  }, [kind]);
  if (!s) return null;
  const label = `${WEEKS[s.week - 1]} ${DAYS[s.weekday - 1]} of each month`;
  const select =
    "rounded-lg bg-white px-2 py-0.5 text-xs text-stone-700 ring-1 ring-black/10";
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
      {editing ? (
        <>
          <select
            aria-label="Which week"
            value={s.week}
            disabled={pending}
            onChange={(e) => setS({ ...s, week: Number(e.target.value) })}
            className={select}
          >
            {WEEKS.map((w, i) => (
              <option key={w} value={i + 1}>
                {w}
              </option>
            ))}
          </select>
          <select
            aria-label="Which day"
            value={s.weekday}
            disabled={pending}
            onChange={(e) => setS({ ...s, weekday: Number(e.target.value) })}
            className={select}
          >
            {DAYS.map((d, i) => (
              <option key={d} value={i + 1}>
                {d}
              </option>
            ))}
          </select>
          of each month
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await setTaskSchedule(kind, s.week, s.weekday);
                setEditing(false);
              })
            }
            className="font-semibold text-navy hover:underline"
          >
            Save
          </button>
        </>
      ) : (
        <>
          {label}
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="font-medium text-stone-500 underline-offset-2 hover:text-navy hover:underline"
          >
            Change
          </button>
        </>
      )}
    </span>
  );
}
