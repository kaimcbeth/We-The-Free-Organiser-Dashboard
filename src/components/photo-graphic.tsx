"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/sheet";
import { GraphicMaker, type GraphicEvent } from "@/components/graphic-maker";
import { createClient } from "@/lib/supabase/client";
import type { EventPhoto } from "@/lib/event-photos";

// "Make graphic" from a Photo Hub photo (Kai, 1 Nov 2026): pick which event
// it's for, then the graphic maker opens with this photo chosen.

type Ev = GraphicEvent & { id: string; past: boolean };

export function PhotoGraphic({
  photo,
  teamId,
  onClose,
}: {
  photo: EventPhoto;
  teamId: string;
  onClose: () => void;
}) {
  const [events, setEvents] = useState<Ev[] | null>(null);
  const [tz, setTz] = useState("Australia/Sydney");
  const [picked, setPicked] = useState<Ev | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let live = true;
    const now = Date.now();
    Promise.all([
      supabase.from("teams").select("name, timezone").eq("id", teamId).single(),
      supabase
        .from("events")
        .select(
          "id, title, starts_at, ends_at, venue, address, event_type:event_types(name)",
        )
        .eq("team_id", teamId)
        .gte("starts_at", new Date(now - 120 * 864e5).toISOString())
        .lte("starts_at", new Date(now + 120 * 864e5).toISOString())
        .order("starts_at"),
    ]).then(([team, evs]) => {
      if (!live) return;
      if (team.data?.timezone) setTz(team.data.timezone);
      const list = (
        (evs.data ?? []) as unknown as {
          id: string;
          title: string;
          starts_at: string;
          ends_at: string | null;
          venue: string | null;
          address: string | null;
          event_type: { name: string } | null;
        }[]
      ).map((e) => ({
        id: e.id,
        eventId: e.id,
        teamId,
        title: e.title,
        startsAt: e.starts_at,
        endsAt: e.ends_at,
        venue: e.venue,
        address: e.address,
        typeName: e.event_type?.name ?? null,
        community:
          team.data?.name?.replace(/, (Australia|New Zealand)$/, "") ?? null,
        past: Date.parse(e.ends_at ?? e.starts_at) < now,
      }));
      // Coming up first (soonest first), then recent ones (latest first).
      setEvents([
        ...list.filter((e) => !e.past),
        ...list.filter((e) => e.past).reverse(),
      ]);
    });
    return () => {
      live = false;
    };
  }, [teamId]);

  if (picked)
    return (
      <GraphicMaker
        event={picked}
        tz={tz}
        photo={photo}
        startOpen
        onClose={onClose}
      />
    );

  const day = (iso: string) =>
    new Intl.DateTimeFormat("en-AU", {
      timeZone: tz,
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(new Date(iso));
  const upcoming = events?.filter((e) => !e.past) ?? [];
  const recent = events?.filter((e) => e.past) ?? [];

  return (
    <Sheet title="Make graphic" onClose={onClose}>
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
        <img
          src={photo.url}
          alt=""
          className="h-14 w-14 shrink-0 rounded-lg object-cover"
        />
        <p className="text-sm text-stone-600">Which event is it for?</p>
      </div>
      {events === null ? (
        <p className="mt-4 text-sm text-stone-500">Loading events…</p>
      ) : events.length === 0 ? (
        <p className="mt-4 text-sm text-stone-500">
          No events in the last or next four months.
        </p>
      ) : (
        [
          ["Coming up", upcoming],
          ["Recent (thank-you graphic)", recent],
        ].map(
          ([label, list]) =>
            (list as Ev[]).length > 0 && (
              <div key={label as string} className="mt-4">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500">
                  {label as string}
                </p>
                <ul className="space-y-1">
                  {(list as Ev[]).map((e) => (
                    <li key={e.id}>
                      <button
                        type="button"
                        onClick={() => setPicked(e)}
                        className="flex w-full items-baseline gap-3 rounded-xl bg-white px-3 py-2 text-left ring-1 ring-black/5 hover:bg-stone-50"
                      >
                        <span className="w-24 shrink-0 text-xs text-stone-500">
                          {day(e.startsAt)}
                        </span>
                        <span className="text-sm font-medium text-navy">
                          {e.title}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ),
        )
      )}
    </Sheet>
  );
}
