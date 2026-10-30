"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type Training = {
  key: string;
  title: string;
  blurb: string;
  url: string;
  min_events: number;
  done_at: string | null;
  snoozed: boolean;
};
export type MyTrainings = { events: number; trainings: Training[] };

// The one training we suggest next: unlocked and not done yet.
export function recommendedTraining(data: MyTrainings | null) {
  return (
    data?.trainings.find((t) => !t.done_at && t.min_events <= data.events) ??
    null
  );
}

function useSetTraining(preview: boolean) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  function set(key: string, action: "done" | "undo" | "snooze") {
    if (preview) {
      setMsg("Preview: nothing saved.");
      return;
    }
    start(async () => {
      const { error } = await createClient().rpc("set_my_training", {
        p_key: key,
        p_action: action,
      });
      if (error) setMsg("Something went wrong. Please try again.");
      else router.refresh();
    });
  }
  return { set, pending, msg };
}

// How you can help → Training: one recommended training at a time, then the
// ones you've done.
export function TrainingSection({
  data,
  preview,
}: {
  data: MyTrainings;
  preview: boolean;
}) {
  const { set, pending, msg } = useSetTraining(preview);
  const next = recommendedTraining(data);
  const done = data.trainings.filter((t) => t.done_at);
  const later = data.trainings.find(
    (t) => !t.done_at && t.min_events > data.events,
  );
  if (!next && done.length === 0 && !later) return null;

  return (
    <section id="training" className="mt-10 scroll-mt-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
        Training
      </h2>
      {next ? (
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-pink">
          <p className="text-xs font-semibold uppercase tracking-wide text-pink-ink">
            Recommended for you
          </p>
          <h3 className="mt-1 font-semibold">{next.title}</h3>
          <p className="mt-0.5 text-sm text-stone-600">{next.blurb}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <a
              href={next.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-pink px-4 py-2 text-sm font-semibold text-navy hover:bg-pink-strong"
            >
              Open the training ↗
            </a>
            <button
              type="button"
              disabled={pending}
              onClick={() => set(next.key, "done")}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-navy ring-1 ring-stone-300 hover:bg-stone-50 disabled:opacity-60"
            >
              I&apos;ve done this
            </button>
          </div>
          {msg && <p className="mt-2 text-sm text-stone-600">{msg}</p>}
        </div>
      ) : later ? (
        <p className="rounded-2xl border border-dashed border-stone-300 px-4 py-3 text-sm text-stone-500">
          <span className="font-medium text-stone-700">Coming up next:</span>{" "}
          {later.title}. Opens after {later.min_events - data.events} more{" "}
          {later.min_events - data.events === 1 ? "event" : "events"}.
        </p>
      ) : (
        <p className="text-sm text-stone-500">
          You&apos;re all caught up. New trainings will show here.
        </p>
      )}

      {done.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-stone-600">
          {done.map((t) => (
            <li key={t.key} className="flex flex-wrap items-center gap-x-2">
              <span aria-hidden className="text-cyan-ink">
                ✓
              </span>
              <a
                href={t.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {t.title}
              </a>
              <button
                type="button"
                disabled={pending}
                onClick={() => set(t.key, "undo")}
                className="text-xs text-stone-400 hover:text-navy hover:underline"
              >
                Not done after all
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Events page: one line suggesting the next training. "Not now" hides it for
// a month.
export function TrainingNudge({
  data,
  preview,
}: {
  data: MyTrainings | null;
  preview: boolean;
}) {
  const { set, pending } = useSetTraining(preview);
  const [hidden, setHidden] = useState(false);
  const t = recommendedTraining(data);
  if (!t || t.snoozed || hidden || !data) return null;
  return (
    <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-white px-4 py-3 text-sm shadow-sm ring-1 ring-black/5">
      <span className="flex-1">
        You&apos;ve been to {data.events} events. Ready for the{" "}
        <Link
          href="/me/support#training"
          className="font-semibold text-pink-ink hover:underline"
        >
          {t.title}
        </Link>
        ?
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setHidden(true);
          set(t.key, "snooze");
        }}
        className="text-xs text-stone-400 hover:text-navy hover:underline"
      >
        Not now
      </button>
    </div>
  );
}
