"use client";

import { useState, useTransition } from "react";
import { moveTask } from "@/app/actions";
import { Sheet } from "@/components/sheet";
import {
  dateInTz,
  formatEventDate,
  todayInTz,
  zonedToUtcIso,
} from "@/lib/time";

type Option = { key: string; label: string; showFrom: string; dueAt: string };

const addDays = (date: string, n: number) =>
  new Date(Date.parse(date + "T12:00:00Z") + n * 864e5)
    .toISOString()
    .slice(0, 10);

// "Move": put a task out of the way until a better day. It shows up in Tasks
// again on that day (6am local), due a couple of days later, or by the event.
export function MoveTask({
  taskId,
  tz,
  eventAt,
  events = [],
  onMoved,
}: {
  taskId: string;
  tz: string;
  eventAt: string | null; // the task's own event
  events?: { title: string; at: string }[]; // other events it could line up with
  onMoved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const today = todayInTz(tz);
  const at6 = (d: string) => zonedToUtcIso(d, "06:00", tz);
  const plain = (key: string, label: string, d: string): Option => ({
    key,
    label,
    showFrom: at6(d),
    dueAt: zonedToUtcIso(addDays(d, 2), "23:59", tz),
  });
  const dayBefore = (title: string, at: string, key: string): Option | null => {
    const d = addDays(dateInTz(at, tz), -1);
    if (d <= today) return null;
    return {
      key,
      label: `Day before ${title} (${formatEventDate(at, tz)})`,
      showFrom: at6(d),
      dueAt: at,
    };
  };

  const options: Option[] = [
    ...(eventAt
      ? [dayBefore("the event", eventAt, "event")].filter(
          (o): o is Option => !!o,
        )
      : []),
    ...events
      .slice(0, 3)
      .map((e, i) => dayBefore(e.title, e.at, `ev${i}`))
      .filter((o): o is Option => !!o),
    plain("tomorrow", "Tomorrow", addDays(today, 1)),
    plain("3days", "In 3 days", addDays(today, 3)),
    plain("week", "Next week", addDays(today, 7)),
  ];

  const go = (o: Option) =>
    start(async () => {
      const r = await moveTask(taskId, o.showFrom, o.dueAt);
      if (r.error) setError(r.error);
      else {
        setOpen(false);
        onMoved();
      }
    });

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        data-tour="move-link"
        className="rounded px-1 py-0.5 text-xs text-stone-400 hover:text-stone-700 hover:underline"
      >
        Move
      </button>
      {open && (
        <Sheet title="Move this task" onClose={() => setOpen(false)}>
          <p className="mb-3 text-sm text-stone-600">
            It&apos;ll be out of the way until then, and show up in Tasks that
            morning.
          </p>
          <ul className="space-y-2">
            {options.map((o) => (
              <li key={o.key}>
                <button
                  disabled={pending}
                  onClick={() => go(o)}
                  className="w-full rounded-xl bg-white px-4 py-3 text-left text-sm font-medium ring-1 ring-stone-200 hover:ring-stone-300"
                >
                  {o.label}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center gap-2">
            <input
              type="date"
              min={addDays(today, 1)}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Pick a day"
              className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
            />
            <button
              disabled={pending || !date}
              onClick={() => go(plain("custom", "", date))}
              className="rounded-xl bg-navy px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Move to this day
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
        </Sheet>
      )}
    </>
  );
}
