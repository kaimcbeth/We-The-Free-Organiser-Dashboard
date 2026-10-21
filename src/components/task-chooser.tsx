"use client";

import { useState, useTransition } from "react";
import { saveTeamTasks } from "@/app/actions";
import type { TaskSetup } from "@/lib/task-setup";

const BUDGETS = [
  { minutes: 15, label: "15 min" },
  { minutes: 30, label: "30 min" },
  { minutes: 60, label: "1 hour" },
  { minutes: 120, label: "2+ hours" },
];

const fmt = (min: number) =>
  min < 60 ? `${min} min` : `${Math.round((min / 60) * 10) / 10} hr`;

// "How much time do you have each week?" -> suggested tasks -> tweak -> save.
export function TaskChooser({
  setup,
  communityName,
  onClose,
  startWithTime = true,
}: {
  setup: TaskSetup;
  communityName: string;
  onClose: (saved: boolean) => void;
  startWithTime?: boolean;
}) {
  const [step, setStep] = useState<"time" | "pick">(
    startWithTime ? "time" : "pick",
  );
  const [budget, setBudget] = useState<number | null>(null);
  const [on, setOn] = useState<Set<string>>(new Set(setup.enabled));
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const perWeek = (kind: string) =>
    (setup.kinds.find((k) => k.kind === kind)?.estimate ?? 0) *
    setup.eventsPerWeek;
  const total = [...on].reduce((n, k) => n + perWeek(k), 0);

  function pickBudget(minutes: number) {
    setBudget(minutes);
    // Suggest tasks in their usual order until the time runs out (always at least one).
    const next = new Set<string>();
    let used = 0;
    for (const k of setup.kinds) {
      const cost = k.estimate * setup.eventsPerWeek;
      if (next.size === 0 || used + cost <= minutes) {
        next.add(k.kind);
        used += cost;
      }
    }
    setOn(next);
    setStep("pick");
  }

  function toggle(kind: string) {
    setOn((s) => {
      const n = new Set(s);
      if (n.has(kind)) n.delete(kind);
      else n.add(kind);
      return n;
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-navy/70 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Choose your tasks"
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-background p-6 pb-8 sm:max-w-md sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">
            {step === "time"
              ? "How much time do you have?"
              : "Your follow-up tasks"}
          </h2>
          <button
            onClick={() => onClose(false)}
            className="rounded-lg px-2 py-1 text-sm text-stone-500 hover:bg-black/5"
          >
            {step === "time" ? "Later" : "Cancel"}
          </button>
        </div>

        {step === "time" ? (
          <>
            <p className="mt-2 text-stone-600">
              After each event, a few quick follow-up tasks can appear for you.{" "}
              {communityName} runs about{" "}
              <span className="font-semibold text-navy">
                {setup.eventsPerWeek} event
                {setup.eventsPerWeek === 1 ? "" : "s"} a week
              </span>
              . Roughly how much time can you give these tasks each week, not
              counting the events themselves?
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {BUDGETS.map((b) => (
                <button
                  key={b.minutes}
                  onClick={() => pickBudget(b.minutes)}
                  className="rounded-2xl bg-white px-4 py-4 text-lg font-semibold text-navy ring-1 ring-stone-300 hover:ring-2 hover:ring-pink"
                >
                  {b.label}
                  <span className="block text-xs font-normal text-stone-500">
                    a week
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep("pick")}
              className="mt-4 text-sm font-medium text-pink-ink"
            >
              Just let me pick
            </button>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-stone-600">
              {budget
                ? `Here's what fits in about ${fmt(budget)} a week. Switch any on or off.`
                : "Switch on the tasks you want after each event."}{" "}
              You can change this any time from the Tasks page.
            </p>
            <ul className="mt-4 space-y-2">
              {setup.kinds.map((k) => {
                const checked = on.has(k.kind);
                return (
                  <li key={k.kind}>
                    <button
                      role="switch"
                      aria-checked={checked}
                      onClick={() => toggle(k.kind)}
                      className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left ring-1 transition ${
                        checked
                          ? "bg-white ring-2 ring-cyan"
                          : "bg-white/60 ring-stone-200"
                      }`}
                    >
                      <span
                        className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${checked ? "bg-cyan" : "bg-stone-300"}`}
                      >
                        <span
                          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[18px]" : "left-0.5"}`}
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block font-medium ${checked ? "" : "text-stone-500"}`}
                        >
                          {k.title}
                        </span>
                        <span className="block text-xs text-stone-500">
                          ~{k.estimate} min per event · ~
                          {fmt(k.estimate * setup.eventsPerWeek)} a week
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 rounded-2xl bg-navy p-4 text-white">
              <p className="text-sm text-white/75">About</p>
              <p className="text-2xl font-semibold">
                {fmt(total)}{" "}
                <span className="text-base font-normal text-white/75">
                  a week
                </span>
              </p>
              {budget && total > budget && (
                <p className="mt-1 text-sm text-yellow">
                  That&apos;s a bit more than the {fmt(budget)} you said.
                </p>
              )}
            </div>
            {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
            <div className="mt-4 flex gap-2">
              {startWithTime && (
                <button
                  onClick={() => setStep("time")}
                  className="rounded-xl px-4 py-3 font-semibold text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50"
                >
                  Back
                </button>
              )}
              <button
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await saveTeamTasks([...on]);
                    if (r.error) setError(r.error);
                    else onClose(true);
                  })
                }
                className="flex-1 rounded-xl bg-pink px-4 py-3 font-semibold text-navy hover:bg-pink-strong disabled:opacity-60"
              >
                {pending ? "Saving…" : "Save my tasks"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
