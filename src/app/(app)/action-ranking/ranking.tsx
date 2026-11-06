"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  EVENT_MINUTES,
  eventMinutes,
  eventsLabel,
  suggestForBudget,
  maxWeekMinutes,
  weeklyMinutes,
  type SetupKind,
} from "@/lib/task-setup";
import { HoursSlider } from "@/components/hours-slider";

const WHEN: Record<SetupKind["when"], string> = {
  before: "each event",
  during: "each event",
  after: "each event",
  weekly: "a week",
  monthly: "a month",
  quarterly: "a season",
  newcomer: "each newcomer",
};

// Timing tag on each row (Kai, 6 Nov: pre-event / during / post-event).
const TAG: Record<SetupKind["when"], { label: string; cls: string }> = {
  before: { label: "Pre-event", cls: "bg-amber-100 text-amber-800" },
  during: { label: "During event", cls: "bg-pink/15 text-pink-ink" },
  after: { label: "Post-event", cls: "bg-violet-100 text-violet-800" },
  weekly: { label: "Weekly", cls: "bg-stone-100 text-stone-600" },
  monthly: { label: "Monthly", cls: "bg-stone-100 text-stone-600" },
  quarterly: { label: "Seasonal", cls: "bg-stone-100 text-stone-600" },
  newcomer: { label: "Per newcomer", cls: "bg-stone-100 text-stone-600" },
};

// Sections (Kai, 6 Nov: priority 1, 2, 3).
const TIERS = [
  { tier: 1, label: "Essential", hint: "Priority 1", cls: "text-navy" },
  { tier: 2, label: "Good to do", hint: "Priority 2", cls: "text-navy" },
  { tier: 3, label: "Above and beyond", hint: "Priority 3", cls: "text-navy" },
] as const;
type Tier = 1 | 2 | 3;
type Row = SetupKind & { tier: Tier };

const key = (l: Row[]) => l.map((k) => `${k.kind}:${k.tier}`).join();
// Keep the flat list grouped by section, order kept within each.
const grouped = (l: Row[]) =>
  [1, 2, 3].flatMap((t) => l.filter((k) => k.tier === t));

const fmt = (min: number) =>
  min < 60
    ? `${Math.round(min)} min`
    : `${Math.round((min / 60) * 10) / 10} hr`;

