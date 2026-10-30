import Link from "next/link";
import { PreviewBanner } from "@/components/preview-banner";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { VIEW_AS_COOKIE } from "@/lib/organiser";
import { EasterEggLogo } from "@/components/easter-egg-logo";
import { NotificationBell } from "@/components/notification-bell";
import { Avatar } from "@/components/avatar";
import { signPhotos } from "@/lib/photos";
import { STAGE, STAGE_TAG, VERSION, BUILD } from "@/lib/changelog";
import { MemberNav } from "./member-nav";

// The member side of the Hub: the same top bar as the organiser Hub, with
// member tabs (Events, Outreach, Photo Hub, How you can help, Resources, Feedback).
export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return <>{children}</>; // the pages send them to log in

  const [{ data: me }, { data: organiser }] = await Promise.all([
    supabase
      .from("people")
      .select(
        "id, first_name, last_name, photo_updated_at, team:teams!people_team_id_fkey(name)",
      )
      .eq("user_id", user.id)
      .maybeSingle<{
        id: string;
        first_name: string;
        last_name: string | null;
        photo_updated_at: string | null;
        team: { name: string } | null;
      }>(),
    supabase
      .from("organisers")
      .select("access, name")
      .eq("id", user.id)
      .maybeSingle<{ access: string; name: string }>(),
  ]);
  const viewAs = (await cookies()).get(VIEW_AS_COOKIE)?.value ?? "";
  const previewing = ["member", "new_member"].includes(viewAs);
  const staffLink = !!organiser && !previewing;
  const photos = me ? await signPhotos(supabase, [me]) : {};
  const name = me
    ? [me.first_name, me.last_name].filter(Boolean).join(" ")
    : (organiser?.name ?? "");
  const role =
    organiser?.access === "core_team" && !previewing ? "Core Team" : "Member";

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 bg-navy text-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 pt-3">
          <Link
            href="/me"
            className="flex min-w-0 items-center gap-2.5 leading-tight"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- small static logo */}
            <img
              src="/brand/wtf-mark.png"
              alt="We The Free"
              className="h-9 w-auto shrink-0"
            />
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <EasterEggLogo className="block whitespace-nowrap text-xs font-bold uppercase tracking-wider text-pink" />
                <span
                  title={`${STAGE} ${VERSION}, build ${BUILD}`}
                  className={`shrink-0 rounded px-1 text-[9px] font-semibold uppercase leading-[14px] tracking-wide ${STAGE_TAG}`}
                >
                  {STAGE}
                  <span className="hidden sm:inline"> {VERSION}</span>
                </span>
              </span>
              <span className="block truncate text-sm font-medium text-white">
                {me?.team?.name ?? "Your community"}
              </span>
            </span>
          </Link>
          <div className="flex min-w-0 items-center gap-1">
            {staffLink && (
              <Link
                href="/"
                className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-medium text-white/85 ring-1 ring-white/25 hover:bg-white/10 sm:px-3 sm:py-2 sm:text-sm sm:ring-0"
              >
                {organiser!.access === "core_team" ? (
                  <>
                    <span className="sm:hidden">Attendance</span>
                    <span className="hidden sm:inline">Take attendance</span>
                  </>
                ) : (
                  <>
                    <span className="sm:hidden">Organiser</span>
                    <span className="hidden sm:inline">Organiser view</span>
                  </>
                )}
              </Link>
            )}
            <NotificationBell supabase={supabase} userId={user.id} />
            {name && (
              <Link
                href="/me/profile"
                className="flex min-w-0 items-center gap-2.5 rounded-full p-1 hover:bg-white/10 sm:pl-3"
                aria-label="Your profile"
              >
                <span className="hidden min-w-0 text-right leading-tight sm:block">
                  <span className="block truncate text-sm font-medium text-white">
                    {name}
                  </span>
                  <span className="block truncate text-xs text-cyan">
                    {role}
                  </span>
                </span>
                <Avatar
                  name={name}
                  url={me ? (photos[me.id] ?? null) : null}
                  size={36}
                  className="ring-2 ring-white/20"
                />
              </Link>
            )}
          </div>
        </div>
        {me && <MemberNav />}
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-8">
        <PreviewBanner />
        {children}
      </main>
    </div>
  );
}
