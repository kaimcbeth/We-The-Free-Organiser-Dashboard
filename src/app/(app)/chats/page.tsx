import Link from "next/link";
import { requireOrganiser } from "@/lib/organiser";
import { loadRslTeams } from "@/lib/rsl-teams";
import { loadConnectContext, type ConnectContext } from "@/lib/connect";
import { OrganiserChats, type ChatTeam } from "./organiser-chats";

// Organiser chats (Kai, 13 Nov 2026: "responding to messages as an RSL",
// "I can mark which chats are organisers and which are not"). The RSL's
// Beeper chats, synced by a helper on their Mac (public/beeper, 0231).
export default async function ChatsPage({ searchParams }: PageProps<"/chats">) {
  const { chat } = await searchParams;
  const { supabase, organiser } = await requireOrganiser();
  const allowed =
    !organiser.viewingAs &&
    (organiser.access === "god" ||
      organiser.access === "regional_lead" ||
      organiser.leadRegionIds.length > 0);
  if (!allowed)
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Organiser chats</h1>
        <p className="text-sm text-stone-600">
          This page is for Regional Support Leads.{" "}
          <Link href="/tasks" className="underline">
            Back to Actions
          </Link>
        </p>
      </div>
    );

  const regionIds = organiser.leadRegionIds.length
    ? organiser.leadRegionIds
    : organiser.region_id
      ? [organiser.region_id]
      : [];
  const rslTeams = regionIds.length
    ? await loadRslTeams(supabase, regionIds)
    : [];
  // God without a region: every community.
  const teams = rslTeams.length ? rslTeams : organiser.teams;

  const [{ data: link }, { data: tagged }] = await Promise.all([
    supabase
      .from("beeper_links")
      .select("last_seen_at, beeper_ok, beeper_error, helper_version")
      .maybeSingle(),
    supabase
      .from("beeper_chats")
      .select("team_id")
      .eq("tag", "organiser")
      .not("team_id", "is", null),
  ]);
  const taggedIds = new Set((tagged ?? []).map((r) => r.team_id as string));
  const taggedTeams = teams.filter((t) => taggedIds.has(t.id));
  const [ctx, { data: open }] = await Promise.all([
    taggedTeams.length
      ? loadConnectContext(supabase, taggedTeams)
      : Promise.resolve({} as Record<string, ConnectContext>),
    supabase
      .from("tasks")
      .select("id, team_id, due_at")
      .eq("kind", "connect_organisers")
      .is("done_at", null)
      .is("dismissed_at", null)
      .in("team_id", [...taggedIds]),
  ]);

  const chatTeams: ChatTeam[] = teams.map((t) => {
    const c = ctx[t.id];
    const task = (open ?? []).find((o) => o.team_id === t.id);
    return {
      id: t.id,
      name: t.name.replace(/, (Australia|New Zealand)$/, ""),
      last: c?.recent[0]?.label ?? null,
      next: c?.upcoming[0]?.label ?? null,
      quiet: c?.quiet ?? false,
      checkIn: task ? { id: task.id, dueAt: task.due_at } : null,
    };
  });

  return (
    <OrganiserChats
      // eslint-disable-next-line react-hooks/purity -- server render time
      now={Date.now()}
      teams={chatTeams}
      link={
        link
          ? {
              lastSeenAt: link.last_seen_at,
              beeperOk: link.beeper_ok,
              beeperError: link.beeper_error,
            }
          : null
      }
      initialChat={typeof chat === "string" ? chat : null}
    />
  );
}
