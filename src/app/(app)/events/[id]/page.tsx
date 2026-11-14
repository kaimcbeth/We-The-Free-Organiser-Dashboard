import { ClashNote } from "./clash-note";
import { WhosComing } from "./whos-coming";
import { LivePlayers } from "@/components/live-players";
import { isMovieChallenge, showLivePlayers } from "@/lib/live-window";
import { MovieDaySummary } from "@/components/movie-day-summary";
import { EventRecap } from "@/components/event-recap";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrganiser } from "@/lib/organiser";
import {
  formatEventDate,
  formatTimeRange,
  nowIso,
  setRequestTz,
} from "@/lib/time";
import { CheckIn, type Person } from "./check-in";
import { EventNotes } from "./event-notes";
import { DeleteEvent } from "./delete-event";
import { EventActions } from "./event-actions";
import { GraphicMaker } from "@/components/graphic-maker";
import { MeetingPointMaker } from "@/components/meeting-point";
import { SignupListMaker } from "@/components/signup-list";
import { WeatherUpdateMaker } from "@/components/weather-update";
import { CopyMaker } from "@/components/copy-maker";
import { AddToCalendar } from "@/components/add-to-calendar";
import { EventPhotos } from "@/components/event-photos";
import { loadEventPhotos } from "@/lib/event-photos";
import { TypePicker } from "./type-picker";
import { SpecialPicker } from "./special-picker";
import { signPhotos } from "@/lib/photos";
import { LoadError } from "@/components/load-error";
import { loadInsightData } from "@/lib/insights-data";
import { outreachCounts } from "@/lib/insights";
import { FacebookEventButton } from "@/components/facebook-event";

type EventDetail = {
  id: string;
  team_id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  venue: string | null;
  address: string | null;
  source_url: string | null;
  facebook_url: string | null;
  description: string | null;
  event_type_id: string | null;
  special_event_id: string | null;
  notes: string | null;
  source: string;
  time_unknown: boolean;
  rain_chance: number | null;
  rain_mm: number | null;
  max_temp: number | null;
};

