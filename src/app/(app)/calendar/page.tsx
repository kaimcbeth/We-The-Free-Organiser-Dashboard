import { redirect } from "next/navigation";
import { requireOrganiser } from "@/lib/organiser";
import { LoadError } from "@/components/load-error";
import { todayInTz, zonedToUtcIso } from "@/lib/time";
import { CalendarView, type CalEvent, type CalTeam } from "./calendar-view";

// A team colour for each team, in a fixed order so colours stay put.
const COLOURS = [
  "#ff47b9",
  "#2fd9df",
  "#ffd90f",
  "#8b5cf6",
  "#22c55e",
  "#f97316",
  "#0ea5e9",
  "#e11d48",
  "#14b8a6",
  "#a16207",
  "#6366f1",
  "#84cc16",
];

function shiftMonth(key: string, n: number) {
  const d = new Date(`${key}-15T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
}

export default async function CalendarPage({
  searchParams,
}: PageProps<"/calendar">) {
  const { supabase, organiser } = await requireOrganiser();
  const isOrganiser = organiser.role === "organiser";
  if (
    !isOrganiser &&
    organiser.role !== "god" &&
    organiser.role !== "regional_lead"
  )
    redirect("/");

  const sp = await searchParams;
  const month =
    typeof sp.m === "string" && /^\d{4}-\d{2}$/.test(sp.m)
      ? sp.m
      : todayInTz().slice(0, 7);
  const regionParam = typeof sp.region === "string" ? sp.region : "";
  // Organisers: how far out to show other teams' events (the distance slider).
  const nearRaw =
    typeof sp.near === "string"
      ? sp.near
      : sp.others === "1"
        ? "region"
        : "team";
  const nearKm = Number(nearRaw);
  const near: { mode: "team" | "region" | "all" | "km"; km: number | null } =
    nearRaw === "region" || nearRaw === "all"
      ? { mode: nearRaw, km: null }
      : Number.isFinite(nearKm) && nearKm > 0
        ? { mode: "km", km: nearKm }
        : { mode: "team", km: null };

  const { data: regions } = await supabase
    .from("regions")
    .select("id, name")
    .order("sort_order");
  // God Mode can pick a region; a Regional Support Lead sees theirs.
  // Organisers: their own team (other teams in the region are added below).
  const regionId =
    organiser.role === "regional_lead" || isOrganiser
      ? organiser.access === "regional_lead"
        ? organiser.region_id
        : organiser.team.region_id
      : regionParam || null;
  const teamsInView = isOrganiser
    ? [organiser.team]
    : organiser.teams.filter((t) => !regionId || t.region_id === regionId);

  const teams: CalTeam[] = teamsInView.map((t, i) => ({
    id: t.id,
    name: t.name.replace(/, (Australia|New Zealand)$/, ""),
    colour: COLOURS[i % COLOURS.length],
    tz: t.timezone,
  }));

  // A little either side of the month, so the grid's edge days are filled too.
  const from = zonedToUtcIso(
    `${shiftMonth(month, 0)}-01`,
    "00:00",
    "Pacific/Kiritimati",
  );
  const to = zonedToUtcIso(
    `${shiftMonth(month, 1)}-01`,
    "00:00",
    "Pacific/Pago_Pago",
  );
  const startPad = new Date(Date.parse(from) - 7 * 864e5).toISOString();
  const endPad = new Date(Date.parse(to) + 7 * 864e5).toISOString();

  const { data, error } = teams.length
    ? await supabase
        .from("events")
        .select(
          "id, team_id, title, starts_at, ends_at, venue, address, event_type:event_types(name), attendance(count)",
        )
        .in(
          "team_id",
          teams.map((t) => t.id),
        )
        .gte("starts_at", startPad)
        .lt("starts_at", endPad)
        .order("starts_at")
    : { data: [], error: null };
  if (error) return <LoadError what="the calendar" />;

  const events: CalEvent[] = (data ?? []).map((e) => ({
    id: e.id,
    teamId: e.team_id,
    title: e.title,
    startsAt: e.starts_at,
    endsAt: e.ends_at,
    venue: e.venue ?? e.address,
    type: (e.event_type as unknown as { name: string } | null)?.name ?? null,
    here: (e.attendance as unknown as { count: number }[])[0]?.count ?? 0,
  }));

  // Organisers: other teams' events (read-only, linking out to activism.wtf),
  // as far out as the distance slider says.
  let nearby: {
    id: string;
    name: string;
    km: number | null;
    in_region: boolean;
    lat: number | null;
    lng: number | null;
  }[] = [];
  if (isOrganiser) {
    const { data: rpc } = await supabase.rpc("nearby_calendar", {
      p_team_id: organiser.team_id,
      p_from: startPad,
      p_to: endPad,
      p_mode: near.mode === "team" ? "km" : near.mode,
      p_km: near.mode === "team" ? 0 : near.km,
    });
    const r = rpc as {
      teams: {
        id: string;
        name: string;
        timezone: string;
        in_region: boolean;
        km: number | null;
        lat: number | null;
        lng: number | null;
      }[];
      events: {
        id: string;
        team_id: string;
        title: string;
        starts_at: string;
        ends_at: string | null;
        venue: string | null;
        type: string | null;
        url: string | null;
      }[];
    } | null;
    nearby = (r?.teams ?? []).map((t) => ({
      id: t.id,
      name: t.name.replace(/, (Australia|New Zealand)$/, ""),
      km: t.km,
      in_region: t.in_region,
      lat: t.lat,
      lng: t.lng,
    }));
    const shown = new Set((r?.events ?? []).map((e) => e.team_id));
    for (const t of r?.teams ?? []) {
      if (t.id === organiser.team_id || !shown.has(t.id)) continue;
      teams.push({
        id: t.id,
        name: t.name.replace(/, (Australia|New Zealand)$/, ""),
        colour: COLOURS[teams.length % COLOURS.length],
        tz: t.timezone,
      });
    }
    for (const e of r?.events ?? []) {
      if (e.team_id === organiser.team_id) continue;
      events.push({
        id: e.id,
        teamId: e.team_id,
        title: e.title,
        startsAt: e.starts_at,
        endsAt: e.ends_at,
        venue: e.venue,
        type: e.type,
        here: 0,
        externalUrl: e.url ?? "",
      });
    }
  }

  const regionName =
    regions?.find((r) => r.id === regionId)?.name ?? "All regions";

  return (
    <CalendarView
      month={month}
      prev={shiftMonth(month, -1)}
      next={shiftMonth(month, 1)}
      teams={teams}
      events={events}
      regions={organiser.role === "god" ? (regions ?? []) : []}
      regionId={regionId ?? ""}
      regionName={regionName}
      today={todayInTz("Australia/Sydney")}
      nearby={
        isOrganiser
          ? {
              teams: nearby,
              mode: near.mode,
              km: near.km,
              regionName:
                regions?.find((r) => r.id === organiser.team.region_id)?.name ??
                "Your region",
            }
          : null
      }
    />
  );
}
