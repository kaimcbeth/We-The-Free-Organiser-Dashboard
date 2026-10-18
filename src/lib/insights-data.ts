import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  InsightCheckIn,
  InsightEvent,
  InsightPerson,
} from "@/lib/insights";

type AttendanceRow = {
  person_id: string;
  event: {
    id: string;
    starts_at: string;
    team_id: string;
    event_type: { counts_as_outreach: boolean } | null;
  } | null;
};

// Loads everything the insights need for one team.
export async function loadInsightData(
  supabase: SupabaseClient,
  teamId: string,
) {
  const [people, attendance, events] = await Promise.all([
    supabase
      .from("people")
      .select(
        "id, first_name, last_name, starting_outreach_count, attended_before_app",
      )
      .eq("team_id", teamId)
      .returns<InsightPerson[]>(),
    supabase
      .from("attendance")
      .select(
        "person_id, event:events!inner(id, starts_at, team_id, event_type:event_types(counts_as_outreach))",
      )
      .eq("event.team_id", teamId)
      .returns<AttendanceRow[]>(),
    supabase
      .from("events")
      .select("id, starts_at, event_type:event_types(counts_as_outreach)")
      .eq("team_id", teamId)
      .returns<
        {
          id: string;
          starts_at: string;
          event_type: { counts_as_outreach: boolean } | null;
        }[]
      >(),
  ]);

  if (people.error || attendance.error || events.error) return null;

  const checkIns: InsightCheckIn[] = (attendance.data ?? [])
    .filter((a) => a.event)
    .map((a) => ({
      person_id: a.person_id,
      event_id: a.event!.id,
      starts_at: a.event!.starts_at,
      outreach: !!a.event!.event_type?.counts_as_outreach,
    }));
  const evts: InsightEvent[] = (events.data ?? []).map((e) => ({
    id: e.id,
    starts_at: e.starts_at,
    outreach: !!e.event_type?.counts_as_outreach,
  }));

  return { people: people.data ?? [], checkIns, events: evts };
}
