import { requireCore } from "@/lib/organiser";
import { loadInviteList } from "@/lib/invites";
import { formatEventDate, formatTimeRange } from "@/lib/time";
import { InviteList } from "./invite-list";

// The personal invite list for one event, opened in its own window from the
// "Personal invites sent" action so it can sit beside WhatsApp/Messenger.
export default async function InvitesPage({
  params,
}: PageProps<"/invites/[id]">) {
  const { id } = await params;
  const { supabase, organiser } = await requireCore();
  // eslint-disable-next-line react-hooks/purity -- server component, rendered per request
  const now = Date.now();
  const [list, { data: event }] = await Promise.all([
    loadInviteList(
      supabase,
      id,
      now,
      organiser.role === "god" || organiser.role === "regional_lead",
    ),
    supabase
      .from("events")
      .select("starts_at, ends_at, venue")
      .eq("id", id)
      .maybeSingle(),
  ]);
  if (!list || !event)
    return (
      <main className="mx-auto max-w-lg px-4 py-10">
        <h1 className="text-2xl font-semibold">Can&apos;t open this list</h1>
      </main>
    );

  return (
    <main className="mx-auto w-full max-w-lg px-4 pb-16 pt-6">
      <p className="text-sm text-stone-500">
        {formatEventDate(event.starts_at)} ·{" "}
        {formatTimeRange(event.starts_at, event.ends_at)}
        {event.venue ? ` · ${event.venue}` : ""}
      </p>
      <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">
        Personal invites: {list.eventTitle}
      </h1>
      <p className="mt-1 text-sm text-stone-600">
        Open a chat with WhatsApp or Messenger, write your own message, then
        tick them off.
      </p>
      <InviteList eventId={id} invites={list.invites} />
    </main>
  );
}
