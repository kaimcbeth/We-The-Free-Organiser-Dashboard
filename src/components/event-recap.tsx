"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// After an event (Kai, 4 Nov 2026): how many came, who was new, and for
// outreach the film numbers. The newcomer image is weekly (NewcomerReport).

type Recap = {
  attended: number;
  first_timers: { id: string; first_name: string; last_name: string | null }[];
  watched: number;
  answered: number;
  impact: number | null;
  tapouts: number;
};

export function EventRecap({
  eventId,
  title,
  when,
  dismissible = false,
  hideFilms = false,
}: {
  eventId: string;
  title: string;
  when: string; // "Sat 31 Oct"
  dismissible?: boolean; // Events tab card: has a close button
  hideFilms?: boolean; // event page of a Movie Challenge: the day summary has them
}) {
  const router = useRouter();
  const [recap, setRecap] = useState<Recap | null>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    let live = true;
    createClient()
      .rpc("event_recap", { p_event_id: eventId })
      .then(({ data }) => live && setRecap((data as Recap | null) ?? null));
    return () => {
      live = false;
    };
  }, [eventId]);

  if (!recap || closing) return null;
  const firsts = recap.first_timers.length;
  const films = !hideFilms && recap.watched > 0;

  async function close() {
    setClosing(true);
    await createClient()
      .from("event_recap_dismissals")
      .insert({ event_id: eventId });
    router.refresh();
  }
  const stat = (n: string, label: string) => (
    <div className="rounded-xl bg-stone-50 px-3 py-2">
      <p className="text-2xl font-bold tabular-nums text-navy">{n}</p>
      <p className="text-xs text-stone-500">{label}</p>
    </div>
  );

  return (
    <section className="relative rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      {dismissible && (
        <button
          type="button"
          onClick={close}
          aria-label="Close this recap"
          title="Close"
          className="absolute right-2 top-2 rounded-full px-2 py-0.5 text-lg leading-none text-stone-400 hover:bg-stone-100 hover:text-stone-700"
        >
          ×
        </button>
      )}
      <p className="text-xs font-semibold uppercase tracking-wide text-pink-ink">
        Event recap
      </p>
      <h2 className="mt-0.5 pr-6 text-lg font-semibold leading-snug tracking-tight">
        {dismissible ? (
          <a href={`/events/${eventId}`} className="hover:underline">
            {title}
          </a>
        ) : (
          title
        )}
        <span className="ml-2 text-sm font-normal text-stone-500">{when}</span>
      </h2>

      {recap.attended === 0 && !films ? (
        <p className="mt-2 text-sm text-stone-600">
          No one was checked in.{" "}
          <a
            href={`/events/${eventId}`}
            className="font-medium text-pink-ink hover:underline"
          >
            Add who came
          </a>{" "}
          to see the newcomers here.
        </p>
      ) : (
        <div
          className={`mt-3 grid grid-cols-2 gap-2 ${films ? "sm:grid-cols-5" : "sm:grid-cols-3"}`}
        >
          {stat(String(recap.attended), "came")}
          {stat(String(firsts), firsts === 1 ? "first-timer" : "first-timers")}
          {!films &&
            stat(String(Math.max(recap.attended - firsts, 0)), "came back")}
          {films && stat(String(recap.watched), "watched the film")}
          {films &&
            stat(
              recap.impact !== null ? String(recap.impact) : "–",
              "average impact /10",
            )}
          {films && stat(String(recap.tapouts), "tapouts")}
        </div>
      )}

      {firsts > 0 && (
        <div className="mt-3">
          <p className="text-sm text-stone-700">
            <span className="font-semibold">Newcomers: </span>
            {recap.first_timers
              .map((p) => [p.first_name, p.last_name].filter(Boolean).join(" "))
              .join(", ")}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            They&apos;ll be in the weekly Newcomers report on Events.
          </p>
        </div>
      )}
    </section>
  );
}
