import type { SupabaseClient } from "@supabase/supabase-js";

// Organiser chats through Beeper (0231): what Actions needs to show beside
// each community's check-in.

export type ChatLink = {
  chatId: string;
  lastMineAt: string | null;
  waitingSince: string | null; // their last message, when newer than ours
};

// The signed-in RSL's newest organiser chat per community (own rows by RLS).
export async function loadChatLinks(supabase: SupabaseClient): Promise<{
  byTeam: Record<string, ChatLink>;
  waiting: number;
  linked: boolean;
}> {
  const [{ data }, { data: link }] = await Promise.all([
    supabase
      .from("beeper_chats")
      .select("chat_id, team_id, last_mine_at, last_theirs_at, last_activity")
      .eq("tag", "organiser")
      .order("last_activity", { ascending: false, nullsFirst: false }),
    supabase.from("beeper_links").select("user_id").maybeSingle(),
  ]);
  const byTeam: Record<string, ChatLink> = {};
  let waiting = 0;
  for (const c of data ?? []) {
    const wait =
      !!c.last_theirs_at &&
      (!c.last_mine_at || c.last_theirs_at > c.last_mine_at);
    if (wait) waiting++;
    if (!c.team_id || byTeam[c.team_id]) continue;
    byTeam[c.team_id] = {
      chatId: c.chat_id,
      lastMineAt: c.last_mine_at,
      waitingSince: wait ? c.last_theirs_at : null,
    };
  }
  return { byTeam, waiting, linked: !!link };
}

export function ago(iso: string | null, now: number) {
  if (!iso) return "";
  const m = Math.round((now - Date.parse(iso)) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 14) return `${d} day${d === 1 ? "" : "s"} ago`;
  const w = Math.round(d / 7);
  if (w < 9) return `${w} weeks ago`;
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

export const chatHref = (chatId?: string) =>
  chatId ? `/chats?chat=${encodeURIComponent(chatId)}` : "/chats";
