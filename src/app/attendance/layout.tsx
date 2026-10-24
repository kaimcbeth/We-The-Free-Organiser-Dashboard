import Link from "next/link";
import { EasterEggLogo } from "@/components/easter-egg-logo";
import { requireCore, ROLE_LABEL } from "@/lib/organiser";
import { StaffBar } from "@/components/staff-bar";
import { NotificationBell } from "@/components/notification-bell";
import { CoreTabs } from "./core-tabs";
import { CoreTour } from "./core-tour";

// Core Team: just their team's events and the attendance list.
export default async function AttendanceLayout({
  children,
}: LayoutProps<"/attendance">) {
  const { supabase, user, organiser } = await requireCore();
  // Their own open tasks, for the "My tasks" count.
  const { data: me } = await supabase
    .from("people")
    .select("id, first_name")
    .eq("user_id", user.id)
    .maybeSingle();
  const { count: openTasks } = me
    ? await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("assigned_to", me.id)
        .is("done_at", null)
        .is("dismissed_at", null)
        .or(`show_from.is.null,show_from.lte.${new Date().toISOString()}`)
    : { count: 0 };

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 bg-navy text-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 pb-1 pt-3">
          <Link
            href="/attendance"
            className="flex min-w-0 items-center gap-2.5 leading-tight"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- small static logo */}
            <img
              src="/brand/wtf-mark.png"
              alt="We The Free"
              className="h-9 w-auto shrink-0"
            />
            <span className="min-w-0">
              <EasterEggLogo className="block text-xs font-bold uppercase tracking-wider text-pink" />
              <span className="block truncate text-sm font-medium text-white">
                {organiser.team.name}
              </span>
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
        <CoreTabs
          openTasks={organiser.coreSetupPreview ? 0 : (openTasks ?? 0)}
        />
      </header>
      <StaffBar
        teams={organiser.teams.map((t) => ({ id: t.id, name: t.name }))}
        teamId={organiser.team_id}
        isGod={organiser.access === "god"}
        viewingAs={organiser.viewingAs}
        viewValue={organiser.viewValue}
        allowAll={
          organiser.role === "god" || organiser.role === "regional_lead"
        }
        allCommunities={organiser.allCommunities}
      />
      {organiser.showCoreTour && (
        <CoreTour
          key={organiser.coreSetupPreview ? "preview" : "tour"}
          firstName={(me?.first_name ?? organiser.name).split(" ")[0]}
          communityName={organiser.team.name.replace(
            /, (Australia|New Zealand)$/,
            "",
          )}
        />
      )}
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-5">
        {children}
      </main>
    </div>
  );
}
