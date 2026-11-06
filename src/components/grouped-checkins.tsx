"use client";

import { useState } from "react";
import { TaskCard, type TaskRow } from "@/components/task-card";
import { TaskDoneBox } from "@/components/task-done-box";
import { ConnectIdeas } from "@/components/connect-ideas";
import type { ConnectContext } from "@/lib/connect";

// RSL actions made for every community (organiser check-ins, 1:1 calls…) as
// one card per kind, with a row per community (Kai, 6 Nov 2026: "have them
// all in one card with sub tasks (still want to see event status for each
// team)"). Each row: a tick box, the community, its event status; tap it
// for the full action (ideas, Move, No reply yet).

export type CheckInItem = {
  task: TaskRow;
  community: string; // "Perth"
  tz: string;
  ctx: ConnectContext | null;
};

function status(ctx: ConnectContext | null) {
  if (!ctx) return { text: "", warn: false };
  if (ctx.quiet)
    return {
      text: "Nothing in the last month and nothing coming up",
      warn: true,
    };
  const parts: string[] = [];
  if (ctx.recent[0]) parts.push(`Last: ${ctx.recent[0].label}`);
  if (ctx.upcoming[0]) parts.push(`Next: ${ctx.upcoming[0].label}`);
  return { text: parts.join(" · "), warn: false };
}

const dueLabel = (iso: string, now: number) => {
  const days = Math.round((Date.parse(iso) - now) / 864e5);
  if (days < 0)
    return { text: "Overdue", cls: "bg-[#ef4444]/10 text-[#b91c1c]" };
  if (days <= 7) return { text: "This week", cls: "bg-yellow/30 text-navy" };
  return {
    text: new Intl.DateTimeFormat("en-AU", {
      day: "numeric",
      month: "short",
    }).format(new Date(iso)),
    cls: "bg-stone-100 text-stone-600",
  };
};

export function GroupedCheckIns({
  items,
  now,
}: {
  items: CheckInItem[];
  now: number;
}) {
  // One card per kind, in the order the kinds first appear.
  const groups = new Map<string, CheckInItem[]>();
  for (const it of items) {
    const list = groups.get(it.task.kind) ?? [];
    list.push(it);
    groups.set(it.task.kind, list);
  }
  return (
    <div className="space-y-4">
      {[...groups.entries()].map(([kind, list]) => (
        <Group key={kind} list={list} now={now} />
      ))}
    </div>
  );
}

function Group({ list, now }: { list: CheckInItem[]; now: number }) {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState<string | null>(null);
  const first = list[0].task;
  const title = first.title.replace(/: [^:]+$/, "");
  const doneCount = list.filter((i) => done[i.task.id]).length;
  const due = list.map((i) => i.task.dueAt).sort()[0];
  const d = dueLabel(due, now);
  const sorted = [...list].sort(
    (a, b) =>
      Number(!!done[a.task.id]) - Number(!!done[b.task.id]) ||
      a.task.dueAt.localeCompare(b.task.dueAt) ||
      a.community.localeCompare(b.community),
  );
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold text-navy">{title}</h3>
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
          ~{first.estimateLabel} min each
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${d.cls}`}
        >
          {d.text}
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
      {first.description && (
        <p className="mt-2 text-sm text-stone-600">{first.description}</p>
      )}
      <ul className="mt-3 divide-y divide-black/5">
        {sorted.map((it) => {
          const s = status(it.ctx);
          const isOpen = open === it.task.id;
          const isDone = !!done[it.task.id];
          return (
            <li key={it.task.id} className="py-2">
              <div className="flex items-start gap-3">
                <div className="pt-0.5">
                  <TaskDoneBox
                    taskId={it.task.id}
                    initialDone={false}
                    onChange={(v) =>
                      setDone((m) => ({ ...m, [it.task.id]: v }))
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : it.task.id)}
                  aria-expanded={isOpen}
                  className={`min-w-0 flex-1 text-left ${isDone ? "opacity-50" : ""}`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`font-medium text-navy ${isDone ? "line-through" : ""}`}
                    >
                      {it.community}
                    </span>
                    <span className="text-[10px] text-stone-400">
                      {isOpen ? "▲" : "▼"}
                    </span>
                  </span>
                  {s.text && (
                    <span
                      className={`mt-0.5 block text-xs ${
                        s.warn ? "font-medium text-amber-700" : "text-stone-500"
                      }`}
                    >
                      {s.text}
                    </span>
                  )}
                </button>
              </div>
              {isOpen && (
                <div className="mt-2">
                  <TaskCard
                    task={it.task}
                    tz={it.tz}
                    now={now}
                    whatsappUrl={null}
                    removable
                    moveEvents={it.ctx?.upcoming}
                    extra={it.ctx && <ConnectIdeas ctx={it.ctx} />}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
