import type { SupabaseClient } from "@supabase/supabase-js";
import type { TaskRow } from "@/components/task-card";
import { signPhotos } from "@/lib/photos";
import { loadInviteList, loadQuietList, loadRegularsList } from "@/lib/invites";
import type { GraphicSize } from "@/components/graphic-maker";

type Raw = {
  id: string;
  team_id: string | null; // null: a region-wide action (region_id)
  region_id?: string | null;
  note?: string | null;
  hangout?: {
    id: string;
    title: string;
    starts_at: string;
    source_url: string;
  } | null;
  due_at: string;
  show_from: string | null;
  done_at: string | null;
  assigned_to: string | null;
  checked?: string[] | null;
  skipped?: string[] | null;
  kind: {
    kind: string;
    sort_order: number;
    title: string;
    description: string | null;
    estimate_minutes: number;
    estimate_max_minutes: number | null;
    audience: string;
    schedule: string;
    checklist?: { key: string; label: string }[] | null;
  } | null;
  event: {
    id: string;
    title: string;
    starts_at: string;
    ends_at: string | null;
    venue: string | null;
    address: string | null;
    description: string | null;
    source_url: string | null;
    facebook_url: string | null;
    rain_chance?: number | null;
    rain_mm?: number | null;
    max_temp?: number | null;
    event_type_id: string | null;
    event_type: { name: string } | null;
    team: { name: string } | null;
  } | null;
  assignee: { first_name: string; last_name: string | null } | null;
  person: { id: string; first_name: string; last_name: string | null } | null;
  pod_post?: {
    url: string;
    note: string | null;
    shared_by_name: string | null;
    team: { pod_whatsapp_url: string | null } | null;
  } | null;
};

const SELECT =
  "id, team_id, due_at, show_from, done_at, assigned_to, checked, skipped, note, kind:task_kinds(kind, sort_order, title, description, estimate_minutes, estimate_max_minutes, audience, schedule, checklist), event:events(id, title, starts_at, ends_at, venue, address, description, source_url, facebook_url, rain_chance, rain_mm, max_temp, event_type_id, event_type:event_types(name), team:teams(name)), assignee:people!tasks_assigned_to_fkey(first_name, last_name), person:people!tasks_person_id_fkey(id, first_name, last_name), pod_post:pod_posts(url, note, shared_by_name, team:teams(pod_whatsapp_url))";

// Promo actions that get a "Get graphic" button, and the size they need.
const GRAPHIC_SIZE: Record<string, GraphicSize | undefined> = {
  promote_instagram: "post",
  facebook_event: "cover",
  fb_event_setup: "cover",
  promote_event: "post",
  photos_shared: "post",
  promote_facebook_groups: "post",
  promote_whatsapp: "story",
  promote_special: "post",
  special_save_date: "post",
  special_announce: "post",
  special_expect: "story",
  special_afterparty: "story",
  special_countdown: "story",
  special_thanks: "post",
  post_photos: "story",
  post_photos_facebook: "post",
  post_photos_instagram: "post",
};

