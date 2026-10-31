import { cookies } from "next/headers";
import { VIEW_AS_COOKIE } from "@/lib/organiser";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AttendeeShell } from "@/components/attendee-shell";
import { formatEventDate, formatTime } from "@/lib/time";
import { MarkRead } from "./mark-read";
import { TaskDoneBox } from "@/components/task-done-box";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: items }, { data: organiser }] = await Promise.all([
    supabase
      .from("notifications")
      .select(
        "id, title, body, url, created_at, read_at, task_id, task:tasks(done_at, dismissed_at)",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("organisers")
      .select("id, access")
      .eq("id", user.id)
      .maybeSingle(),
  ]);
  // Hidden while God Mode is previewing as an attendee.
  const previewingAttendee = ["member", "new_member"].includes(
    (await cookies()).get(VIEW_AS_COOKIE)?.value ?? "",
  );
  const staffLink = !!organiser && !previewingAttendee;
  const unread = (items ?? []).some((n) => !n.read_at);

  return (
    <AttendeeShell
      right={
        <div className="flex items-center gap-1">
          {staffLink && (
            <Link
              href="/"
              className="rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10"
            >
              {organiser!.access === "core_team"
                ? "Take attendance"
                : "Organiser view"}
            </Link>
          )}
          <Link
            href="/me"
            className="rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10"
          >
            My profile
          </Link>
        </div>
      }
    >
      <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
      {unread && <MarkRead />}
      {!items?.length ? (
        <p className="mt-6 text-sm text-stone-500">
          Nothing yet. New member support reminders will show up here.
        </p>
      ) : (
        <ul className="mt-5 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          {items.map((n) => (
            <li
              key={n.id}
              className="flex items-center border-b border-black/5 last:border-0"
            >
              <Link
                href={n.url ?? "/me"}
                className="flex min-w-0 flex-1 gap-3 px-4 py-3 hover:bg-stone-50"
              >
                <span
                  className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.read_at ? "bg-transparent" : "bg-pink"}`}
                  aria-label={n.read_at ? undefined : "Unread"}
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{n.title}</span>
                  {n.body && (
                    <span className="block text-sm text-stone-600">
                      {n.body}
                    </span>
                  )}
                  <span className="mt-1 block text-xs text-stone-500">
                    {formatEventDate(n.created_at)}, {formatTime(n.created_at)}
                  </span>
                </span>
              </Link>
              {n.task_id && !taskOf(n)?.dismissed_at && (
                <span className="pr-4">
                  <TaskDoneBox
                    taskId={n.task_id}
                    initialDone={!!taskOf(n)?.done_at}
                  />
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </AttendeeShell>
  );
}

type TaskRef = { done_at: string | null; dismissed_at: string | null };
// The embedded action (Supabase may type it as a list).
function taskOf(n: { task?: TaskRef | TaskRef[] | null }): TaskRef | null {
  const t = n.task;
  return Array.isArray(t) ? (t[0] ?? null) : (t ?? null);
}
