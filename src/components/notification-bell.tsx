import type { SupabaseClient } from "@supabase/supabase-js";
import { BellMenu, type BellItem } from "@/components/bell-menu";

function ago(iso: string, now: number) {
  const mins = Math.max(0, Math.round((now - Date.parse(iso)) / 6e4));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.round(days / 7)}w ago`;
}

// Bell with the number of unread notifications; tapping it opens a preview
// of the latest ones. Server component (the dropdown itself is BellMenu).
export async function NotificationBell({
  supabase,
  userId,
}: {
  supabase: SupabaseClient;
  userId: string;
}) {
  const [{ count }, { data }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null),
    supabase
      .from("notifications")
      .select("id, title, body, url, created_at, read_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const items: BellItem[] = (data ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    url: n.url,
    unread: !n.read_at,
    when: ago(n.created_at, now),
  }));
  return <BellMenu unread={count ?? 0} items={items} />;
}