function toRow(t: Raw): TaskRow {
  return {
    id: t.id,
    teamId: t.team_id ?? "",
    regional: t.kind?.audience === "regional",
    regionId: t.region_id ?? null,
    hangoutUrl: t.hangout?.source_url ?? null,
    hangoutId: t.hangout?.id ?? null,
    kind: t.kind?.kind ?? "",
    sortOrder: t.kind?.sort_order ?? 0,
    eventId: t.event?.id ?? null,
    eventTypeId: t.event?.event_type_id ?? null,
    eventTypeName: t.event?.event_type?.name ?? null,
    title: t.kind?.title ?? "Action",
    // Weather backup plans lead with the latest forecast (rain-check, 0158;
    // heat since 0198).
    description:
      t.kind?.kind === "rain_backup" && t.event?.rain_chance != null
        ? `Latest forecast: ${weatherLine(t.event)}. ${t.kind.description ?? ""}`.trim()
        : t.note // this one action's own line (e.g. a regional milestone, 0214)
          ? `${t.note} ${t.kind?.description ?? ""}`.trim()
          : (t.kind?.description ?? null),
    // Ranges ("5–10 min") count as their middle for totals.
    estimateMinutes: Math.ceil(
      ((t.kind?.estimate_minutes ?? 5) +
        (t.kind?.estimate_max_minutes ?? t.kind?.estimate_minutes ?? 5)) /
        2,
    ),
    estimateLabel: t.kind?.estimate_max_minutes
      ? `${t.kind.estimate_minutes}–${t.kind.estimate_max_minutes}`
      : String(t.kind?.estimate_minutes ?? 5),
    dueAt: t.due_at,
    showFrom: t.show_from,
    doneAt: t.done_at,
    checklist: t.kind?.checklist ?? null,
    checked: t.checked ?? [],
    skipped: t.skipped ?? [],
    eventTitle: t.event?.title ?? t.hangout?.title ?? null,
    repeats:
      (
        {
          weekly: "Every week",
          fortnightly: "Every 2 weeks",
          monthly: "Every month",
          month_end: "End of each month",
          quarterly: "Every 3 months",
          season: "Every season",
          newcomer: "Each newcomer",
          birthday: "On their birthday",
          reconnect: "When a regular goes quiet",
          region_weekly: "Every week",
          region_fortnightly: "Every 2 weeks",
          region_monthly: "Every month",
          region_quarterly: "Every 3 months",
        } as Record<string, string>
      )[t.kind?.schedule ?? ""] ?? null,
    eventFacebookUrl: t.event?.facebook_url ?? null,
    personId: t.person?.id ?? null,
    personName: t.person
      ? [t.person.first_name, t.person.last_name].filter(Boolean).join(" ")
      : null,
    eventAt: t.event?.starts_at ?? t.hangout?.starts_at ?? null,
    fbEvent:
      (t.kind?.kind === "facebook_event" ||
        t.kind?.kind === "fb_event_setup") &&
      t.event
        ? {
            title: t.event.title,
            startsAt: t.event.starts_at,
            endsAt: t.event.ends_at,
            venue: t.event.venue,
            address: t.event.address,
            description: t.event.description,
            url: t.event.source_url,
          }
        : null,
    graphic:
      t.event && t.kind && GRAPHIC_SIZE[t.kind.kind]
        ? {
            size: GRAPHIC_SIZE[t.kind.kind]!,
            event: {
              title: t.event.title,
              startsAt: t.event.starts_at,
              endsAt: t.event.ends_at,
              venue: t.event.venue,
              address: t.event.address,
              typeName: t.event.event_type?.name ?? null,
              community:
                t.event.team?.name.replace(/, (Australia|New Zealand)$/, "") ??
                null,
              teamId: t.team_id ?? undefined,
              eventId: t.event.id,
            },
          }
        : null,
    // Weather backup plan: a "still on / cancelled / moved" post (12 Nov 2026).
    weather:
      t.kind?.kind === "rain_backup" && t.event && t.team_id
        ? {
            event: {
              title: t.event.title,
              startsAt: t.event.starts_at,
              endsAt: t.event.ends_at,
              venue: t.event.venue,
              address: t.event.address,
              typeName: t.event.event_type?.name ?? null,
              community:
                t.event.team?.name.replace(/, (Australia|New Zealand)$/, "") ??
                null,
              teamId: t.team_id,
              eventId: t.event.id,
            },
            forecast: {
              chance: t.event.rain_chance ?? null,
              mm: t.event.rain_mm == null ? null : Number(t.event.rain_mm),
              temp: t.event.max_temp == null ? null : Number(t.event.max_temp),
            },
          }
        : null,
    podPost: t.pod_post
      ? {
          url: t.pod_post.url,
          note: t.pod_post.note,
          by: t.pod_post.shared_by_name,
          chat: t.pod_post.team?.pod_whatsapp_url ?? null,
        }
      : null,
    assignedTo: t.assigned_to,
    assigneeName: t.assignee
      ? [t.assignee.first_name, t.assignee.last_name].filter(Boolean).join(" ")
      : null,
  };
}

