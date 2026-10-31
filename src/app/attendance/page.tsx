import Link from "next/link";
import { LivePlayers } from "@/components/live-players";
import { currentTz } from "@/lib/time";
import { Countdown } from "@/components/countdown";
import { requireCore } from "@/lib/organiser";
import { LoadError } from "@/components/load-error";
import {
  dateInTz,
  daysUntilLabel,
  formatEventDate,
  formatTimeRange,
  todayInTz,
} from "@/lib/time";

type CoreEvent = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  venue: string | null;
  here: number;
};

export default async function AttendanceHome() {
  const { supabase, organiser } = await requireCore();
  const [{ data, error }, { data: setup }] = await Promise.all([
    supabase.rpc("core_events", { p_team_id: organiser.team_id }),
    supabase.rpc("my_core_setup"),
  ]);
  // New Core Team member who hasn't picked their tasks yet.
  const core = setup as {
    person_id: string;
    roles: string[];
    tasks: { owner_id: string | null }[];
  } | null;
  const needsSetup =
    organiser.coreSetupPreview ||
    (!!core &&
      core.roles.length > 0 &&
      !core.tasks.some((t) => t.owner_id === core.person_id));
  if (error || !data) return <LoadError what="events" />;

  const events = data as CoreEvent[];
  const today = todayInTz();
  const todays = events.filter((e) => dateInTz(e.starts_at) === today);
  const upcoming = events.filter((e) => dateInTz(e.starts_at) > today);
  const recent = events.filter((e) => dateInTz(e.starts_at) < today).reverse();

  return (
    <div className="space-y-8">
      <LivePlayers withToday={currentTz()} />
      {needsSetup && (
        <Link
          href="/attendance/tasks"
          className="block rounded-2xl bg-yellow p-4 text-navy shadow-sm hover:brightness-95"
        >
          <p className="font-semibold">Welcome to the Core Team!</p>
          <p className="text-sm">
            Pick the actions you&apos;d like to look after →
          </p>
        </Link>
      )}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Take attendance
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Tap today&apos;s event, then tap names as people arrive.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
          Today
        </h2>
        {todays.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-500">
            No events today.
          </p>
        ) : (
          <div className="space-y-3">
            {todays.map((e) => (
              <Link
                key={e.id}
                href={`/attendance/${e.id}`}
                className="block rounded-2xl bg-navy p-5 text-white shadow-sm hover:bg-navy-2"
              >
                <p className="text-sm text-cyan">
                  {formatTimeRange(e.starts_at, e.ends_at)}
                  {e.venue ? ` · ${e.venue}` : ""}
                </p>
                <p className="mt-1 text-lg font-semibold leading-snug">
                  {e.title}
                </p>
                <Countdown
                  start={e.starts_at}
                  end={e.ends_at}
                  tz={currentTz()}
                  dark
                  className="mt-2"
                />
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-white/80">{e.here} here</span>
                  <span className="rounded-lg bg-pink px-3 py-1.5 text-sm font-semibold text-navy">
                    Take attendance →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <List title="Coming up" events={upcoming} showCountdown />
      <List title="Recent" events={recent} />
    </div>
  );
}

function List({
  title,
  events,
  showCountdown,
}: {
  title: string;
  events: CoreEvent[];
  showCountdown?: boolean;
}) {
  if (events.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
        {title}
      </h2>
      <ul className="divide-y divide-black/5 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        {events.map((e) => (
          <li key={e.id}>
            <Link
              href={`/attendance/${e.id}`}
              className="flex items-center gap-4 px-4 py-3.5 hover:bg-stone-50"
            >
              <div className="w-16 shrink-0 text-sm font-medium text-stone-500">
                {formatEventDate(e.starts_at)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{e.title}</p>
                <p className="truncate text-sm text-stone-500">
                  {e.venue ?? ""}
                </p>
              </div>
              <div className="shrink-0 text-right text-sm text-stone-500">
                {showCountdown ? daysUntilLabel(e.starts_at) : `${e.here} here`}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
