import Link from "next/link";
import { requireCore, ROLE_LABEL } from "@/lib/organiser";
import { StaffBar } from "@/components/staff-bar";
import { NotificationBell } from "@/components/notification-bell";

// Core Team: just their team's events and the attendance list.
export default async function AttendanceLayout({
  children,
}: LayoutProps<"/attendance">) {
  const { supabase, user, organiser } = await requireCore();

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 bg-navy text-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/attendance" className="min-w-0 leading-tight">
            <span className="block text-xs font-bold uppercase tracking-wider text-pink">
              We The Free
            </span>
            <span className="block truncate text-sm font-medium text-white">
              {organiser.team.name}
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <NotificationBell supabase={supabase} userId={user.id} />
            <Link
              href="/me"
              className="rounded-full px-3 py-1.5 text-right leading-tight hover:bg-white/10"
            >
              <span className="block text-sm font-medium">My profile</span>
              <span className="block text-xs text-cyan">
                {ROLE_LABEL[organiser.role]}
              </span>
            </Link>
          </div>
        </div>
      </header>
      <StaffBar
        teams={organiser.teams.map((t) => ({ id: t.id, name: t.name }))}
        teamId={organiser.team_id}
        isGod={organiser.access === "god"}
        viewingAs={organiser.viewingAs}
        viewValue={organiser.viewValue}
      />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-5">
        {children}
      </main>
    </div>
  );
}
