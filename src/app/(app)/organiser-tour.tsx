"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { finishOrganiserTour } from "@/app/actions";
import { TaskChooser } from "@/components/task-chooser";
import type { TaskSetup } from "@/lib/task-setup";

type Step = { icon: string; tone: string; title: string; body: string };

// Welcome tour for new organisers. Ends by asking how much time they have
// and choosing their follow-up tasks.
export function OrganiserTour({
  firstName,
  communityName,
  setup,
}: {
  firstName: string;
  communityName: string;
  setup: TaskSetup;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [choosing, setChoosing] = useState(false);
  const [i, setI] = useState(0);

  const steps: Step[] = [
    {
      icon: "👋",
      tone: "bg-pink",
      title: `Welcome, ${firstName}!`,
      body: `You're now an organiser for ${communityName}. Here's a quick tour of what you can do.`,
    },
    {
      icon: "📅",
      tone: "bg-cyan",
      title: "Events come in by themselves",
      body: "Events are pulled in from activism.wtf automatically. Today's event sits at the top of the Events page, with the next one just below.",
    },
    {
      icon: "✅",
      tone: "bg-yellow",
      title: "Taking attendance",
      body: "Open today's event and tap names as people arrive. The people most likely to come are at the top, and someone new is one tap away. Hand the job to a volunteer with the Helper QR.",
    },
    {
      icon: "🧑‍🤝‍🧑",
      tone: "bg-pink",
      title: "People",
      body: "You only ever add a name. Members add their own details and photo when they connect, using the QR code on their profile.",
    },
    {
      icon: "📊",
      tone: "bg-cyan",
      title: "Insights and calendar",
      body: "Insights shows who's coming, first-timers, who's drifted off and upcoming milestones. The calendar shows your events, and nearby communities' too if you like.",
    },
    {
      icon: "🤝",
      tone: "bg-yellow",
      title: "Build your crew",
      body: "On Roles, add Core Team members to help take attendance. On someone's profile, approve them as a buddy to welcome newcomers.",
    },
    {
      icon: "📝",
      tone: "bg-pink",
      title: "Tasks after each event",
      body: "After every event, a few quick follow-up tasks appear on the Tasks page, each with a time estimate. Let's pick the ones that suit you.",
    },
  ];

  function finish() {
    setOpen(false);
    setChoosing(false);
    finishOrganiserTour().then(() => router.refresh());
  }

  if (choosing) {
    return (
      <TaskChooser
        setup={setup}
        communityName={communityName}
        onClose={() => finish()}
      />
    );
  }
  if (!open) return null;
  const step = steps[i];
  const last = i === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/70 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Organiser welcome tour"
        className="w-full rounded-t-3xl bg-background p-6 pb-8 text-center sm:max-w-sm sm:rounded-3xl"
      >
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-stone-500">
            {i + 1} of {steps.length}
          </span>
          <button
            onClick={finish}
            className="rounded-lg px-2 py-1 text-stone-500 hover:bg-black/5"
          >
            Skip tour
          </button>
        </div>
        <div
          className={`mx-auto mt-4 flex h-20 w-20 items-center justify-center rounded-3xl text-4xl ${step.tone}`}
        >
          <span aria-hidden>{step.icon}</span>
        </div>
        <h2 className="mt-5 text-xl font-semibold tracking-tight">
          {step.title}
        </h2>
        <p className="mt-2 text-stone-600">{step.body}</p>
        <div className="mt-6 flex justify-center gap-1.5" aria-hidden>
          {steps.map((_, n) => (
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
            onClick={() => (last ? setChoosing(true) : setI(i + 1))}
            className="flex-1 rounded-xl bg-pink px-4 py-3 font-semibold text-navy hover:bg-pink-strong"
          >
            {last ? "Choose my tasks" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
