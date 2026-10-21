"use client";

import { useState, useTransition } from "react";
import { assignTask, dismissTask, setTaskDone } from "@/app/actions";
import { formatEventDate } from "@/lib/time";

export type TaskRow = {
  id: string;
  kind: string;
  sortOrder: number;
  eventId: string | null;
  title: string;
  description: string | null;
  estimateMinutes: number;
  dueAt: string;
  doneAt: string | null;
  eventTitle: string | null;
  eventAt: string | null;
  assignedTo: string | null;
  assigneeName: string | null;
};

// "Due today", "Due tomorrow", "2 days overdue"...
function dueLabel(dueAt: string, now: number) {
  const days = Math.floor((Date.parse(dueAt) - now) / 864e5);
  if (days < 0)
    return {
      text: `${-days} day${days === -1 ? "" : "s"} overdue`,
      tone: "bg-pink/20 text-pink-ink",
    };
  if (days === 0) return { text: "Due today", tone: "bg-yellow/50 text-navy" };
  if (days === 1)
    return { text: "Due tomorrow", tone: "bg-yellow/30 text-navy" };
  return { text: `Due in ${days} days`, tone: "bg-cyan/20 text-navy" };
}

export function TaskCard({
  task,
  tz,
  now,
  people,
  whatsappUrl,
  hideEvent = false,
}: {
  task: TaskRow;
  tz: string;
  now: number;
  people?: { id: string; name: string }[]; // organisers: who it can be assigned to
  whatsappUrl: string | null;
  hideEvent?: boolean; // when shown under the event's own heading
}) {
  const [done, setDone] = useState(!!task.doneAt);
  const [assignee, setAssignee] = useState(task.assignedTo ?? "");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [removed, setRemoved] = useState(false);
  const due = dueLabel(task.dueAt, now);
  if (removed) return null;

  return (
    <li
      className={`relative rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 transition ${done ? "opacity-60" : ""}`}
    >
      {people && (
        <button
          type="button"
          aria-label="Remove task"
          title="Remove task"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setRemoved(true);
              const r = await dismissTask(task.id);
              if (r.error) {
                setRemoved(false);
                setError(r.error);
              }
            })
          }
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-stone-300 hover:bg-stone-100 hover:text-stone-600"
        >
          <svg
            viewBox="0 0 20 20"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden
          >
            <path d="M6 6l8 8M14 6l-8 8" strokeLinecap="round" />
          </svg>
        </button>
      )}
      <div className="flex items-start gap-3 pr-6">
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label={done ? "Mark as not done" : "Mark as done"}
          disabled={pending}
          onClick={() =>
            start(async () => {
              const next = !done;
              setDone(next);
              const r = await setTaskDone(task.id, next);
              if (r.error) {
                setDone(!next);
                setError(r.error);
              } else setError("");
            })
          }
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
            done
              ? "border-cyan bg-cyan text-navy"
              : "border-stone-300 hover:border-cyan"
          }`}
        >
          {done && (
            <svg
              viewBox="0 0 20 20"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              aria-hidden
            >
              <path
                d="M4 10.5l4 4 8-9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`font-semibold ${done ? "line-through" : ""}`}>
              {task.title}
            </p>
            <span className="rounded-full bg-navy/5 px-2 py-0.5 text-xs font-semibold text-navy">
              ~{task.estimateMinutes} min
            </span>
            {!done && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${due.tone}`}
              >
                {due.text}
              </span>
            )}
          </div>
          {task.eventTitle && !hideEvent && (
            <p className="text-sm text-stone-500">
              {task.eventTitle}
              {task.eventAt ? `, ${formatEventDate(task.eventAt, tz)}` : ""}
            </p>
          )}
          {task.description && !done && (
            <p className="mt-1 text-sm text-stone-600">{task.description}</p>
          )}

          {!done && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {whatsappUrl && task.kind === "post_photos" && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-[#25D366] px-3 py-1.5 text-sm font-semibold text-navy hover:brightness-95"
                >
                  Open WhatsApp ↗
                </a>
              )}
              {people && (
                <select
                  value={assignee}
                  disabled={pending}
                  onChange={(e) => {
                    const v = e.target.value;
                    setAssignee(v);
                    start(async () => {
                      const r = await assignTask(task.id, v || null);
                      if (r.error) setError(r.error);
                      else setError("");
                    });
                  }}
                  aria-label="Assigned to"
                  className="rounded-xl border border-stone-300 bg-white px-2.5 py-1.5 text-sm"
                >
                  <option value="">Any organiser</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
              {!people && task.assigneeName && (
                <span className="text-sm text-stone-500">Assigned to you</span>
              )}
            </div>
          )}
          {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
        </div>
      </div>
    </li>
  );
}
