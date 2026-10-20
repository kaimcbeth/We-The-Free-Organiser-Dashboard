import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrganiser } from "@/lib/organiser";
import { loadInsightData } from "@/lib/insights-data";
import { isMonthKey, monthDetail } from "@/lib/insights";
import { LoadError } from "@/components/load-error";
import {
  formatEventDate,
  formatTime,
  nowIso,
  todayInTz,
  zonedToUtcIso,
} from "@/lib/time";

type EventRow = {
  id: string;
  title: string;
  starts_at: string;
  venue: string | null;
  event_type: { name: string } | null;
};

// Shift a "2026-10" key by n months.
function shiftMonth(key: string, n: number) {
  const d = new Date(`${key}-15T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
}

export default async function MonthPage({
  params,
}: PageProps<"/insights/month/[month]">) {
  const { month } = await params;
  if (!isMonthKey(month)) notFound();
  const { supabase, organiser } = await requireOrganiser();

  const start = zonedToUtcIso(`${month}-01`, "00:00");
  const end = zonedToUtcIso(`${shiftMonth(month, 1)}-01`, "00:00");
  const [data, { data: events, error }] = await Promise.all([
    loadInsightData(supabase, organiser.team_id),
    supabase
      .from("events")
      .select("id, title, starts_at, venue, event_type:event_types(name)")
      .eq("team_id", organiser.team_id)
      .gte("starts_at", start)
      .lt("starts_at", end)
      .lte("starts_at", nowIso())
      .order("starts_at")
      .returns<EventRow[]>(),
  ]);
  if (!data || error) return <LoadError what="this month" />;

  const d = monthDetail(data.people, data.checkIns, month);
  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  const thisMonth = todayInTz().slice(0, 7);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/insights"
          className="text-sm text-stone-500 hover:text-stone-800"
        >
          ← Insights
        </Link>
        <div className="mt-2 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{d.label}</h1>
          <div className="flex gap-1 text-sm">
            <Link
              href={`/insights/month/${prev}`}
              className="rounded-lg px-3 py-1.5 text-stone-600 hover:bg-black/5"
            >
              ← Prev
            </Link>
            {next <= thisMonth && (
              <Link
                href={`/insights/month/${next}`}
                className="rounded-lg px-3 py-1.5 text-stone-600 hover:bg-black/5"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Jump href="#events" value={events?.length ?? 0} label="events" />
          <Jump href="#events" value={d.checkIns} label="check-ins" />
          <Jump href="#people" value={d.attendees.length} label="people" />
          <Jump
            href="#first-timers"
            value={d.firstTimers.length}
            label="first-timers"
            accent
          />
        </div>
      </div>

      <section id="events" className="scroll-mt-28">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
          Events and check-ins
        </h2>
        {!events?.length ? (
          <p className="text-sm text-stone-500">No events this month.</p>
        ) : (
          <ul className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
            {events.map((e) => (
              <li key={e.id} className="border-b border-black/5 last:border-0">
                <Link
                  href={`/events/${e.id}`}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-stone-50"
                >
                  <div className="w-16 shrink-0 text-sm font-medium text-stone-500">
                    {formatEventDate(e.starts_at)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{e.title}</p>
                    <p className="truncate text-sm text-stone-500">
                      {[e.event_type?.name, formatTime(e.starts_at), e.venue]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums">
                      {d.perEvent.get(e.id) ?? 0}
                    </p>
                    <p className="text-xs text-stone-500">checked in</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="people" className="scroll-mt-28">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
          Who came{" "}
          <span className="text-stone-400">· {d.attendees.length}</span>
        </h2>
        {d.attendees.length === 0 ? (
          <p className="text-sm text-stone-500">No check-ins this month.</p>
        ) : (
          <ul className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
            {d.attendees.map((p) => (
              <li key={p.id} className="border-b border-black/5 last:border-0">
                <Link
                  href={`/people/${p.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50"
                >
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {p.name}
                  </span>
                  {p.isNew && (
                    <span className="shrink-0 rounded-full bg-yellow px-2 py-0.5 text-xs font-semibold text-navy">
                      New
                    </span>
                  )}
                  <span className="w-16 shrink-0 text-right text-sm text-stone-500">
                    <span className="font-semibold text-stone-800 tabular-nums">
                      {p.count}
                    </span>{" "}
                    {p.count === 1 ? "event" : "events"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="first-timers" className="scroll-mt-28">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
          First-timers{" "}
          <span className="text-stone-400">· {d.firstTimers.length}</span>
        </h2>
        {d.firstTimers.length === 0 ? (
          <p className="text-sm text-stone-500">No first-timers this month.</p>
        ) : (
          <ul className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
            {d.firstTimers.map((p) => {
              const ev = events?.find((e) => e.id === p.eventId);
              return (
                <li
                  key={p.id}
                  className="border-b border-black/5 last:border-0"
                >
                  <Link
                    href={`/people/${p.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{p.name}</p>
                      <p className="truncate text-sm text-stone-500">
                        First came to {ev?.title ?? "an event"},{" "}
                        {formatEventDate(p.at)}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-2 text-xs text-stone-500">
          Someone who&apos;s been before? Open their profile and switch on “Came
          to events before the app”.
        </p>
      </section>
    </div>
  );
}

function Jump({
  href,
  value,
  label,
  accent,
}: {
  href: string;
  value: number;
  label: string;
  accent?: boolean;
}) {
  return (
    <a
      href={href}
      className={`rounded-2xl p-4 transition-transform hover:-translate-y-0.5 ${
        accent ? "bg-navy text-white" : "bg-white shadow-sm ring-1 ring-black/5"
      }`}
    >
      <p
        className={`text-3xl font-semibold tabular-nums ${accent ? "text-pink" : ""}`}
      >
        {value}
      </p>
      <p className={`text-sm ${accent ? "text-white/75" : "text-stone-500"}`}>
        {label}
      </p>
    </a>
  );
}
