import type { SupabaseClient } from "@supabase/supabase-js";

// Clash check (Kai, 12 Nov 2026, idea 25): on an upcoming event's page, a
// quiet amber note when something else is on the same day: another of this
// community's events, or a nearby community's (within 50 km).
const NEAR_KM = 50;
const HOUR = 3600_000;

type Other = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  where: string | null; // other community's city, else null
  km: number | null;
};

export async function ClashNote({
  supabase,
  event,
}: {
  supabase: SupabaseClient;
  event: {
    id: string;
    team_id: string;
    starts_at: string;
    ends_at: string | null;
    time_unknown?: boolean | null;
  };
}) {
  const start = new Date(event.starts_at).getTime();
  // eslint-disable-next-line react-hooks/purity
  if (event.time_unknown || start < Date.now()) return null;
  const { data: team } = await supabase
    .from("teams")
    .select("timezone")
    .eq("id", event.team_id)
    .maybeSingle<{ timezone: string | null }>();
  const tz = team?.timezone ?? "Australia/Sydney";
  const from = new Date(start - 16 * HOUR).toISOString();
  const to = new Date(start + 16 * HOUR).toISOString();

  const [own, near] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, starts_at, ends_at")
      .eq("team_id", event.team_id)
      .neq("id", event.id)
      .eq("time_unknown", false)
      .gte("starts_at", from)
      .lte("starts_at", to),
    supabase.rpc("nearby_events", {
      p_team_id: event.team_id,
      p_km: NEAR_KM,
      p_from: from,
      p_to: to,
    }),
  ]);

  const day = (iso: string) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(iso));
  const time = (iso: string) =>
    new Intl.DateTimeFormat("en-AU", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  const thisDay = day(event.starts_at);
  const end = (s: string, e: string | null) =>
    e ? new Date(e).getTime() : new Date(s).getTime() + 3 * HOUR;
  const myEnd = end(event.starts_at, event.ends_at);

  const others: Other[] = [
    ...(own.data ?? []).map((e) => ({ ...e, where: null, km: null })),
    ...(
      (near.data ?? []) as {
        id: string;
        title: string;
        starts_at: string;
        ends_at: string | null;
        team_name: string;
        km: number;
      }[]
    ).map((e) => ({
      id: e.id,
      title: e.title,
      starts_at: e.starts_at,
      ends_at: e.ends_at,
      where: e.team_name,
      km: e.km,
    })),
  ]
    .filter((e) => day(e.starts_at) === thisDay)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  if (!others.length) return null;

  return (
    <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
      <p className="font-semibold">Also on that day</p>
      <ul className="mt-1 space-y-0.5">
        {others.map((o) => {
          const overlaps =
            new Date(o.starts_at).getTime() < myEnd &&
            end(o.starts_at, o.ends_at) > start;
          return (
            <li key={o.id}>
              {time(o.starts_at)} · {o.title}
              {o.where
                ? ` · ${o.where} (${o.km} km away)`
                : " · your community"}
              {overlaps && (
                <span className="ml-1 font-semibold">· same time</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
