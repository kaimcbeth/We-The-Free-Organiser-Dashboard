"use client";

import { useEffect, useState } from "react";
import { GraphicMaker, type GraphicEvent } from "@/components/graphic-maker";
import { MeetingPointMaker } from "@/components/meeting-point";
import { CopyMaker } from "@/components/copy-maker";
import { createClient } from "@/lib/supabase/client";
import { MeetMembersButton } from "@/components/meet-members-maker";
import { SeasonCalendarButton } from "@/components/season-calendar";
import { SeasonHostsGraphic } from "@/components/season-hosts-graphic";
import { RecapButton } from "@/components/recap-maker";

// "Make a post" on the Social Media Hub (Kai, 6 Nov 2026: "a universal
// graphic and copy generator that can attach to listed events"). Pick one of
// the community's events (coming up, or recent for a thank-you) or
// "Something else", then make a graphic and/or write the words.
// Below that, the posts that aren't about one event (Kai, 6 Nov: "Meet the
// Members and the calendars"), each opening the same maker as its action.

const SEASON_MONTHS = [3, 6, 9, 12];

// The next season's first day (1 Mar/Jun/Sep/Dec) as a UTC midnight, in the
// community's timezone.
function nextSeasonStart(tz: string, now: number) {
  const [y, m] = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
  })
    .format(new Date(now))
    .split("-")
    .map(Number);
  const nm = SEASON_MONTHS.find((x) => x > m);
  return nm ? Date.UTC(y, nm - 1, 1) : Date.UTC(y + 1, 2, 1);
}

type Ev = GraphicEvent & { id: string; past: boolean };

