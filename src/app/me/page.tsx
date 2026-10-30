import { LivePlayers } from "@/components/live-players";
import { cookies } from "next/headers";
import { VIEW_AS_COOKIE } from "@/lib/organiser";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TEAM_SLUG } from "@/lib/teams";
import { DEFAULT_TZ, setRequestTz } from "@/lib/time";
import { WhatsAppJoin } from "@/components/whatsapp";
import { TaskCard } from "@/components/task-card";
import { loadMyTasks } from "@/lib/tasks";
import { MemberTutorial, ReplayTour } from "./member-tutorial";
import { ReminderSetting, type BuddyDashboard } from "./buddy-section";
import { MyEvents, type MyEvent } from "./my-events";

type Me = {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string | null;
  suburb: string | null;
  email: string | null;
  consent_marketing: boolean;
  starting_outreach_count: number;
  started_on: string | null;
  found_via: string | null;
  found_via_person_id: string | null;
  found_via_note: string | null;
  photo_updated_at: string | null;
  tutorial_done_at: string | null;
  notify_channel: "none" | "email" | "push";
  whatsapp_joined_at: string | null;
  team: {
    name: string;
    whatsapp_url: string | null;
    timezone: string;
    activism_team_url: string | null;
  } | null;
};

export default async function MePage({ searchParams }: PageProps<"/me">) {
  const { welcome } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: me }, { data: organiser }] = await Promise.all([
    supabase
      .from("people")
      .select(
        "id, first_name, last_name, phone, suburb, email, consent_marketing, starting_outreach_count, started_on, found_via, found_via_person_id, found_via_note, photo_updated_at, tutorial_done_at, notify_channel, whatsapp_joined_at, team:teams!people_team_id_fkey(name, whatsapp_url, timezone, activism_team_url)",
      )
      .eq("user_id", user.id)
      .maybeSingle<Me>(),
    supabase
      .from("organisers")
      .select("id, access")
      .eq("id", user.id)
      .maybeSingle(),
  ]);
  setRequestTz(me?.team?.timezone);

  const viewAs = (await cookies()).get(VIEW_AS_COOKIE)?.value ?? "";
  // God Mode "View as New member" runs the tour every time (and saves nothing).
  const previewNewMember = viewAs === "new_member" && !!organiser;

  if (!me && organiser) {
    return (
      <>
        <h1 className="text-2xl font-semibold tracking-tight">
          Set up your profile
        </h1>
        <p className="mt-2 text-stone-600">
          You&apos;re an organiser, but you don&apos;t have a member profile
          yet. Add one to put your photo in the corner and show up in check-in
          lists like everyone else.
        </p>
        <Link
          href={`/join/${DEFAULT_TEAM_SLUG}`}
          className="mt-6 inline-block rounded-xl bg-pink px-5 py-3 font-semibold text-navy hover:bg-pink-strong"
        >
          Create my profile
        </Link>
      </>
    );
  }

  if (!me) {
    return (
      <>
        <h1 className="text-2xl font-semibold tracking-tight">
          You&apos;re logged in
        </h1>
        <p className="mt-2 text-stone-600">
          <span className="font-medium text-stone-900">{user.email}</span>{" "}
          isn&apos;t connected to a profile yet.
        </p>
        <ul className="mt-4 space-y-2 text-stone-700">
          <li>
            <span className="font-medium">Been to an event already?</span> Ask
            an organiser to show you your connect QR code.
          </li>
          <li>
            <span className="font-medium">New to We The Free?</span>{" "}
            <Link
              href={`/join/${DEFAULT_TEAM_SLUG}`}
              className="font-medium text-pink-ink"
            >
              Join here
            </Link>
            .
          </li>
        </ul>
      </>
    );
  }

  const [
    { data: buddy },
    myTasks,
    { data: upcoming },
    { data: outreachToday },
  ] = await Promise.all([
    supabase.rpc("my_buddy_dashboard"),
    loadMyTasks(supabase, me.id),
    supabase.rpc("my_upcoming_events"),
    supabase.rpc("my_outreach_today"),
  ]);
  // eslint-disable-next-line react-hooks/purity -- server component, rendered per request
  const now = Date.now();

  return (
    <>
      <div className="mb-6 empty:hidden">
        <LivePlayers />
      </div>
      {welcome && (
        <Link
          href="/me/welcome"
          className="mb-6 block rounded-2xl bg-pink p-4 text-navy shadow-sm hover:bg-pink-strong"
        >
          <span className="block text-lg font-semibold">
            You&apos;re connected. Welcome to We The Free!
          </span>
          <span className="text-sm">
            Start here: who we are, what we stand for and your first event (2
            minutes) →
          </span>
        </Link>
      )}
      {me.team?.whatsapp_url && !me.whatsapp_joined_at && (
        <div className="mb-6">
          <WhatsAppJoin url={me.team.whatsapp_url} hideOnceJoined />
        </div>
      )}

      {outreachToday ? (
        <Link
          href="/me/guide"
          className="mt-6 block rounded-2xl bg-pink p-4 text-navy shadow-sm hover:bg-pink-strong"
        >
          <span className="block text-lg font-semibold">
            Out on outreach today? Outreach guide →
          </span>
          <span className="text-sm">
            Ten seconds between conversations: how it went, a quick refresher,
            and one thing to focus on next.
          </span>
        </Link>
      ) : null}

      <div className="mt-6">
        <Link
          href="/me/welcome"
          className="inline-block text-sm font-medium text-pink-ink hover:underline"
        >
          Welcome to We The Free →
        </Link>
      </div>

      <section id="coming-up" className="mt-8 scroll-mt-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
          Coming up
        </h2>
        <MyEvents
          events={(upcoming as MyEvent[] | null) ?? []}
          tz={me.team?.timezone ?? DEFAULT_TZ}
        />
        <ReminderSetting
          initial={me.notify_channel ?? "none"}
          hasEmail={!!me.email}
          intro="If you're going, we'll remind you the day before. You'll always see it in the app (the bell). Also send it by:"
        />
      </section>

      {myTasks.length > 0 && (
        <section id="tasks" className="mt-8 scroll-mt-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
            Your actions
          </h2>
          <ul className="space-y-3">
            {myTasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                tz={me.team?.timezone ?? DEFAULT_TZ}
                now={now}
                whatsappUrl={me.team?.whatsapp_url ?? null}
              />
            ))}
          </ul>
        </section>
      )}

      {buddy?.status === "ok" && (
        <Link
          href="/me/support"
          className="mt-8 block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 hover:ring-pink"
        >
          <span className="block font-semibold">
            You&apos;re supporting a new member
          </span>
          <span className="text-sm text-stone-600">
            See who and how to help in How you can help →
          </span>
        </Link>
      )}

      <div className="mt-10 flex items-center justify-center gap-4">
        <ReplayTour />
      </div>
      <MemberTutorial
        firstName={me.first_name}
        teamName={(me.team?.name ?? "").replace(
          /, (Australia|New Zealand)$/,
          "",
        )}
        whatsappUrl={me.team?.whatsapp_url ?? null}
        autoOpen={previewNewMember || !me.tutorial_done_at}
        preview={previewNewMember}
      />
    </>
  );
}
