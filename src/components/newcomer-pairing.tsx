"use client";

import { useState, type ComponentProps } from "react";
import { FoldButton, TaskCard, type TaskRow } from "@/components/task-card";
import { TaskDoneBox } from "@/components/task-done-box";
import { useFold } from "@/lib/use-fold";
import { PairingPostButton } from "@/components/pairing-post";

// "Paired with a regular" is made once per newcomer (com_buddies). Kai,
// 25 Nov 2026: "make all the separate newcomer support pairing cards just be
// one per week". On the Actions page they're shown as one card per week
// (the week the newcomer first came, Monday to Sunday in community time),
// with a row per newcomer: tick box, name, Pick a regular; tap the name for
// the full action (Delegate, Move). Each row is still its own action
// underneath, so pairing someone still ticks theirs off on its own.

type CardProps = Omit<ComponentProps<typeof TaskCard>, "task">;

// Monday of the week the action was made (due 72 h after it's made).
function weekOf(dueAt: string, tz: string) {
  const made = new Date(Date.parse(dueAt) - 72 * 36e5);
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(made);
  const d = new Date(`${ymd}T00:00:00Z`);
  const monday = new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 864e5);
  return monday.toISOString().slice(0, 10);
}

const short = (ymd: string) =>
  new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${ymd}T00:00:00Z`));

export function NewcomerPairing({
  tasks,
  card,
}: {
  tasks: TaskRow[];
  card: CardProps;
}) {
  const weeks = new Map<string, TaskRow[]>();
  for (const t of tasks) {
    const w = weekOf(t.dueAt, card.tz);
    weeks.set(w, [...(weeks.get(w) ?? []), t]);
  }
  return (
    <>
      {[...weeks.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([week, list]) => (
          <Week key={week} week={week} list={list} card={card} />
        ))}
    </>
  );
}

function Week({
  week,
  list,
  card,
}: {
  week: string;
  list: TaskRow[];
  card: CardProps;
}) {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [folded, toggleFold] = useFold(`pairing:${week}`);
  const first = list[0];
  const doneCount = list.filter((t) => done[t.id]).length;
  const sunday = new Date(Date.parse(`${week}T00:00:00Z`) + 6 * 864e5)
    .toISOString()
    .slice(0, 10);
  const overdue = list.some(
    (t) => !done[t.id] && Date.parse(t.dueAt) < card.now,
  );
  const rows = [...list].sort(
    (a, b) =>
      Number(!!done[a.id]) - Number(!!done[b.id]) ||
      a.dueAt.localeCompare(b.dueAt),
  );
  return (
    <li className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="flex flex-wrap items-center gap-2">
        <FoldButton folded={folded} onClick={toggleFold} />
        <h3
          className="cursor-pointer font-semibold text-navy"
          onDoubleClick={toggleFold}
        >
          {first.title}
        </h3>
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
          ~{first.estimateLabel} min each
        </span>
        {overdue && (
          <span className="rounded-full bg-[#ef4444]/10 px-2 py-0.5 text-xs font-medium text-[#b91c1c]">
            Do today
          </span>
        )}
        <span className="text-xs text-stone-500">
          Newcomers {short(week)} – {short(sunday)}
        </span>
        <span className="ml-auto text-xs text-stone-500">
          {doneCount} of {list.length} done
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-200">
        <div
          className="h-full rounded-full bg-cyan transition-all"
          style={{ width: `${(doneCount / list.length) * 100}%` }}
        />
      </div>
      {!folded && (
        <>
          <p className="mt-2 text-sm text-stone-600">
            Connect a regular member with each newcomer so they feel welcome.
            Each one ticks itself off once someone is connected.
          </p>
          <div className="mt-2">
            <PairingPostButton
              people={list
                .filter((t) => t.personId)
                .map((t) => {
                  const name = t.personName ?? "Newcomer";
                  return { id: t.personId!, name, first: name.split(" ")[0] };
                })}
              dates={`${short(week)} – ${short(sunday)}`}
              tz={card.tz}
            />
          </div>
        </>
      )}
      <ul className={`mt-3 divide-y divide-black/5 ${folded ? "hidden" : ""}`}>
        {rows.map((t) => {
          const isOpen = open === t.id;
          const isDone = !!done[t.id];
          return (
            <li key={t.id} className="py-2">
              <div className="flex items-center gap-3">
                <TaskDoneBox
                  taskId={t.id}
                  initialDone={false}
                  onChange={(v) => setDone((m) => ({ ...m, [t.id]: v }))}
                />
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : t.id)}
                  aria-expanded={isOpen}
                  className={`min-w-0 flex-1 text-left ${isDone ? "opacity-50" : ""}`}
                >
                  <span
                    className={`font-medium text-navy ${isDone ? "line-through" : ""}`}
                  >
                    {t.personName ?? "Newcomer"}
                  </span>{" "}
                  <span className="text-[10px] text-stone-400">
                    {isOpen ? "▲" : "▼"}
                  </span>
                </button>
                {t.personId && !isDone && (
                  <a
                    href={`/people/${t.personId}?pair=1#pair`}
                    className="shrink-0 rounded-xl bg-pink px-3 py-1 text-sm font-semibold text-navy hover:bg-pink-strong"
                  >
                    Pick a regular →
                  </a>
                )}
              </div>
              {isOpen && (
                <ul className="mt-2">
                  <TaskCard task={t} {...card} collapsible={false} />
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </li>
  );
}
