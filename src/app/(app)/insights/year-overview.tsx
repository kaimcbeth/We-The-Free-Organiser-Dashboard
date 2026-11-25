import Link from "next/link";
import type { YearInsights } from "@/lib/year-insights";

// The year so far (Kai, 25 Nov 2026). Outreach pink, community blue: the
// same pair as the growth chart, checked with the dataviz validator.
const OUTREACH = "#e8399f";
const COMMUNITY = "#3a5bd9";

export type YearFilms = {
  watched: number;
  impact: number | null;
  tapouts: number;
} | null;

function Tile({
  value,
  label,
  sub,
}: {
  value: string | number;
  label: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl bg-stone-50 px-3 py-2.5">
      <div className="text-2xl font-semibold tabular-nums tracking-tight">
        {value}
      </div>
      <div className="text-xs text-stone-600">{label}</div>
      {sub && <div className="mt-0.5 text-[11px] text-stone-400">{sub}</div>}
    </div>
  );
}

export function YearOverview({
  y,
  films,
  photos,
}: {
  y: YearInsights;
  films: YearFilms;
  photos: number;
}) {
  const peak = Math.max(...y.months.map((m) => m.outreach + m.community), 1);
  const started = y.checkInsFrom
    ? new Intl.DateTimeFormat("en-AU", {
        day: "numeric",
        month: "long",
      }).format(new Date(y.checkInsFrom))
    : null;
  const topKinds = y.kinds.slice(0, 5);
  const kindPeak = Math.max(...topKinds.map((k) => k.events), 1);
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">
          {y.year} so far
        </h2>
        {started && (
          <span className="text-xs text-stone-500">
            Check-ins from {started}
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile
          value={y.events}
          label="events held"
          sub={`${y.outreachEvents} outreach · ${y.events - y.outreachEvents} community`}
        />
        <Tile value={y.people} label="people checked in" />
        <Tile value={y.checkIns} label="check-ins" />
        <Tile value={y.firstTimers} label="first-timers" />
        {films && films.watched > 0 && (
          <>
            <Tile value={films.watched} label="films watched" />
            <Tile
              value={films.impact ?? "–"}
              label="average impact"
              sub="out of 10"
            />
            <Tile value={films.tapouts} label="tapouts" />
          </>
        )}
        <Tile value={photos} label="photos added" />
      </div>

      <div className="mt-6">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold">Events each month</h3>
          <div className="flex items-center gap-3 text-xs text-stone-600">
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="h-2.5 w-2.5 rounded-sm"
                style={{ background: OUTREACH }}
              />
              Outreach
            </span>
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="h-2.5 w-2.5 rounded-sm"
                style={{ background: COMMUNITY }}
              />
              Community
            </span>
          </div>
        </div>
        <div className="mt-3 flex h-36 items-end gap-1.5">
          {y.months.map((m) => {
            const n = m.outreach + m.community;
            return (
              <Link
                key={m.key}
                href={`/insights/month/${m.key}`}
                title={`${m.label}: ${m.outreach} outreach, ${m.community} community${m.checkIns ? `, ${m.checkIns} check-ins` : ""}`}
                className={`group flex h-full min-w-0 flex-1 flex-col items-center justify-end ${m.future ? "pointer-events-none opacity-40" : ""}`}
              >
                <span className="mb-1 text-[11px] tabular-nums text-stone-500">
                  {n || ""}
                </span>
                <span
                  className="flex w-full max-w-9 flex-col overflow-hidden rounded-t-md group-hover:opacity-80"
                  style={{ height: `${(n / peak) * 100}%` }}
                >
                  <span style={{ flex: m.community, background: COMMUNITY }} />
                  <span style={{ flex: m.outreach, background: OUTREACH }} />
                </span>
                <span className="mt-1 h-px w-full bg-stone-200" />
                <span className="mt-1 text-[11px] text-stone-500">
                  {m.label.slice(0, 3)}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold">Kinds of events</h3>
          {topKinds.length === 0 ? (
            <p className="mt-2 text-sm text-stone-500">No events yet.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {topKinds.map((k) => (
                <li key={k.kind}>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-800">{k.kind}</span>
                    <b className="font-semibold tabular-nums">{k.events}</b>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-stone-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(k.events / kindPeak) * 100}%`,
                        background: COMMUNITY,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold">Highlights</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-stone-700">
            {y.busiest && (
              <li>
                Busiest month:{" "}
                <b className="font-semibold">
                  {new Intl.DateTimeFormat("en-AU", {
                    month: "long",
                    timeZone: "UTC",
                  }).format(new Date(`${y.busiest.key}-15T00:00:00Z`))}
                </b>{" "}
                ({y.busiest.outreach + y.busiest.community} events)
              </li>
            )}
            {y.biggest && (
              <li>
                Biggest event:{" "}
                <Link
                  href={`/events/${y.biggest.id}`}
                  className="font-semibold hover:underline"
                >
                  {y.biggest.title}
                </Link>{" "}
                ({y.biggest.date}, {y.biggest.people} people)
              </li>
            )}
            {y.events > 0 && (
              <li>
                About{" "}
                <b className="font-semibold">
                  {(
                    y.events /
                    Math.max(1, y.months.filter((m) => !m.future).length)
                  ).toFixed(1)}
                </b>{" "}
                events a month
              </li>
            )}
            {y.people > 0 && (
              <li>
                <b className="font-semibold">
                  {Math.round((y.firstTimers / y.people) * 100)}%
                </b>{" "}
                of people at events this year were new
              </li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
