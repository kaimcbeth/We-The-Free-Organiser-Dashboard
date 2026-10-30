import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadTaskSetup } from "@/lib/task-setup";
import { loadUpcomingActions } from "@/lib/upcoming-actions";
import { formatEventDate, formatTime } from "@/lib/time";
import { ComingUp } from "@/app/(app)/tasks/coming-up";

type Row = {
  id: string;
  due_at: string;
  done_at: string | null;
  dismissed_at: string | null;
  kind: { title: string; sort_order: number } | null;
  assignee: { first_name: string } | null;
};

// Every action for this event: to do, done, and the ones still to come
// (however far ahead), so you can see the whole plan in one place.
export async function EventActions({
  supabase,
  teamId,
  eventId,
  now,
}: {
  supabase: SupabaseClient;
  teamId: string;
  eventId: string;
  now: number;
}) {
  const [{ data }, setup] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, due_at, done_at, dismissed_at, kind:task_kinds(title, sort_order), assignee:people!tasks_assigned_to_fkey(first_name)",
      )
      .eq("event_id", eventId)
      .returns<Row[]>(),
    loadTaskSetup(supabase, teamId),
  ]);
  const upcoming = await loadUpcomingActions(
    supabase,
    teamId,
    setup.enabled,
    now,
    { eventId },
  );
  const rows = (data ?? []).filter((r) => !r.dismissed_at);
  const sort = (a: Row, b: Row) =>
    (a.kind?.sort_order ?? 0) - (b.kind?.sort_order ?? 0);
  const open = rows.filter((r) => !r.done_at).sort(sort);
  const done = rows.filter((r) => r.done_at).sort(sort);
  if (open.length + done.length + upcoming.length === 0) return null;

  const when = (iso: string) => {
    const days = Math.round((Date.parse(iso) - now) / 864e5);
    if (Date.parse(iso) <= now) return "any minute now";
    return days <= 0
      ? `today at ${formatTime(iso)}`
      : days === 1
        ? "tomorrow"
        : `in ${days} days`;
  };
  const due = (iso: string) => {
    const t = Date.parse(iso);
    return t < now ? "overdue" : `due ${formatEventDate(iso)}`;
  };

  const overdue = open.filter((r) => Date.parse(r.due_at) < now).length;

  // Folded to one line so check-in stays near the top; tap to see them all.
  return (
    <details className="group mt-5 rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm [&::-webkit-details-marker]:hidden">
        <span>
          <span className="font-semibold text-navy">Actions</span>{" "}
          <span className="text-stone-500">
            {done.length} of {open.length + done.length + upcoming.length} done
            {open.length > 0 && ` · ${open.length} to do`}
          </span>
          {overdue > 0 && (
            <span className="font-semibold text-red-700">
              {" "}
              · {overdue} overdue
            </span>
          )}
        </span>
        <span
          aria-hidden
          className="text-stone-400 transition-transform group-open:rotate-90"
        >
          ›
        </span>
      </summary>
      <div className="border-t border-black/5 p-3">
        {open.length > 0 && (
          <div className="mb-2 flex justify-end">
            <Link
              href={`/tasks?event=${eventId}`}
              className="text-xs font-semibold text-pink-ink hover:underline"
            >
              Open in Actions
            </Link>
          </div>
        )}
        {(open.length > 0 || done.length > 0) && (
          <ul className="divide-y divide-black/5 overflow-hidden rounded-2xl bg-white text-sm shadow-sm ring-1 ring-black/5">
            {open.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5"
              >
                <span className="min-w-0 truncate font-medium">
                  {r.kind?.title ?? "Action"}
                </span>
                <span
                  className={`shrink-0 text-xs ${Date.parse(r.due_at) < now ? "font-semibold text-red-700" : "text-stone-500"}`}
                >
                  {r.assignee ? `${r.assignee.first_name} · ` : ""}
                  {due(r.due_at)}
                </span>
              </li>
            ))}
            {done.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5 text-stone-400"
              >
                <span className="min-w-0 truncate line-through">
                  {r.kind?.title ?? "Action"}
                </span>
                <span className="shrink-0 text-xs">✓ done</span>
              </li>
            ))}
          </ul>
        )}
        {upcoming.length > 0 && (
          <>
            <p className="mt-3 px-1 text-xs font-medium uppercase tracking-wide text-stone-400">
              Still to come
            </p>
            <ComingUp
              items={upcoming}
              whenLabel={Object.fromEntries(
                upcoming.map((u) => [u.appearsAt, when(u.appearsAt)]),
              )}
              alwaysOpen
            />
          </>
        )}
      </div>
    </details>
  );
}
