import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";

// Bell with the number of unread notifications. Server component.
export async function NotificationBell({ supabase, userId }: { supabase: SupabaseClient; userId: string }) {
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  const unread = count ?? 0;

  return (
    <Link
      href="/notifications"
      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/85 hover:bg-white/10"
      aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {unread > 0 && (
        <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-pink px-1 text-[10px] font-bold text-navy">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