// A team's (or several teams') open tasks, soonest due first, and the last
// fortnight's done ones. Regional Support Lead tasks only when asked for.
export async function loadTeamTasks(
  supabase: SupabaseClient,
  teamIds: string | string[],
  { regional = false }: { regional?: boolean } = {},
) {
  const ids = Array.isArray(teamIds) ? teamIds : [teamIds];
  const since = new Date(Date.now() - 14 * 864e5).toISOString();
  const [open, done] = await Promise.all([
    supabase
      .from("tasks")
      .select(SELECT)
      .in("team_id", ids)
      .neq("kind", "pod_boost") // pod members' own (shown on their page)
      .is("done_at", null)
      .is("dismissed_at", null)
      .order("due_at")
      .returns<Raw[]>(),
    supabase
      .from("tasks")
      .select(SELECT)
      .in("team_id", ids)
      .neq("kind", "pod_boost")
      .is("dismissed_at", null)
      .gte("done_at", since)
      .order("done_at", { ascending: false })
      .returns<Raw[]>(),
  ]);
  if (open.error || done.error) return null;
  const keep = (t: TaskRow) => regional || !t.regional;
  // Moved tasks stay out of the way until their day.
  const nowIso = new Date().toISOString();
  let all = (open.data ?? []).map(toRow).filter(keep);
  await attachNewcomers(supabase, all);
  all = await dropEmptyQuiet(supabase, all);
  return {
    open: all.filter((t) => !t.showFrom || t.showFrom <= nowIso),
    later: all
      .filter((t) => t.showFrom && t.showFrom > nowIso)
      .sort((a, b) => a.showFrom!.localeCompare(b.showFrom!)),
    done: (done.data ?? []).map(toRow).filter(keep),
  };
}

// About 2 minutes per person still to message.
const MIN_PER_MESSAGE = 2;

// "New volunteers reminded": name the newcomers to remind. "Personal invites
// sent": the time depends on how many people are left to message.
async function attachNewcomers(supabase: SupabaseClient, rows: TaskRow[]) {
  const inviteEvents = [
    ...new Set(
      rows
        .filter((t) => t.kind === "personal_invites" && t.eventId)
        .map((t) => t.eventId!),
    ),
  ];
  for (const id of inviteEvents) {
    const list = await loadInviteList(supabase, id, Date.now());
    if (!list) continue;
    const left = list.invites.filter((i) => !i.sent).length;
    const mins = Math.max(1, left * MIN_PER_MESSAGE);
    for (const t of rows)
      if (t.kind === "personal_invites" && t.eventId === id) {
        t.estimateMinutes = mins;
        t.estimateLabel = String(mins);
      }
  }
  const ids = [
    ...new Set(
      rows
        .filter((t) => t.kind === "com_remind_new" && t.eventId)
        .map((t) => t.eventId!),
    ),
  ];
  for (const id of ids) {
    const list = await loadRegularsList(supabase, id, Date.now(), false, true);
    const names = (list?.invites ?? []).map((i) => i.name);
    for (const t of rows)
      if (t.kind === "com_remind_new" && t.eventId === id) t.people = names;
  }
}

// "Quiet volunteers re-engaged" only shows when someone's actually gone quiet.
async function dropEmptyQuiet(supabase: SupabaseClient, rows: TaskRow[]) {
  const teams = [
    ...new Set(
      rows.filter((t) => t.kind === "com_reengage").map((t) => t.teamId),
    ),
  ];
  if (!teams.length) return rows;
  const empty = new Set<string>();
  for (const id of teams)
    if (!(await loadQuietList(supabase, id, Date.now())).length) empty.add(id);
  return rows.filter((t) => t.kind !== "com_reengage" || !empty.has(t.teamId));
}