export function ActionRanking({ initial }: { initial: SetupKind[] }) {
  const [list, setList] = useState<Row[]>(() =>
    grouped(initial.map((k) => ({ ...k, tier: (k.tier ?? 3) as Tier }))),
  );
  const [saved, setSaved] = useState(() =>
    key(grouped(initial.map((k) => ({ ...k, tier: (k.tier ?? 3) as Tier })))),
  );
  const [savedList, setSavedList] = useState<Row[]>(list);
  const [budget, setBudget] = useState(300);
  const [events, setEvents] = useState(1);
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const dirty = key(list) !== saved;
  // Ranked by position here, so the preview follows unsaved moves too.
  const ranked = list.map((k, i) => ({ ...k, importance: i + 1 }));
  const maxMinutes = maxWeekMinutes(ranked, events);
  const hours = Math.min(budget, maxMinutes);
  const picked = suggestForBudget(ranked, hours, events);
  const used = picked
    ? ranked
        .filter((k) => picked.has(k.kind))
        .reduce((n, k) => n + weeklyMinutes(k, events), 0)
    : 0;

  // Put the action at flat position `to` in section `tier`.
  function place(from: number, to: number, tier: Tier) {
    const next = [...list];
    const [k] = next.splice(from, 1);
    next.splice(to > from ? to - 1 : to, 0, { ...k, tier });
    setList(grouped(next));
  }
  function up(i: number) {
    const k = list[i];
    if (i > 0 && list[i - 1].tier === k.tier) {
      const next = [...list];
      [next[i - 1], next[i]] = [next[i], next[i - 1]];
      setList(next);
    } else if (k.tier > 1) {
      // Top of its section: becomes the last of the section above.
      setList(
        grouped(
          list.map((x, j) =>
            j === i ? { ...x, tier: (k.tier - 1) as Tier } : x,
          ),
        ),
      );
    }
  }
  function down(i: number) {
    const k = list[i];
    if (i < list.length - 1 && list[i + 1].tier === k.tier) {
      const next = [...list];
      [next[i], next[i + 1]] = [next[i + 1], next[i]];
      setList(next);
    } else if (k.tier < 3) {
      // Bottom of its section: becomes the first of the section below.
      const t = (k.tier + 1) as Tier;
      const rest = list.filter((_, j) => j !== i);
      const at = rest.findIndex((x) => x.tier === t);
      rest.splice(at < 0 ? rest.length : at, 0, { ...k, tier: t });
      setList(grouped(rest));
    }
  }
  function toTop(i: number) {
    const k = list[i];
    const first = list.findIndex((x) => x.tier === k.tier);
    if (first !== i) place(i, first, k.tier);
  }

  function save() {
    setError("");
    const snapshot = list;
    start(async () => {
      const { error } = await createClient().rpc("set_action_ranking", {
        p_kinds: snapshot.map((k) => k.kind),
        p_tiers: snapshot.map((k) => k.tier),
      });
      if (error) setError("Couldn't save the order. Try again?");
      else {
        setSaved(key(snapshot));
        setSavedList(snapshot);
      }
    });
  }

  const endDrag = () => {
    setDragging(null);
    setOver(null);
  };

  return (
    <div className="mt-5">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-navy">
          Preview what an organiser gets
        </p>
        <div className="mt-3">
          <HoursSlider
            value={hours}
            max={maxMinutes}
            onChange={setBudget}
            note={`${picked.size} actions`}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-sm">
          <span className="text-stone-500">Events included, with</span>
          <select
            value={events}
            onChange={(e) => setEvents(Number(e.target.value))}
            className="rounded-lg border border-stone-200 bg-white px-2 py-1"
          >
            {[0.5, 1, 2, 3].map((n) => (
              <option key={n} value={n}>
                {eventsLabel(n)}
              </option>
            ))}
          </select>
        </div>
        {picked && (
          <p className="mt-2 text-xs text-stone-500">
            {fmt(eventMinutes(events))} at events ({EVENT_MINUTES / 60} hours
            each) + {fmt(used)} of actions: {picked.size} actions suggested,
            marked below. Actions during an event count as part of the event
            time.
          </p>
        )}
      </div>

      {TIERS.map((t) => {
        const rows = list
          .map((k, i) => ({ k, i }))
          .filter(({ k }) => k.tier === t.tier);
        const mins = rows
          .filter(({ k }) => k.defaultOn)
          .reduce((n, { k }) => n + weeklyMinutes(k, events), 0);
        return (
          <section key={t.tier} className="mt-6">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setOver(`t${t.tier}`);
              }}
              onDragLeave={() =>
                setOver((o) => (o === `t${t.tier}` ? null : o))
              }
              onDrop={(e) => {
                e.preventDefault();
                if (dragging != null) {
                  const first = list.findIndex((x) => x.tier === t.tier);
                  place(dragging, first < 0 ? list.length : first, t.tier);
                }
                endDrag();
              }}
              className={`flex items-baseline gap-2 rounded-xl px-1 py-1 ${over === `t${t.tier}` ? "bg-pink/10" : ""}`}
            >
              <h2 className={`text-lg font-bold ${t.cls}`}>{t.label}</h2>
              <span className="text-xs font-medium uppercase tracking-wide text-stone-400">
                {t.hint} · {rows.length}
              </span>
              {mins > 0 && (
                <span className="ml-auto text-xs text-stone-400">
                  on by default: ~{fmt(mins)} a week on top of events
                </span>
              )}
            </div>
            {rows.length === 0 && (
              <p className="mt-1 rounded-xl border border-dashed border-stone-300 px-3 py-3 text-center text-xs text-stone-400">
                Drag an action here
              </p>
            )}
            <ol className="mt-1.5 flex flex-col gap-1.5">
              {rows.map(({ k, i }) => {
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
                      setOver(`r${i}`);
                    }}
                    onDragLeave={() =>
                      setOver((o) => (o === `r${i}` ? null : o))
                    }
                    onDrop={(e) => {
                      e.preventDefault();
                      // Dropped on a row: takes its place (and its section).
                      if (dragging != null && dragging !== i)
                        place(dragging, dragging < i ? i + 1 : i, k.tier);
                      endDrag();
                    }}
                    onDragEnd={endDrag}
                    className={`flex cursor-grab items-center gap-3 rounded-xl border px-3 py-2 active:cursor-grabbing ${over === `r${i}` && dragging !== i ? "border-pink" : "border-transparent"} ${dragging === i ? "opacity-40" : ""} ${on ? "bg-cyan/[0.07] shadow-[inset_4px_0_0_var(--color-cyan)]" : "bg-white"}`}
                  >
                    <span className="w-6 shrink-0 text-right text-sm font-bold tabular-nums text-stone-400">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-snug text-navy">
                        {k.title}
                        <span
                          className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-medium ${TAG[k.when].cls}`}
                        >
                          {TAG[k.when].label}
                        </span>
                        {!k.defaultOn && (
                          <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-500">
                            Off by default
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-stone-500">
                        ~{k.label} min {WHEN[k.when]}
                        {k.when === "during" ? " (part of the event time)" : ""}
                        {k.appliesTo && k.appliesTo !== "All events"
                          ? ` · ${k.appliesTo}`
                          : ""}
                        {k.blurb ? ` · ${k.blurb}` : ""}
                      </p>
                    </div>
                    {on && (
                      <span className="hidden shrink-0 items-center gap-1 text-xs font-semibold text-cyan-700 sm:flex">
                        <svg
                          viewBox="0 0 16 16"
                          className="h-3.5 w-3.5"
                          aria-hidden
                        >
                          <path
                            d="M3 8.5l3 3 7-7"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Suggested
                      </span>
                    )}
                    <span className="flex shrink-0 gap-0.5">
                      <button
                        onClick={() => toTop(i)}
                        disabled={list[i - 1]?.tier !== k.tier}
                        aria-label={`Move ${k.title} to the top of ${TIERS[k.tier - 1].label}`}
                        title="Move to the top of this section"
                        className="h-7 w-7 rounded-md text-stone-400 hover:bg-stone-100 hover:text-navy disabled:opacity-30"
                      >
                        ⤒
                      </button>
                      <button
                        onClick={() => up(i)}
                        disabled={i === 0}
                        title={
                          list[i - 1]?.tier !== k.tier && k.tier > 1
                            ? `Move up to ${TIERS[k.tier - 2].label}`
                            : undefined
                        }
                        aria-label={`Move ${k.title} up`}
                        className="h-7 w-7 rounded-md text-stone-400 hover:bg-stone-100 hover:text-navy disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => down(i)}
                        disabled={i === list.length - 1 && k.tier === 3}
                        title={
                          list[i + 1]?.tier !== k.tier && k.tier < 3
                            ? `Move down to ${TIERS[k.tier as 1 | 2].label}`
                            : undefined
                        }
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
          </section>
        );
      })}

      {(dirty || error) && (
        <div className="sticky bottom-4 mt-4 flex items-center justify-end gap-3 rounded-2xl bg-navy px-4 py-3 text-sm text-white shadow-lg">
          {error && <span className="mr-auto text-pink">{error}</span>}
          {!error && <span className="mr-auto opacity-80">Order changed</span>}
          <button
            onClick={() => {
              setList(savedList);
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
