"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { finishOrganiserTour } from "@/app/actions";
import { TaskChooser } from "@/components/task-chooser";
import type { TaskSetup } from "@/lib/task-setup";

type Step = {
  section: number; // index into SECTIONS; -1 = the welcome card
  icon: string;
  tone: string;
  title: string;
  body: string;
};

// The tour in a few bite-sized parts, so it doesn't feel like a wall of cards.
const SECTIONS = [
  { icon: "📅", name: "Events" },
  { icon: "🧑‍🤝‍🧑", name: "People" },
  { icon: "📝", name: "Tasks" },
];

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
      section: -1,
      icon: "👋",
      tone: "bg-pink",
      title: `Welcome, ${firstName}!`,
      body: `You're now an organiser for ${communityName}. The tour has three short parts: your events, your people, and your tasks.`,
    },
    {
      section: 0,
      icon: "📅",
      tone: "bg-cyan",
      title: "Events come in by themselves",
      body: "Your events are copied from activism.wtf automatically, so you never have to type them in.",
    },
    {
      section: 0,
      icon: "🗓️",
      tone: "bg-yellow",
      title: "List or calendar",
      body: "Today's event sits at the top of the Events page, with the next one just below. Switch to Calendar to see the whole month.",
    },
    {
      section: 0,
      icon: "✅",
      tone: "bg-pink",
      title: "Taking attendance",
      body: "Open today's event and tap names as people arrive. The people most likely to come are at the top, and someone new is one tap away.",
    },
    {
      section: 0,
      icon: "🙌",
      tone: "bg-cyan",
      title: "Hand it off",
      body: "Can't be on the door? A volunteer can scan the Helper QR and check people in from their own phone. Your Core Team can take attendance too.",
    },
    {
      section: 0,
      icon: "📊",
      tone: "bg-yellow",
      title: "Insights",
      body: "See who's coming, who's new, who hasn't been in a while, and upcoming milestones like someone's 10th event.",
    },
    {
      section: 1,
      icon: "🧑‍🤝‍🧑",
      tone: "bg-cyan",
      title: "People",
      body: "Add a name and that's it. Members add their own details and photo when they connect with their QR code.",
    },
    {
      section: 1,
      icon: "💬",
      tone: "bg-yellow",
      title: "Reach out in one tap",
      body: "WhatsApp and Messenger buttons sit next to anyone with a phone number or Facebook link.",
    },
    {
      section: 1,
      icon: "🤝",
      tone: "bg-pink",
      title: "Build your crew",
      body: "Give people roles from their profile, even before they've connected. The role switches on when they join.",
    },
    {
      section: 1,
      icon: "🌱",
      tone: "bg-cyan",
      title: "New member support",
      body: "Switch it on for your most welcoming people. Newcomers get paired with one of them, who checks in and invites them back.",
    },
    {
      section: 2,
      icon: "✔️",
      tone: "bg-cyan",
      title: "Your task list",
      body: "Tasks appear around each event on the Tasks page, each with a time estimate. Tick them off as you go.",
    },
    {
      section: 2,
      icon: "📆",
      tone: "bg-yellow",
      title: "Promote your event",
      body: "Two weeks before, a task shows up to create the Facebook event. We copy the details for you, so you just paste them into Facebook.",
    },
    {
      section: 2,
      icon: "📣",
      tone: "bg-pink",
      title: "Share in local Facebook groups",
      body: "A week before, tap “Open all” and every local group opens in its own tab, ready to post. Your list is under Tasks → Facebook groups.",
    },
    {
      section: 2,
      icon: "⏰",
      tone: "bg-cyan",
      title: "Not now?",
      body: "Tap Move to hide a task until 6am on a later day. The bell at the top shows what's new.",
    },
    {
      section: 2,
      icon: "📝",
      tone: "bg-yellow",
      title: "After each event",
      body: "Photos, follow-ups and more. Let's pick the ones that suit you.",
    },
  ];

  // Rough time left: reading at ~180 words a minute, a few seconds per card,
  // plus about a minute to choose tasks at the end.
  const minutesLeft = (from: number) => {
    const words = steps
      .slice(from)
      .reduce((n, st) => n + `${st.title} ${st.body}`.split(/\s+/).length, 0);
    return Math.max(
      1,
      Math.round(words / 180 + (steps.length - from) * 0.08 + 1),
    );
  };

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
          <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-semibold text-stone-600">
            ⏱ {i === 0 ? "About" : "~"} {minutesLeft(i)} min
            {i === 0 ? "" : " left"}
          </span>
          <button
            onClick={finish}
            className="rounded-lg px-2 py-1 text-stone-500 hover:bg-black/5"
          >
            Skip tour
          </button>
        </div>
        {/* The parts of the tour: done ones ticked, the current one filled. */}
        <ol className="mt-4 flex items-center justify-center gap-1.5 text-xs font-semibold">
          {SECTIONS.map((sec, n) => {
            const done = step.section > n;
            const here = step.section === n;
            const inSection = steps.filter((st) => st.section === n);
            const pos = inSection.indexOf(step) + 1;
            return (
              <li key={sec.name} className="flex items-center gap-1.5">
                {n > 0 && (
                  <span
                    aria-hidden
                    className={`h-px w-3 ${done || here ? "bg-pink" : "bg-stone-300"}`}
                  />
                )}
                <button
                  type="button"
                  onClick={() =>
                    setI(steps.findIndex((st) => st.section === n))
                  }
                  aria-current={here ? "step" : undefined}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 ring-1 transition-colors ${
                    here
                      ? "bg-navy text-white ring-navy"
                      : done
                        ? "bg-pink/20 text-navy ring-pink/40"
                        : "bg-white text-stone-500 ring-stone-300"
                  }`}
                >
                  <span aria-hidden>{done ? "✓" : sec.icon}</span>
                  {sec.name}
                  {here && (
                    <span className="font-normal text-white/70">
                      {pos}/{inSection.length}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
        <div
          className={`mx-auto mt-4 flex h-20 w-20 items-center justify-center rounded-3xl text-4xl ${step.tone}`}
        >
          <span aria-hidden>{step.icon}</span>
        </div>
        <h2 className="mt-5 text-xl font-semibold tracking-tight">
          {step.title}
        </h2>
        <p className="mt-2 text-stone-600">{step.body}</p>
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
            {last
              ? "Choose my tasks"
              : steps[i + 1].section !== step.section
                ? `${i === 0 ? "Start with" : "Next:"} ${SECTIONS[steps[i + 1].section].name}`
                : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
