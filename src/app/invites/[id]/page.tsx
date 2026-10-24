import { requireCore } from "@/lib/organiser";
import { loadInviteList, loadRegularsList } from "@/lib/invites";
import { formatEventDate, formatTimeRange } from "@/lib/time";
import { InviteList } from "./invite-list";

// The personal invite list for one event, opened in its own window from the
// "Personal invites sent" action so it can sit beside WhatsApp/Messenger.
export default async function InvitesPage({
  params,
  searchParams,
}: PageProps<"/invites/[id]">) {
  const { id } = await params;
  // ?list=regulars: everyone who comes regularly (e.g. for the set-up team).
  const regulars = (await searchParams).list === "regulars";
  const { supabase, organiser } = await requireCore();
  // eslint-disable-next-line react-hooks/purity -- server component, rendered per request
  const now = Date.now();
  const [list, { data: event }] = await Promise.all([
    (regulars ? loadRegularsList : loadInviteList)(
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
        {regulars ? "Set-up team" : "Personal invites"}: {list.eventTitle}
      </h1>
      <p className="mt-1 text-sm text-stone-600">
        {regulars
          ? "Ask your regulars who can help set up and pack down. Open a chat, write your own message, then tick them off."
          : "Open a chat with WhatsApp or Messenger, write your own message, then tick them off."}
      </p>
      <InviteList eventId={id} invites={list.invites} local={regulars} />
    </main>
  );
}
