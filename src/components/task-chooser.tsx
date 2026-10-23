"use client";

import { useState, useTransition } from "react";
import { addCustomTask, removeCustomTask, saveTeamTasks } from "@/app/actions";
import type { SetupKind, TaskSetup } from "@/lib/task-setup";
import { inputClass } from "@/components/form";

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
  const [kinds, setKinds] = useState<SetupKind[]>(setup.kinds);
  // The tasks shown up front (the suggestion); everything else sits under "More tasks".
  const [featured, setFeatured] = useState<Set<string>>(new Set(setup.enabled));
  const [showMore, setShowMore] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    minutes: 10,
    when: "after" as "before" | "after",
    days: 2,
  });
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const perWeek = (kind: string) => {
    const k = kinds.find((x) => x.kind === kind);
    return (k?.estimate ?? 0) * (k?.timesPerWeek ?? setup.eventsPerWeek);
  };
  const total = [...on].reduce((n, k) => n + perWeek(k), 0);

  function pickBudget(minutes: number) {
    setBudget(minutes);
    // Suggest tasks in their usual order until the time runs out (always at least one).
    const next = new Set<string>();
    let used = 0;
    // Suggest the most useful tasks first.
    const PRIORITY = [
      "take_attendance",
      "take_photos",
      "promote_whatsapp",
      "post_photos",
      "promote_facebook_groups",
      "promote_fb_groups_weekly",
      "facebook_event",
      "instagram_stories",
      "promote_instagram",
      "post_photos_instagram",
      "post_photos_facebook",
    ];
    const rank = (kind: string) =>
      PRIORITY.includes(kind) ? PRIORITY.indexOf(kind) : PRIORITY.length;
    for (const k of [...kinds].sort((a, b) => rank(a.kind) - rank(b.kind))) {
      const cost = k.estimate * (k.timesPerWeek ?? setup.eventsPerWeek);
      if (next.size === 0 || used + cost <= minutes) {
        next.add(k.kind);
        used += cost;
      }
    }
    setOn(next);
    setFeatured(new Set(next));
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
        aria-label="Choose your actions"
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-background p-6 pb-8 sm:max-w-md sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">
            {step === "time" ? "How much time do you have?" : "Your actions"}
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
              Around each event, a few quick actions can appear for you.{" "}
              {communityName} runs about{" "}
              <span className="font-semibold text-navy">
                {setup.eventsPerWeek} event
                {setup.eventsPerWeek === 1 ? "" : "s"} a week
              </span>
              . Roughly how much time can you give these actions each week, not
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
              onClick={() => {
                setFeatured(new Set(on));
                setStep("pick");
              }}
              className="mt-4 text-sm font-medium text-pink-ink"
            >
              Just let me pick
            </button>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-stone-600">
              {budget
                ? `Suggested for about ${fmt(budget)} a week.`
                : "Switch on the actions you want."}{" "}
              Change it any time.
            </p>
            {(() => {
              const WHEN = {
                before: "Before",
                during: "On the day",
                after: "After",
                weekly: "Weekly",
                monthly: "Monthly",
              } as const;
              const row = (k: SetupKind) => {
                const checked = on.has(k.kind);
                return (
                  <li key={k.kind} className="relative">
                    <button
                      role="switch"
                      aria-checked={checked}
                      onClick={() => toggle(k.kind)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ring-1 transition ${
                        checked
                          ? "bg-white ring-cyan"
                          : "bg-white/60 ring-stone-200"
                      }`}
                    >
                      <span
                        className={`relative h-5 w-8 shrink-0 rounded-full transition-colors ${checked ? "bg-cyan" : "bg-stone-300"}`}
                      >
                        <span
                          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? "left-3.5" : "left-0.5"}`}
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block text-sm font-medium leading-snug ${checked ? "" : "text-stone-500"}`}
                        >
                          {k.title}
                        </span>
                        <span className="block text-xs text-stone-500">
                          <span className="font-medium text-stone-600">
                            {WHEN[k.when]}
                          </span>
                          {k.blurb ? ` · ${k.blurb}` : ""}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 text-xs font-semibold text-stone-500 ${k.custom ? "pr-14" : ""}`}
                      >
                        {k.label}m
                      </span>
                    </button>
                    {k.custom && (
                      <button
                        onClick={() =>
                          start(async () => {
                            const r = await removeCustomTask(k.kind);
                            if (r.error) setError(r.error);
                            else {
                              setKinds((all) =>
                                all.filter((x) => x.kind !== k.kind),
                              );
                              setOn((o) => {
                                const n = new Set(o);
                                n.delete(k.kind);
                                return n;
                              });
                            }
                          })
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-1.5 py-1 text-xs font-medium text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                      >
                        Remove
                      </button>
                    )}
                  </li>
                );
              };
              const order = {
                weekly: 0,
                monthly: 1,
                before: 2,
                during: 3,
                after: 4,
              };
              const sorted = [...kinds].sort(
                (a, b) => order[a.when] - order[b.when],
              );
              const main = sorted.filter((k) => featured.has(k.kind));
              const more = sorted.filter((k) => !featured.has(k.kind));
              return (
                <>
                  <ul className="mt-4 space-y-2">{main.map(row)}</ul>
                  {more.length > 0 && (
                    <div className="mt-3">
                      <button
                        onClick={() => setShowMore((v) => !v)}
                        className="text-sm font-semibold text-pink-ink hover:underline"
                      >
                        {showMore ? "Hide" : "More actions"} ({more.length})
                      </button>
                      {showMore && (
                        <ul className="mt-2 space-y-2">{more.map(row)}</ul>
                      )}
                    </div>
                  )}
                </>
              );
            })()}

            {adding ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  start(async () => {
                    const r = await addCustomTask(
                      draft.title,
                      draft.minutes,
                      draft.when,
                      draft.days,
                    );
                    if (r.error || !r.kind)
                      setError(r.error ?? "Couldn't add the action.");
                    else {
                      setError("");
                      setKinds((all) => [
                        ...all,
                        {
                          kind: r.kind!,
                          title: draft.title.trim(),
                          estimate: draft.minutes,
                          label: String(draft.minutes),
                          blurb: null,
                          when: draft.when,
                          timesPerWeek: null,
                          custom: true,
                        },
                      ]);
                      setOn((o) => new Set(o).add(r.kind!));
                      setFeatured((f) => new Set(f).add(r.kind!));
                      setDraft({
                        title: "",
                        minutes: 10,
                        when: "after",
                        days: 2,
                      });
                      setAdding(false);
                    }
                  });
                }}
                className="mt-4 space-y-3 rounded-2xl bg-white p-4 ring-2 ring-pink/60"
              >
                <p className="font-semibold">Your own action</p>
                <input
                  autoFocus
                  required
                  value={draft.title}
                  onChange={(e) =>
                    setDraft({ ...draft, title: e.target.value })
                  }
                  placeholder="e.g. Thank-you message sent to volunteers"
                  aria-label="Action name"
                  maxLength={80}
                  className={inputClass}
                />
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-stone-600">Takes about</span>
                  <input
                    type="number"
                    min={1}
                    max={600}
                    value={draft.minutes}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        minutes: Number(e.target.value) || 1,
                      })
                    }
                    aria-label="Minutes"
                    className="w-16 rounded-lg border border-stone-300 bg-white px-2 py-1"
                  />
                  <span className="text-stone-600">min, due</span>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={draft.days}
                    onChange={(e) =>
                      setDraft({ ...draft, days: Number(e.target.value) || 0 })
                    }
                    aria-label="Days"
                    className="w-14 rounded-lg border border-stone-300 bg-white px-2 py-1"
                  />
                  <span className="text-stone-600">days</span>
                  <select
                    value={draft.when}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        when: e.target.value as "before" | "after",
                      })
                    }
                    aria-label="Before or after"
                    className="rounded-lg border border-stone-300 bg-white px-2 py-1"
                  >
                    <option value="before">before</option>
                    <option value="after">after</option>
                  </select>
                  <span className="text-stone-600">each event</span>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={pending}
                    className="flex-1 rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    Add action
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdding(false)}
                    className="rounded-xl px-4 py-2 text-sm text-stone-600 hover:bg-black/5"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="mt-3 text-sm font-semibold text-pink-ink hover:underline"
              >
                + Add your own action
              </button>
            )}
            <div className="mt-4 flex items-baseline justify-between rounded-2xl bg-navy px-4 py-3 text-white">
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
                {pending ? "Saving…" : "Save my actions"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