export default async function EventCheckInPage({
  params,
}: PageProps<"/events/[id]">) {
  const { id } = await params;
  const { supabase, organiser } = await requireOrganiser();

  const { data: event } = await supabase
    .from("events")
    .select(
      "id, team_id, title, starts_at, ends_at, venue, address, source_url, facebook_url, description, event_type_id, notes, special_event_id, source, time_unknown, rain_chance, rain_mm, max_temp",
    )
    .eq("id", id)
    .maybeSingle<EventDetail>();

  if (!event) notFound();
  const eventPhotos = await loadEventPhotos(supabase, event.id);
  const { count: openActions } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id)
    .is("done_at", null)
    .is("dismissed_at", null)
    .or(`show_from.is.null,show_from.lte.${nowIso()}`);
  const { count: overdueCount } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id)
    .is("done_at", null)
    .is("dismissed_at", null)
    .lt("due_at", nowIso());
  const { count: goingCount } = await supabase
    .from("event_rsvps")
    .select("person_id", { count: "exact", head: true })
    .eq("event_id", event.id)
    .eq("status", "going");
  // Opened from "All communities" or the calendar: show it as its own community.
  const team =
    organiser.teams.find((t) => t.id === event.team_id) ?? organiser.team;
  setRequestTz(team.timezone);

  // Special events this community can mark it as (worldwide, or its region).
  const { data: specialRows } = await supabase
    .from("special_events")
    .select("id, name, emoji, region_ids")
    .order("name");
  const specials = (
    (specialRows ?? []) as {
      id: string;
      name: string;
      emoji: string | null;
      region_ids: string[] | null;
    }[]
  ).filter((s) => !s.region_ids || s.region_ids.includes(team.region_id ?? ""));

  const [people, attendance, earlier, types, helper, likely] =
    await Promise.all([
      supabase
        .from("people")
        .select(
          "id, first_name, last_name, photo_updated_at, attended_before_app",
        )
        .eq("team_id", event.team_id)
        .order("first_name")
        .returns<
          (Person & {
            photo_updated_at: string | null;
            attended_before_app: boolean;
          })[]
        >(),
      supabase.from("attendance").select("person_id").eq("event_id", event.id),
      // Everyone who came to any earlier event: used to spot first-timers.
      supabase
        .from("attendance")
        .select("person_id, events!inner(starts_at, team_id)")
        .eq("events.team_id", event.team_id)
        .lt("events.starts_at", event.starts_at),
      supabase
        .from("event_types")
        .select("id, name, counts_as_outreach, category")
        .order("sort_order"),
      supabase
        .from("checkin_links")
        .select("token, expires_at")
        .eq("event_id", event.id)
        .is("revoked_at", null)
        .gt("expires_at", nowIso())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.rpc("event_likely_attendees", { p_event_id: id }),
    ]);

  if (people.error || attendance.error || earlier.error)
    return <LoadError what="this event's check-in list" />;
  const [photos, insightData] = await Promise.all([
    signPhotos(supabase, people.data ?? []),
    loadInsightData(supabase, event.team_id),
  ]);
  const isOutreach = !!types.data?.find((t) => t.id === event.event_type_id)
    ?.counts_as_outreach;
  const outreachBefore = insightData
    ? Object.fromEntries(
        outreachCounts(insightData.people, insightData.checkIns, event.id),
      )
    : {};

  // Which part of the event we're in decides what comes first (Kai, 13 Nov
  // 2026: tidy the event page). On the day: from midnight on its day (team
  // time) until 2 hours after it ends.
  // eslint-disable-next-line react-hooks/purity -- server component, rendered per request
  const now = Date.now();
  const start = Date.parse(event.starts_at);
  const end = event.ends_at ? Date.parse(event.ends_at) : start + 3 * 3600_000;
  const dayOf = (t: number) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: team.timezone }).format(t);
  const phase: Phase = event.time_unknown
    ? start < now
      ? "after"
      : "before"
    : now > end + 2 * 3600_000
      ? "after"
      : dayOf(now) === dayOf(start) || now >= start
        ? "day"
        : "before";
  const past = start < now;

  const graphicEvent = {
    title: event.title,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    venue: event.venue,
    address: event.address,
    typeName:
      (types.data ?? []).find((t) => t.id === event.event_type_id)?.name ??
      null,
    community: team.name.replace(/, (Australia|New Zealand)$/, ""),
    teamId: event.team_id,
    eventId: event.id,
  };
  const checkedIn = attendance.data?.length ?? 0;
  const going = goingCount ?? 0;

  // The making-things tools, as a grid of tiles.
  const tools = {
    graphic: (
      <Tile
        key="graphic"
        icon="image"
        hint={past ? "A thank-you post" : "Post, story or cover"}
      >
        <GraphicMaker
          tz={team.timezone}
          event={graphicEvent}
          label="Graphic"
          className={TILE_BUTTON}
        />
      </Tile>
    ),
    copy: (
      <Tile key="copy" icon="pen" hint="Captions and messages">
        <CopyMaker
          eventId={event.id}
          teamId={event.team_id}
          past={past}
          label="Write post"
          className={TILE_BUTTON}
        />
      </Tile>
    ),
    carousel: (
      <Tile key="carousel" icon="layers" hint="Photos from the day">
        <GraphicMaker
          carousel
          tz={team.timezone}
          event={graphicEvent}
          label="Carousel"
          className={TILE_BUTTON}
        />
      </Tile>
    ),
    signup: (
      <Tile key="signup" icon="list" hint="Who's in and roles">
        <SignupListMaker
          tz={team.timezone}
          event={graphicEvent}
          label="Sign-up list"
          className={TILE_BUTTON}
        />
      </Tile>
    ),
    meet: (
      <Tile key="meet" icon="pin" hint="Map of where to find you">
        <MeetingPointMaker
          tz={team.timezone}
          event={graphicEvent}
          label="Meeting point"
          className={TILE_BUTTON}
        />
      </Tile>
    ),
    weather: (
      <Tile key="weather" icon="cloud" hint={forecastHint(event)}>
        <WeatherUpdateMaker
          tz={team.timezone}
          forecast={{
            chance: event.rain_chance ?? null,
            mm: event.rain_mm == null ? null : Number(event.rain_mm),
            temp: event.max_temp == null ? null : Number(event.max_temp),
          }}
          event={graphicEvent}
          label="Weather update"
          className={TILE_BUTTON}
        />
      </Tile>
    ),
    facebook: !past && !event.facebook_url && (
      <Tile
        key="facebook"
        icon="facebook"
        hint="Words and cover, ready to paste"
      >
        <FacebookEventButton
          tz={team.timezone}
          className={TILE_BUTTON}
          event={{
            title: event.title,
            startsAt: event.starts_at,
            endsAt: event.ends_at,
            venue: event.venue,
            address: event.address,
            description: event.description,
            url: event.source_url,
          }}
        />
      </Tile>
    ),
    police: isOutreach && !past && (
      <Tile key="police" icon="shield" hint="Fills itself in">
        <Link href={`/approvals/${event.id}`} className={TILE_BUTTON}>
          Police approval
        </Link>
      </Tile>
    ),
  };
  const toolOrder: (keyof typeof tools)[] =
    phase === "after"
      ? ["carousel", "graphic", "copy"]
      : phase === "day"
        ? ["weather", "meet", "signup", "copy", "graphic", "police"]
        : [
            "graphic",
            "copy",
            "facebook",
            "signup",
            "meet",
            "weather",
            "police",
          ];
  const toolTiles = toolOrder.map((k) => tools[k]).filter(Boolean);

  const sections: Record<string, React.ReactNode> = {
    live: showLivePlayers(event.title, event.starts_at, event.ends_at) && (
      <div key="live">
        <LivePlayers teamId={event.team_id} withToday={team.timezone} />
        <Link
          href="/resources/movie-player"
          className="mt-2 inline-block text-xs font-medium text-stone-500 hover:text-stone-800 hover:underline"
        >
          Movie player: set-up and results →
        </Link>
      </div>
    ),
    movie: isMovieChallenge(event.title) && phase !== "before" && (
      // After a Movie Challenge: the day in numbers, with a post to share.
      <MovieDaySummary
        key="movie"
        teamId={event.team_id}
        tz={team.timezone}
        community={graphicEvent.community}
        day={dayOf(start)}
      />
    ),
    // After the event: who came, who was new (Kai, 4 Nov 2026).
    recap: past && !event.time_unknown && (
      <EventRecap
        key="recap"
        eventId={event.id}
        title={event.title}
        when={formatEventDate(event.starts_at)}
        hideFilms={isMovieChallenge(event.title)}
      />
    ),
    tools: toolTiles.length > 0 && (
      <section key="tools" aria-labelledby="tools-heading">
        <h2 id="tools-heading" className="mb-2 text-sm font-semibold text-navy">
          {phase === "after"
            ? "Share how it went"
            : phase === "day"
              ? "On the day"
              : "Promote and prepare"}
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{toolTiles}</div>
      </section>
    ),
    coming: (
      <div
        key="coming"
        id="whos-coming"
        className="scroll-mt-24 empty:hidden [&>section]:mt-0"
      >
        <WhosComing supabase={supabase} eventId={event.id} />
      </div>
    ),
    actions: (
      <div
        key="actions"
        id="actions"
        className="scroll-mt-24 empty:hidden [&>details]:mt-0"
      >
        <EventActions
          supabase={supabase}
          teamId={event.team_id}
          eventId={event.id}
          now={now}
        />
      </div>
    ),
    notes: (
      <div key="notes" className="empty:hidden [&>section]:mt-0">
        <EventNotes eventId={event.id} initial={event.notes ?? ""} />
      </div>
    ),
    checkin: (
      <div key="checkin" id="check-in" className="scroll-mt-24">
        <CheckIn
          eventId={event.id}
          teamId={event.team_id}
          teamSlug={team.slug ?? ""}
          whatsappUrl={team.whatsapp_url ?? null}
          tz={team.timezone}
          organiserId={organiser.id}
          initialPeople={people.data ?? []}
          initialCheckedIn={(attendance.data ?? []).map((a) => a.person_id)}
          returningIds={[
            ...new Set([
              ...(earlier.data ?? []).map((a) => a.person_id),
              ...(people.data ?? [])
                .filter((p) => p.attended_before_app)
                .map((p) => p.id),
            ]),
          ]}
          photos={photos}
          helperLink={helper.data ?? null}
          isOutreach={isOutreach}
          outreachBefore={outreachBefore}
          likely={(likely.data as Record<string, number> | null) ?? {}}
        />
      </div>
    ),
    photos: (
      <div
        key="photos"
        id="photos"
        className="scroll-mt-24 empty:hidden [&>section]:mt-0"
      >
        <EventPhotos
          key={eventPhotos.map((p) => p.id).join()}
          teamId={event.team_id}
          eventId={event.id}
          photos={eventPhotos}
        />
      </div>
    ),
  };
  // The tool tiles always come first (Kai, 14 Nov 2026).
  const order =
    phase === "after"
      ? ["tools", "recap", "movie", "photos", "checkin", "notes", "actions"]
      : phase === "day"
        ? [
            "tools",
            "live",
            "checkin",
            "coming",
            "actions",
            "notes",
            "movie",
            "photos",
          ]
        : ["tools", "coming", "actions", "notes", "checkin", "photos"];

  const actionsTone =
    (overdueCount ?? 0) > 0
      ? "bg-red-50 text-red-800 ring-red-200"
      : (openActions ?? 0) > 0
        ? "bg-pink/10 text-pink-ink ring-pink/30"
        : "bg-white text-stone-600 ring-black/5";

  return (
    <div>
      <Link href="/" className="text-sm text-stone-500 hover:text-stone-800">
        ← Events
      </Link>

      <header className="mt-2">
        <p className="text-sm text-stone-500">
          {formatEventDate(event.starts_at)}
          {/* Old events copied from Facebook have a date but no time. */}
          {event.time_unknown
            ? ""
            : ` · ${formatTimeRange(event.starts_at, event.ends_at)}`}
          {event.venue || event.address
            ? ` · ${event.venue ?? event.address}`
            : ""}
        </p>
        <h1 className="mt-0.5 text-2xl font-semibold leading-tight tracking-tight">
          {event.title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          <TypePicker
            eventId={event.id}
            value={event.event_type_id}
            types={types.data ?? []}
          />
          <SpecialPicker
            eventId={event.id}
            value={event.special_event_id}
            specials={specials}
          />
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:ml-auto">
            {event.source_url && (
              <a
                href={event.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-stone-500 hover:text-stone-800 hover:underline"
              >
                activism.wtf ↗
              </a>
            )}
            {event.facebook_url && (
              <a
                href={event.facebook_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-stone-500 hover:text-stone-800 hover:underline"
              >
                Facebook ↗
              </a>
            )}
            {!past && (
              <AddToCalendar
                event={{
                  id: event.id,
                  title: event.title,
                  starts_at: event.starts_at,
                  ends_at: event.ends_at,
                  venue: event.venue,
                  address: event.address,
                  description: event.description,
                  url: event.source_url,
                }}
              />
            )}
          </span>
        </div>
        <ClashNote supabase={supabase} event={event} />
      </header>

      {/* The numbers that matter, each a jump to its section. */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <a
          href="#whos-coming"
          className="rounded-xl bg-white px-3 py-2 ring-1 ring-black/5 hover:ring-navy/20"
        >
          <span className="block text-xs text-stone-500">Going</span>
          <span className="text-lg font-semibold text-navy">{going}</span>
        </a>
        <a
          href="#check-in"
          className="rounded-xl bg-white px-3 py-2 ring-1 ring-black/5 hover:ring-navy/20"
        >
          <span className="block text-xs text-stone-500">Checked in</span>
          <span className="text-lg font-semibold text-navy">{checkedIn}</span>
        </a>
        <a
          href="#actions"
          className={`rounded-xl px-3 py-2 ring-1 hover:brightness-95 ${actionsTone}`}
        >
          <span className="block text-xs opacity-80">Actions</span>
          <span className="text-lg font-semibold">
            {(overdueCount ?? 0) > 0
              ? `${overdueCount} overdue`
              : openActions
                ? `${openActions} to do`
                : "All done"}
          </span>
        </a>
      </div>

      <div className="mt-6 space-y-6">
        {order.map((k) => sections[k]).filter(Boolean)}
      </div>

      {event.source === "manual" && (
        <DeleteEvent
          eventId={event.id}
          checkedIn={checkedIn}
          photos={eventPhotos.length}
        />
      )}
    </div>
  );
}

type Phase = "before" | "day" | "after";

const TILE_BUTTON =
  "text-left text-sm font-semibold text-navy after:absolute after:inset-0 after:rounded-xl after:content-[''] focus:outline-none focus-visible:after:ring-2 focus-visible:after:ring-pink";

function forecastHint(e: EventDetail) {
  const bits = [
    e.rain_chance != null && e.rain_chance > 30 && Number(e.rain_mm ?? 0) >= 1
      ? `${e.rain_chance}% rain`
      : "",
    e.max_temp != null && Number(e.max_temp) > 30
      ? `${Math.round(Number(e.max_temp))}°C`
      : "",
  ].filter(Boolean);
  return bits.length
    ? `Forecast: ${bits.join(", ")}`
    : "Still on, moved or off";
}

const ICONS: Record<string, React.ReactNode> = {
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="m21 16-5-5-8 8" />
    </>
  ),
  pen: (
    <>
      <path d="M4 20h4L19 9l-4-4L4 16z" />
      <path d="m13.5 6.5 4 4" />
    </>
  ),
  layers: (
    <>
      <rect x="7" y="3" width="14" height="14" rx="2" />
      <path d="M3 7v12a2 2 0 0 0 2 2h12" />
    </>
  ),
  list: (
    <>
      <path d="M10 6h10M10 12h10M10 18h10" />
      <path d="M4 6h1M4 12h1M4 18h1" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  cloud: (
    <>
      <path d="M7 17a4 4 0 1 1 .8-7.9A5.5 5.5 0 0 1 18.5 11 3 3 0 0 1 18 17z" />
      <path d="M9 20l-1 2M13 20l-1 2M17 20l-1 2" />
    </>
  ),
  facebook: <path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z" />,
  shield: (
    <>
      <path d="M12 3 5 6v6c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9V6z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
};

// One tool: the whole tile opens it (the button's ::after covers the tile).
function Tile({
  icon,
  hint,
  children,
}: {
  icon: keyof typeof ICONS;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-col gap-1 rounded-xl bg-white p-3 ring-1 ring-black/5 transition hover:bg-pink/5 hover:ring-pink/50">
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="mb-0.5 h-5 w-5 fill-none stroke-pink-ink stroke-[1.8] [stroke-linecap:round] [stroke-linejoin:round]"
      >
        {ICONS[icon]}
      </svg>
      {children}
      <span className="text-xs leading-snug text-stone-500">{hint}</span>
    </div>
  );
}
