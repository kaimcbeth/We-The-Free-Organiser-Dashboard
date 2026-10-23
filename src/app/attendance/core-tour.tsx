"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { finishCoreTour } from "@/app/actions";

const STEPS = [
  {
    icon: "👋",
    tone: "bg-pink",
    title: (name: string) => `Welcome to the Core Team, ${name}!`,
    body: (community: string) =>
      `You're helping run ${community}. Here's what you can do, in under a minute.`,
  },
  {
    icon: "✅",
    tone: "bg-cyan",
    title: () => "Take attendance",
    body: () =>
      "Under Attendance, open today's event and tap names as people arrive. Someone new? Add them in one tap at the door.",
  },
  {
    icon: "📝",
    tone: "bg-yellow",
    title: () => "Your actions",
    body: () =>
      "You look after a few actions, like posting photos or promoting events. They come to you every event with a reminder, under My actions.",
  },
  {
    icon: "🙋",
    tone: "bg-pink",
    title: () => "Busy? That's fine",
    body: () =>
      "Hand an action to a helper, or set “I'm away until” and the organisers cover it while you're away.",
  },
  {
    icon: "🎯",
    tone: "bg-cyan",
    title: () => "Pick your actions",
    body: () =>
      "Choose the actions you'd like to look after. Anything you don't pick stays with the organisers, and you can change it any time.",
  },
];

// Welcome tour for new Core Team members, ending in choosing their actions.
export function CoreTour({
  firstName,
  communityName,
}: {
  firstName: string;
  communityName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [i, setI] = useState(0);
  if (!open) return null;
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  function finish(toSetup: boolean) {
    setOpen(false);
    finishCoreTour().then(() => {
      if (toSetup) router.push("/attendance/tasks#choose");
      else router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-navy/70 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Core Team welcome tour"
        className="w-full rounded-t-3xl bg-background p-6 pb-8 text-center sm:max-w-sm sm:rounded-3xl"
      >
        <div className="flex items-center justify-between text-sm">
          <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-semibold text-stone-600">
            ⏱ {i === 0 ? "About 1 min" : `${i + 1} of ${STEPS.length}`}
          </span>
          <button
            onClick={() => finish(false)}
            className="rounded-lg px-2 py-1 text-stone-500 hover:bg-black/5"
          >
            Skip
          </button>
        </div>
        <div
          className={`mx-auto mt-4 flex h-20 w-20 items-center justify-center rounded-3xl text-4xl ${step.tone}`}
        >
          <span aria-hidden>{step.icon}</span>
        </div>
        <h2 className="mt-5 text-xl font-semibold tracking-tight">
          {step.title(firstName)}
        </h2>
        <p className="mt-2 text-stone-600">{step.body(communityName)}</p>
        <div className="mt-6 flex justify-center gap-1.5" aria-hidden>
          {STEPS.map((_, n) => (
            <span
              key={n}
              className={`h-1.5 rounded-full transition-all ${n === i ? "w-5 bg-pink" : "w-1.5 bg-stone-300"}`}
            />
          ))}
        </div>
        <div className="mt-6 flex gap-2">
          {i > 0 && (
            <button
              onClick={() => setI(i - 1)}
              className="rounded-xl px-4 py-3 font-semibold text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50"
            >
              Back
            </button>
          )}
          <button
            onClick={() => (last ? finish(true) : setI(i + 1))}
            className="flex-1 rounded-xl bg-pink px-4 py-3 font-semibold text-navy hover:bg-pink-strong"
          >
            {last ? "Pick my actions →" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
