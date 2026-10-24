import type { SupabaseClient } from "@supabase/supabase-js";
import type { TaskRow } from "@/components/task-card";
import { signPhotos } from "@/lib/photos";
import { loadRegularsList } from "@/lib/invites";
import type { GraphicSize } from "@/components/graphic-maker";

type Raw = {
  id: string;
  team_id: string;
  due_at: string;
  show_from: string | null;
  done_at: string | null;
  assigned_to: string | null;
  kind: {
    kind: string;
    sort_order: number;
    title: string;
    description: string | null;
    estimate_minutes: number;
    estimate_max_minutes: number | null;
    audience: string;
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
    event_type_id: string | null;
    event_type: { name: string } | null;
    team: { name: string } | null;
  } | null;
  assignee: { first_name: string; last_name: string | null } | null;
  person: { id: string; first_name: string; last_name: string | null } | null;
};

const SELECT =
  "id, team_id, due_at, show_from, done_at, assigned_to, kind:task_kinds(kind, sort_order, title, description, estimate_minutes, estimate_max_minutes, audience), event:events(id, title, starts_at, ends_at, venue, address, description, source_url, facebook_url, event_type_id, event_type:event_types(name), team:teams(name)), assignee:people!tasks_assigned_to_fkey(first_name, last_name), person:people!tasks_person_id_fkey(id, first_name, last_name)";

// Promo actions that get a "Get graphic" button, and the size they need.
const GRAPHIC_SIZE: Record<string, GraphicSize | undefined> = {
  promote_instagram: "post",
  facebook_event: "cover",
  promote_facebook_groups: "post",
  promote_whatsapp: "story",
  post_photos: "story",
  post_photos_facebook: "post",
  post_photos_instagram: "post",
};

function toRow(t: Raw): TaskRow {
  return {
    id: t.id,
    teamId: t.team_id,
    regional: t.kind?.audience === "regional",
    kind: t.kind?.kind ?? "",
    sortOrder: t.kind?.sort_order ?? 0,
    eventId: t.event?.id ?? null,
    eventTypeId: t.event?.event_type_id ?? null,
    eventTypeName: t.event?.event_type?.name ?? null,
    title: t.kind?.title ?? "Action",
    description: t.kind?.description ?? null,
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
    eventTitle: t.event?.title ?? null,
    eventFacebookUrl: t.event?.facebook_url ?? null,
    personId: t.person?.id ?? null,
    personName: t.person
      ? [t.person.first_name, t.person.last_name].filter(Boolean).join(" ")
      : null,
    eventAt: t.event?.starts_at ?? null,
    fbEvent:
      t.kind?.kind === "facebook_event" && t.event
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
              teamId: t.team_id,
              eventId: t.event.id,
            },
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
      .is("done_at", null)
      .is("dismissed_at", null)
      .order("due_at")
      .returns<Raw[]>(),
    supabase
      .from("tasks")
      .select(SELECT)
      .in("team_id", ids)
      .is("dismissed_at", null)
      .gte("done_at", since)
      .order("done_at", { ascending: false })
      .returns<Raw[]>(),
  ]);
  if (open.error || done.error) return null;
  const keep = (t: TaskRow) => regional || !t.regional;
  // Moved tasks stay out of the way until their day.
  const nowIso = new Date().toISOString();
  const all = (open.data ?? []).map(toRow).filter(keep);
  await attachNewcomers(supabase, all);
  return {
    open: all.filter((t) => !t.showFrom || t.showFrom <= nowIso),
    later: all
      .filter((t) => t.showFrom && t.showFrom > nowIso)
      .sort((a, b) => a.showFrom!.localeCompare(b.showFrom!)),
    done: (done.data ?? []).map(toRow).filter(keep),
  };
}

// "New volunteers reminded": name the newcomers to remind.
async function attachNewcomers(supabase: SupabaseClient, rows: TaskRow[]) {
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
  const rows = (data ?? [])
    .map(toRow)
    .filter((t) => !t.showFrom || t.showFrom <= nowIso);
  await attachNewcomers(supabase, rows);
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
