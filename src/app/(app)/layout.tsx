import Link from "next/link";
import { EasterEggLogo } from "@/components/easter-egg-logo";
import { cookies } from "next/headers";
import { LATEST_CHANGE } from "@/lib/changelog";
import { requireOrganiser, ROLE_LABEL } from "@/lib/organiser";
import { StaffBar } from "@/components/staff-bar";
import { signPhotos } from "@/lib/photos";
import { Avatar } from "@/components/avatar";
import { NavLinks } from "./nav-links";
import { EventsViewSwitch } from "./events-view-switch";
import { AllCommunitiesNotice } from "./all-communities-notice";
import { OrganiserTour } from "./organiser-tour";
import { loadTaskSetup } from "@/lib/task-setup";
import { NotificationBell } from "@/components/notification-bell";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { supabase, user, organiser } = await requireOrganiser();

  // The organiser's own member profile (for their photo), if they have one.
  const { data: me } = await supabase
    .from("people")
    .select("id, first_name, last_name, photo_updated_at")
    .eq("user_id", user.id)
    .maybeSingle();
  const photos = me ? await signPhotos(supabase, [me]) : {};
  const tourSetup = organiser.showTour
    ? await loadTaskSetup(supabase, organiser.homeTeamId)
    : null;
  // Tasks badge: Regional Support Leads (and "All communities") count only
  // their own tasks; everyone else the community's tasks.
  const regionalStaff =
    organiser.role === "god" || organiser.role === "regional_lead";
  let countQuery = supabase
    .from("tasks")
    .select("id, kind:task_kinds!inner(audience)", {
      count: "exact",
      head: true,
    })
    .in(
      "team_id",
      organiser.allCommunities
        ? organiser.teams.map((t) => t.id)
        : [organiser.team_id],
    )
    .is("done_at", null)
    .is("dismissed_at", null)
    .or(`show_from.is.null,show_from.lte.${new Date().toISOString()}`);
  if (organiser.allCommunities || organiser.role === "regional_lead")
    countQuery = countQuery.eq("kind.audience", "regional");
  else if (!regionalStaff)
    countQuery = countQuery.eq("kind.audience", "community");
  const { count: openTasks } = await countQuery;
  const name = me
    ? [me.first_name, me.last_name].filter(Boolean).join(" ")
    : organiser.name;

  const whatsNew =
    (await cookies()).get("whats_new_seen")?.value !== LATEST_CHANGE;
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 bg-navy text-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 pt-3">
          <Link
            href="/"
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
                {organiser.team?.name ?? "Your community"}
              </span>
            </span>
          </Link>
          <div className="flex min-w-0 items-center gap-1">
            {/* What's new: a small link by the bell (not a tab), with a dot
                when something's changed since they last looked. */}
            <Link
              href="/whats-new"
              aria-label={
                whatsNew ? "What's new (something new)" : "What's new"
              }
              title="What's new"
              data-tour="whats-new"
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/85 hover:bg-white/10"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z" />
                <path d="M19 15l.8 1.7 1.7.8-1.7.8L19 20l-.8-1.7-1.7-.8 1.7-.8z" />
              </svg>
              {whatsNew && (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-pink ring-2 ring-navy" />
              )}
            </Link>
            <NotificationBell
              supabase={supabase}
              userId={user.id}
              examples={organiser.exampleMode}
            />
            <Link
              href="/me"
              className="flex min-w-0 items-center gap-2.5 rounded-full py-1 pl-3 pr-1 hover:bg-white/10"
              aria-label="Your profile"
            >
              <span className="min-w-0 text-right leading-tight">
                <span className="block truncate text-sm font-medium text-white">
                  {name}
                </span>
                <span className="block truncate text-xs text-cyan">
                  {ROLE_LABEL[organiser.role]}
                </span>
              </span>
              <Avatar
                name={name}
                url={me ? photos[me.id] : null}
                size={36}
                className="ring-2 ring-white/20"
              />
            </Link>
          </div>
        </div>
        <NavLinks openTasks={openTasks ?? 0} isGod={organiser.role === "god"} />
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
      {organiser.allCommunities && (
        <AllCommunitiesNotice teamName={organiser.team.name} />
      )}

      {tourSetup && (
        <OrganiserTour
          key={organiser.tourPreview ? "preview" : "tour"}
          firstName={(me?.first_name ?? organiser.name).split(" ")[0]}
          communityName={(
            organiser.teams.find((t) => t.id === organiser.homeTeamId) ??
            organiser.team
          ).name.replace(/, (Australia|New Zealand)$/, "")}
          setup={tourSetup}
        />
      )}
      {organiser.exampleMode && (
        <p className="bg-cyan/25 px-4 py-2 text-center text-sm text-navy">
          You&apos;re looking at an <b>example community</b> for the tour. Your
          own appears when the tour ends.
        </p>
      )}
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-5">
        <EventsViewSwitch />
        {children}
      </main>
    </div>
  );
}
