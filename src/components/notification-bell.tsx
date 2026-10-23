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
// What the bell shows during the tour (Example Community).
const EXAMPLES: BellItem[] = [
  {
    id: "ex-1",
    title: "Facebook event created",
    body: "Social on Wednesday: copy the details and paste them into Facebook.",
    url: "/tasks",
    unread: true,
    when: "1h ago",
  },
  {
    id: "ex-2",
    title: "Ringo came for the first time",
    body: "George is looking after him. Say hi in the WhatsApp group!",
    url: "/people",
    unread: true,
    when: "6d ago",
  },
  {
    id: "ex-3",
    title: "Paul picked up 2 actions",
    body: "As Events Lead he's looking after event photos.",
    url: "/tasks",
    unread: true,
    when: "1w ago",
  },
];

export async function NotificationBell({
  supabase,
  userId,
  examples = false,
}: {
  supabase: SupabaseClient;
  userId: string;
  examples?: boolean;
}) {
  if (examples)
    return <BellMenu unread={EXAMPLES.length} items={EXAMPLES} demo />;
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