// Open tasks assigned to one person (their own page).
export async function loadMyTasks(supabase: SupabaseClient, personId: string) {
  const { data } = await supabase
    .from("tasks")
    .select(SELECT)
    .eq("assigned_to", personId)
    .is("done_at", null)
    .is("dismissed_at", null)
    .order("due_at")
    .returns<Raw[]>();
  const nowIso = new Date().toISOString();
  let rows = (data ?? [])
    .map(toRow)
    .filter((t) => !t.showFrom || t.showFrom <= nowIso);
  await attachNewcomers(supabase, rows);
  rows = await dropEmptyQuiet(supabase, rows);
  // Who handed each one over (with their photo, when we can show it).
  if (rows.length) {
    const { data: by } = await supabase.rpc("my_task_delegators", {
      p_task_ids: rows.map((t) => t.id),
    });
    const list = (by ?? []) as {
      task_id: string;
      name: string;
      person_id: string | null;
      photo_updated_at: string | null;
    }[];
    const photos = await signPhotos(
      supabase,
      list
        .filter((d) => d.person_id)
        .map((d) => ({
          id: d.person_id!,
          photo_updated_at: d.photo_updated_at,
        })),
    ).catch(() => ({}) as Record<string, string>);
    const byTask = new Map(list.map((d) => [d.task_id, d]));
    for (const t of rows) {
      const d = byTask.get(t.id);
      if (d)
        t.delegatedBy = {
          name: d.name,
          photoUrl: d.person_id ? (photos[d.person_id] ?? null) : null,
        };
    }
  }
  return rows;
}

// Region-wide Regional Support Lead actions (e.g. promoting an Organiser
// Hangout), for the regions they lead. Open ones, plus the last fortnight's done.
export async function loadRegionTasks(
  supabase: SupabaseClient,
  regionIds: string[],
) {
  if (!regionIds.length) return { open: [], later: [], done: [] };
  const since = new Date(Date.now() - 14 * 864e5).toISOString();
  const select = `${SELECT}, region_id, hangout:hangouts(id, title, starts_at, source_url)`;
  const [open, done] = await Promise.all([
    supabase
      .from("tasks")
      .select(select)
      .in("region_id", regionIds)
      .is("done_at", null)
      .is("dismissed_at", null)
      .order("due_at")
      .returns<Raw[]>(),
    supabase
      .from("tasks")
      .select(select)
      .in("region_id", regionIds)
      .is("dismissed_at", null)
      .gte("done_at", since)
      .order("done_at", { ascending: false })
      .returns<Raw[]>(),
  ]);
  const nowIso = new Date().toISOString();
  const all = (open.data ?? []).map(toRow);
  await attachFeedbackCount(supabase, all);
  return {
    open: all.filter((t) => !t.showFrom || t.showFrom <= nowIso),
    later: all.filter((t) => t.showFrom && t.showFrom > nowIso),
    done: (done.data ?? []).map(toRow),
  };
}

// "Organiser feedback read and replied to" (0206, Kai: "have time depend on
// if there is feedback"): 10 minutes for each piece from the last month,
// 2 minutes to check when there's none, and the card says how many.
const MIN_PER_FEEDBACK = 10;
async function attachFeedbackCount(supabase: SupabaseClient, rows: TaskRow[]) {
  const since = new Date(Date.now() - 31 * 864e5).toISOString();
  for (const t of rows) {
    if (t.kind !== "rsl_feedback_review" || !t.regionId) continue;
    const { data } = await supabase.rpc("region_feedback_count", {
      p_region: t.regionId,
      p_since: since,
    });
    if (typeof data !== "number") continue;
    const mins = data === 0 ? 2 : Math.min(60, data * MIN_PER_FEEDBACK);
    t.estimateMinutes = mins;
    t.estimateLabel = String(mins);
    t.description = `${
      data === 0
        ? "No new feedback in the last month: just a quick check."
        : `${data} new piece${data === 1 ? "" : "s"} of feedback in the last month.`
    } ${t.description ?? ""}`.trim();
  }
}

// "77% chance of rain, about 5 mm while it's on, up to 33°C" (only the parts
// that triggered the plan; rain alone if neither did).
function weatherLine(e: {
  rain_chance?: number | null;
  rain_mm?: number | null;
  max_temp?: number | null;
}) {
  const mm = e.rain_mm == null ? null : Number(e.rain_mm);
  const temp = e.max_temp == null ? null : Number(e.max_temp);
  const rain = `${e.rain_chance}% chance of rain${mm != null ? `, about ${Math.round(mm)} mm` : ""} while it's on`;
  const hot = temp != null && temp > 30 ? `up to ${Math.round(temp)}°C` : null;
  const wet = (e.rain_chance ?? 0) > 30 && (mm ?? 0) >= 1;
  if (hot && !wet) return `${hot} while it's on`;
  return hot ? `${rain}, ${hot}` : rain;
}
