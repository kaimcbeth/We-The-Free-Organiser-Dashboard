import type { SupabaseClient } from "@supabase/supabase-js";
import type { Team } from "@/lib/organiser";
import { formatEventDate } from "@/lib/time";
import { waLink } from "@/lib/whatsapp-link";

export type ConnectOrganiser = {
  personId: string;
  teamId: string;
  name: string;
  firstName: string;
  whatsapp: string | null; // wa.me link
  facebookUrl: string | null;
  email: string | null;
};
export type ConnectIdea = {
  title: string;
  at: string;
  label: string; // "Movie Challenge, Sat 18 Oct · 14 came"
  note: string | null; // "First Workshop in a while"
  eventId: string;
};
export type ConnectContext = {
  organisers: ConnectOrganiser[];
  recent: ConnectIdea[];
  upcoming: ConnectIdea[];
  quiet: boolean; // nothing in the last month and nothing coming up
};

type Ev = {
  id: string;
  team_id: string;
  title: string;
  starts_at: string;
  event_type_id: string | null;
  event_type: { name: string; counts_as_outreach: boolean } | null;
  attendance: { count: number }[];
};

const RARE_DAYS = 60;

// What a Regional Support Lead could ask each community's organisers about:
// events in the last 10 days, events in the next 3 weeks, and anything they
// haven't run in a while.
export async function loadConnectContext(
  supabase: SupabaseClient,
  teams: Team[],
): Promise<Record<string, ConnectContext>> {
  const ids = teams.map((t) => t.id);
  const now = Date.now();
  const from = new Date(now - (RARE_DAYS + 30) * 864e5).toISOString();
  const to = new Date(now + 21 * 864e5).toISOString();

  const [{ data: events }, { data: orgs }] = await Promise.all([
    supabase
      .from("events")
      .select(
        "id, team_id, title, starts_at, event_type_id, event_type:event_types(name, counts_as_outreach), attendance(count)",
      )
      .in("team_id", ids)
      .gte("starts_at", from)
      .lte("starts_at", to)
      .order("starts_at")
      .returns<Ev[]>(),
    supabase.rpc("community_organisers", { p_team_ids: ids }),
  ]);

  const out: Record<string, ConnectContext> = {};
  for (const team of teams) {
    const tz = team.timezone;
    const evs = (events ?? []).filter((e) => e.team_id === team.id);
    // Not run this type in the RARE_DAYS before it (or never in the window).
    const rare = (e: Ev) =>
      !!e.event_type_id &&
      !evs.some(
        (o) =>
          o.id !== e.id &&
          o.event_type_id === e.event_type_id &&
          o.starts_at < e.starts_at &&
          Date.parse(e.starts_at) - Date.parse(o.starts_at) < RARE_DAYS * 864e5,
      );
    const idea = (e: Ev, past: boolean): ConnectIdea => {
      const n = e.attendance[0]?.count ?? 0;
      return {
        title: e.title,
        at: e.starts_at,
        eventId: e.id,
        label: `${e.title}, ${formatEventDate(e.starts_at, tz)}${past ? (n ? ` · ${n} came` : " · no attendance taken") : ""}`,
        note: rare(e)
          ? `First ${e.event_type?.name ?? "one"} in a while`
          : e.event_type?.counts_as_outreach
            ? "Outreach"
            : null,
      };
    };
    const recentEvs = evs.filter(
      (e) =>
        Date.parse(e.starts_at) <= now &&
        Date.parse(e.starts_at) > now - 10 * 864e5,
    );
    const upcomingEvs = evs.filter((e) => Date.parse(e.starts_at) > now);
    const lastMonth = evs.filter(
      (e) =>
        Date.parse(e.starts_at) <= now &&
        Date.parse(e.starts_at) > now - 30 * 864e5,
    );

    const organisers: ConnectOrganiser[] = (
      (orgs ?? []) as {
        team_id: string;
        person_id: string;
        name: string;
        first_name: string;
        phone: string | null;
        email: string | null;
        facebook_url: string | null;
      }[]
    )
      .filter((o) => o.team_id === team.id)
      .map((o) => ({
        personId: o.person_id,
        teamId: o.team_id,
        name: o.name,
        firstName: o.first_name,
        whatsapp: waLink(o.phone, tz),
        facebookUrl: o.facebook_url,
        email: o.email,
      }));

    out[team.id] = {
      organisers,
      recent: recentEvs.map((e) => idea(e, true)).reverse(),
      upcoming: upcomingEvs.slice(0, 4).map((e) => idea(e, false)),
      quiet: lastMonth.length === 0 && upcomingEvs.length === 0,
    };
  }
  return out;
}
