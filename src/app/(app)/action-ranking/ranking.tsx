"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  suggestForBudget,
  weeklyMinutes,
  type SetupKind,
} from "@/lib/task-setup";

// Same choices as "How much time do you have?" in Choose actions.
const BUDGETS = [
  { minutes: 15, label: "15 min" },
  { minutes: 30, label: "30 min" },
  { minutes: 60, label: "1 hour" },
  { minutes: 120, label: "2+ hours" },
];

const WHEN: Record<SetupKind["when"], string> = {
  before: "each event",
  during: "each event",
  after: "each event",
  weekly: "a week",
  monthly: "a month",
  quarterly: "a season",
  newcomer: "each newcomer",
};

const fmt = (min: number) =>
  min < 60
    ? `${Math.round(min)} min`
    : `${Math.round((min / 60) * 10) / 10} hr`;

export function ActionRanking({ initial }: { initial: SetupKind[] }) {
  const [list, setList] = useState(initial);
  const [saved, setSaved] = useState(initial.map((k) => k.kind).join());
  const [budget, setBudget] = useState<number | null>(30);
  const [events, setEvents] = useState(1);
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const dirty = list.map((k) => k.kind).join() !== saved;
  // Ranked by position here, so the preview follows unsaved moves too.
  const ranked = list.map((k, i) => ({ ...k, importance: i + 1 }));
  const picked = budget ? suggestForBudget(ranked, budget, events) : null;
  const used = picked
    ? ranked
        .filter((k) => picked.has(k.kind))
        .reduce((n, k) => n + weeklyMinutes(k, events), 0)
    : 0;

  function move(from: number, to: number) {
    if (to < 0 || to >= list.length || from === to) return;
    const next = [...list];
    const [k] = next.splice(from, 1);
    next.splice(to, 0, k);
    setList(next);
  }

  function save() {
    setError("");
    const kinds = list.map((k) => k.kind);
    start(async () => {
      const { error } = await createClient().rpc("set_action_ranking", {
        p_kinds: kinds,
      });
      if (error) setError("Couldn't save the order. Try again?");
      else setSaved(kinds.join());
    });
  }

  return (
    <div className="mt-5">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-navy">
          Preview what an organiser gets
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm">
          {BUDGETS.map((b) => (
            <button
              key={b.minutes}
              onClick={() => setBudget(budget === b.minutes ? null : b.minutes)}
              className={`rounded-full px-3 py-1 font-medium ${budget === b.minutes ? "bg-cyan text-navy" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}
            >
              {b.label}
            </button>
          ))}
          <span className="ml-1 text-stone-500">a week, with</span>
          <select
            value={events}
            onChange={(e) => setEvents(Number(e.target.value))}
            className="rounded-lg border border-stone-200 bg-white px-2 py-1"
          >
            {[0.5, 1, 2, 3].map((n) => (
              <option key={n} value={n}>
                {n === 0.5
                  ? "1 event a fortnight"
                  : `${n} event${n > 1 ? "s" : ""} a week`}
              </option>
            ))}
          </select>
        </div>
        {picked && (
          <p className="mt-2 text-xs text-stone-500">
            {picked.size} actions suggested, about {fmt(used)} a week.
            They&apos;re marked below.
          </p>
        )}
      </div>

      <ol className="mt-4 flex flex-col gap-1.5">
        {list.map((k, i) => {
          const on = picked?.has(k.kind);
          return (
            <li
              key={k.kind}
              draggable
              onDragStart={(e) => {
                setDragging(i);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(i);
              }}
              onDragLeave={() => setOver((o) => (o === i ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                if (dragging != null) move(dragging, i);
                setDragging(null);
                setOver(null);
              }}
              onDragEnd={() => {
                setDragging(null);
                setOver(null);
              }}
              className={`flex cursor-grab items-center gap-3 rounded-xl border bg-white px-3 py-2 active:cursor-grabbing ${over === i && dragging !== i ? "border-pink" : "border-transparent"} ${dragging === i ? "opacity-40" : ""} ${on ? "shadow-[inset_4px_0_0_var(--color-cyan)]" : ""}`}
            >
              <span className="w-6 shrink-0 text-right text-sm font-bold tabular-nums text-stone-400">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-snug text-navy">
                  {k.title}
                  {!k.defaultOn && (
                    <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-500">
                      Off by default
                    </span>
                  )}
                  {on && (
                    <span className="ml-2 rounded-full bg-cyan/20 px-2 py-0.5 text-[11px] font-medium text-navy">
                      Suggested
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-stone-500">
                  ~{k.label} min {WHEN[k.when]}
                  {k.appliesTo && k.appliesTo !== "All events"
                    ? ` · ${k.appliesTo}`
                    : ""}
                  {k.blurb ? ` · ${k.blurb}` : ""}
                </p>
              </div>
              <span className="flex shrink-0 gap-0.5">
                <button
                  onClick={() => move(i, 0)}
                  disabled={i === 0}
                  aria-label={`Move ${k.title} to the top`}
                  title="Move to the top"
                  className="h-7 w-7 rounded-md text-stone-400 hover:bg-stone-100 hover:text-navy disabled:opacity-30"
                >
                  ⤒
                </button>
                <button
                  onClick={() => move(i, i - 1)}
                  disabled={i === 0}
                  aria-label={`Move ${k.title} up`}
                  className="h-7 w-7 rounded-md text-stone-400 hover:bg-stone-100 hover:text-navy disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  onClick={() => move(i, i + 1)}
                  disabled={i === list.length - 1}
                  aria-label={`Move ${k.title} down`}
                  className="h-7 w-7 rounded-md text-stone-400 hover:bg-stone-100 hover:text-navy disabled:opacity-30"
                >
                  ↓
                </button>
              </span>
            </li>
          );
        })}
      </ol>

      {(dirty || error) && (
        <div className="sticky bottom-4 mt-4 flex items-center justify-end gap-3 rounded-2xl bg-navy px-4 py-3 text-sm text-white shadow-lg">
          {error && <span className="mr-auto text-pink">{error}</span>}
          {!error && <span className="mr-auto opacity-80">Order changed</span>}
          <button
            onClick={() => {
              setList(
                saved
                  .split(",")
                  .map((kind) => list.find((k) => k.kind === kind)!)
                  .filter(Boolean),
              );
              setError("");
            }}
            className="opacity-75 hover:opacity-100"
          >
            Undo
          </button>
          <button
            onClick={save}
            disabled={pending}
            className="rounded-full bg-pink px-4 py-1.5 font-semibold text-navy disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save order"}
          </button>
        </div>
      )}
    </div>
  );
}