export function PostMaker({ teamId, tz }: { teamId: string; tz: string }) {
  const [events, setEvents] = useState<Ev[] | null>(null);
  const [community, setCommunity] = useState<string | null>(null);
  const [picked, setPicked] = useState<string>(""); // event id, "none" = no event
  const [showRecent, setShowRecent] = useState(false);
  const [season] = useState(() => nextSeasonStart(tz, Date.now()));
  // The makers work the season out from their action's due date: the
  // calendar is due the day before, the hosts ask 3 weeks before.
  const calendarDue = new Date(season - 864e5 + 6 * 36e5).toISOString();
  const hostsDue = new Date(season - 21 * 864e5).toISOString();

  useEffect(() => {
    const supabase = createClient();
    let live = true;
    const now = Date.now();
    Promise.all([
      supabase.from("teams").select("name").eq("id", teamId).single(),
      supabase
        .from("events")
        .select(
          "id, title, starts_at, ends_at, venue, address, event_type:event_types(name)",
        )
        .eq("team_id", teamId)
        .gte("starts_at", new Date(now - 30 * 864e5).toISOString())
        .lte("starts_at", new Date(now + 90 * 864e5).toISOString())
        .order("starts_at"),
    ]).then(([team, evs]) => {
      if (!live) return;
      const name =
        team.data?.name?.replace(/, (Australia|New Zealand)$/, "") ?? null;
      setCommunity(name);
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
        community: name,
        past: Date.parse(e.ends_at ?? e.starts_at) < now,
      }));
      setEvents([
        ...list.filter((e) => !e.past),
        ...list.filter((e) => e.past).reverse(),
      ]);
    });
    return () => {
      live = false;
    };
  }, [teamId]);

  // A blank "event" for posts that aren't about one: every word on the
  // graphic can be changed, so it only needs a starting heading.
  const [stub] = useState<GraphicEvent>(() => ({
    title: "We The Free",
    startsAt: new Date(Date.now() + 864e5).toISOString(),
    endsAt: null,
    venue: null,
    address: null,
    typeName: null,
    community: null,
    teamId,
  }));
  const general = {
    ...stub,
    community,
    title: community ? `We The Free ${community}` : "We The Free",
  };

  // No event: start with the date and time left off on every style.
  const noDates: Record<string, string> = Object.fromEntries(
    [
      "classic.date",
      "classic.time",
      "poster.badge1",
      "poster.badge2",
      "poster.left",
      "teaser.small",
      "teaser.date",
      "bigphoto.date",
      "details.year",
      "details.month",
      "details.day",
      "details.when1",
    ].map((k) => [k, ""]),
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
  const ev = events?.find((e) => e.id === picked) ?? null;

  const go =
    "shrink-0 rounded-full bg-pink px-3 py-1.5 text-xs font-semibold text-navy hover:bg-pink-strong";
  const row = (id: string, left: string, title: string) => (
    <li key={id}>
      <button
        type="button"
        onClick={() => setPicked(picked === id ? "" : id)}
        className={`flex w-full items-baseline gap-3 rounded-xl px-3 py-2 text-left ring-1 ${picked === id ? "bg-navy text-white ring-navy" : "bg-white ring-black/5 hover:bg-stone-50"}`}
      >
        <span
          className={`w-24 shrink-0 text-xs ${picked === id ? "text-white/70" : "text-stone-500"}`}
        >
          {left}
        </span>
        <span
          className={`text-sm font-medium ${picked === id ? "text-white" : "text-navy"}`}
        >
          {title}
        </span>
      </button>
    </li>
  );

  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
      <h2 className="font-semibold">What&apos;s the post for?</h2>
      <p className="mt-0.5 text-sm text-stone-600">
        Pick an event to promote or thank people for, or make a post about
        anything else.
      </p>
      {events === null ? (
        <p className="mt-3 text-sm text-stone-500">Loading events…</p>
      ) : (
        <>
          <ul className="mt-3 space-y-1">
            {row("none", "No event", "Something else")}
          </ul>
          {upcoming.length > 0 && (
            <>
              <p className="mt-4 mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500">
                Coming up
              </p>
              <ul className="max-h-72 space-y-1 overflow-y-auto">
                {upcoming.map((e) => row(e.id, day(e.startsAt), e.title))}
              </ul>
            </>
          )}
          {recent.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setShowRecent(!showRecent)}
                className="mt-4 mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500 hover:text-navy"
              >
                Recent, to say thanks ({recent.length}) {showRecent ? "▴" : "▾"}
              </button>
              {showRecent && (
                <ul className="space-y-1">
                  {recent.map((e) => row(e.id, day(e.startsAt), e.title))}
                </ul>
              )}
            </>
          )}
        </>
      )}

      {picked && (
        <div className="mt-4 rounded-xl bg-stone-50 p-3">
          <p className="text-sm font-medium text-navy">
            {ev ? ev.title : "A post about something else"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <GraphicMaker
              key={picked}
              event={ev ?? general}
              tz={tz}
              initialEdits={ev ? undefined : noDates}
              label="Make a graphic"
              className="rounded-full bg-pink px-4 py-2 text-sm font-semibold text-navy hover:bg-pink-strong"
            />
            <CopyMaker
              key={`c-${picked}`}
              eventId={ev?.id ?? null}
              teamId={teamId}
              past={!!ev?.past}
              label="Write the words"
              className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy/90"
            />
            {ev && !ev.past && (
              <MeetingPointMaker
                key={`m-${picked}`}
                event={{ ...ev, teamId, eventId: ev.id }}
                tz={tz}
                label="Meeting point"
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-navy ring-1 ring-black/10 hover:bg-stone-50"
              />
            )}
          </div>
          <p className="mt-2 text-xs text-stone-500">
            Both can be saved straight to the planner.
            {!ev && " On the graphic, change the words to say what it's about."}
          </p>
        </div>
      )}
      <p className="mt-5 mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500">
        Other posts
      </p>
      <ul className="space-y-1">
        {[
          {
            key: "meet",
            left: "Monthly",
            title: "Meet the Members",
            blurb: "A carousel of one member's answers and photos.",
            button: (
              <MeetMembersButton
                teamId={teamId}
                label="Make it"
                className={go}
              />
            ),
          },
          {
            key: "recap",
            left: "Monthly",
            title: "Monthly photo recap",
            blurb: "The month's photos, plus what's coming up next month.",
            button: (
              <RecapButton teamId={teamId} label="Make it" className={go} />
            ),
          },
          {
            key: "calendar",
            left: "Seasonal",
            title: "Seasonal calendar",
            blurb: "What's on next season, on one graphic.",
            button: (
              <SeasonCalendarButton
                teamId={teamId}
                dueAt={calendarDue}
                label="Make it"
                className={go}
              />
            ),
          },
          {
            key: "hosts",
            left: "Seasonal",
            title: "Hosts wanted next season",
            blurb: "Asks if anyone's keen to host something.",
            button: (
              <SeasonHostsGraphic
                teamId={teamId}
                dueAt={hostsDue}
                tz={tz}
                label="Make it"
                className={go}
              />
            ),
          },
        ].map((o) => (
          <li
            key={o.key}
            className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-black/5"
          >
            <span className="w-24 shrink-0 text-xs text-stone-500">
              {o.left}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-navy">
                {o.title}
              </span>
              <span className="block text-xs text-stone-500">{o.blurb}</span>
            </span>
            {o.button}
          </li>
        ))}
      </ul>
    </div>
  );
}
