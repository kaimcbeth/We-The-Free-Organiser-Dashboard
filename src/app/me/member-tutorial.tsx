"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ReminderSetting, type BuddyDashboard } from "./buddy-section";

type Step = {
  icon: string;
  tone: string;
  title: string;
  body: string;
  extra?: React.ReactNode;
};

// A short welcome tour for new members. Shows once (until they finish or skip),
// every time in God Mode's "View as New member", and on "Replay the tour".
export function MemberTutorial({
  firstName,
  teamName,
  whatsappUrl,
  notifyChannel,
  hasEmail,
  autoOpen,
  preview,
}: {
  firstName: string;
  teamName: string;
  whatsappUrl: string | null;
  notifyChannel: BuddyDashboard["notify_channel"];
  hasEmail: boolean;
  autoOpen: boolean;
  preview: boolean; // God Mode preview: don't save anything
}) {
  const [open, setOpen] = useState(autoOpen);
  const [i, setI] = useState(0);

  // "Replay the tour" links anywhere on the page open it again.
  useEffect(() => {
    const replay = () => {
      setI(0);
      setOpen(true);
    };
    window.addEventListener("wtf:replay-tour", replay);
    return () => window.removeEventListener("wtf:replay-tour", replay);
  }, []);

  const steps: Step[] = [
    {
      icon: "👋",
      tone: "bg-pink",
      title: `Welcome, ${firstName}!`,
      body: `You're now a member of We The Free ${teamName}. Here's a quick 30-second tour of your page.`,
    },
    {
      icon: "✅",
      tone: "bg-cyan",
      title: "Just turn up",
      body: "At every event, someone from the community ticks you in. You don't need to sign in or scan anything on the day.",
    },
    {
      icon: "📅",
      tone: "bg-yellow",
      title: "Your events and milestones",
      body: "Every event you come to shows up on this page, so you can look back on everything you've been part of. It also helps us notice and celebrate your milestones along the way.",
    },
    {
      icon: "🙂",
      tone: "bg-pink",
      title: "Your details, your choice",
      body: "Add a photo, your suburb and how to reach you. Only you can change these. Organisers use them to keep you in the loop, and you choose whether you get texts and emails.",
    },
    ...(whatsappUrl
      ? [
          {
            icon: "💬",
            tone: "bg-[#25D366]",
            title: "Join the community",
            body: "Most of the chat happens in our WhatsApp community: event updates, discussions about animal rights and activism, and getting to know everyone.",
            extra: (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block rounded-xl bg-[#25D366] px-4 py-2.5 font-semibold text-navy"
              >
                Join on WhatsApp ↗
              </a>
            ),
          },
        ]
      : []),
    {
      icon: "🔔",
      tone: "bg-cyan",
      title: "Stay in the loop",
      body: "If you're going to an event, we'll remind you the day before. The bell at the top shows your notifications. Add this page to your home screen to open it like an app (on iPhone: Share → Add to Home Screen).",
      extra: (
        <ReminderSetting
          initial={notifyChannel}
          hasEmail={hasEmail}
          intro="Also send reminders by (you can change this in your profile):"
          bare
          dryRun={preview}
        />
      ),
    },
    {
      icon: "🎉",
      tone: "bg-yellow",
      title: "You're all set",
      body: "See you at the next event! You can replay this tour any time from the bottom of your page.",
    },
  ];

  if (!open) return null;
  const step = steps[i];
  const last = i === steps.length - 1;

  function finish() {
    setOpen(false);
    if (!preview)
      createClient()
        .rpc("finish_tutorial")
        .then(() => {});
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/70 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Welcome tour"
        className="w-full rounded-t-3xl bg-background p-6 pb-8 text-center sm:max-w-sm sm:rounded-3xl"
      >
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-stone-500">
            {i + 1} of {steps.length}
          </span>
          {!last && (
            <button
              onClick={finish}
              className="rounded-lg px-2 py-1 text-stone-500 hover:bg-black/5"
            >
              Skip tour
            </button>
          )}
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
        {step.extra}

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
            onClick={() => (last ? finish() : setI(i + 1))}
            className="flex-1 rounded-xl bg-pink px-4 py-3 font-semibold text-navy hover:bg-pink-strong"
          >
            {last ? "Let's go" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ReplayTour() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("wtf:replay-tour"))}
      className="text-sm font-medium text-pink-ink hover:underline"
    >
      Replay the welcome tour
    </button>
  );
}
