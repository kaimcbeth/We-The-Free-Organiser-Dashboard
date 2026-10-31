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
import { MyEvents, type MyEvent } from "./my-events";
import { EventsShare } from "@/components/events-share";
import { TrainingNudge, type MyTrainings } from "./trainings";

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
  welcome_done_at: string | null;
  team: {
    name: string;
    slug: string;
    whatsapp_url: string | null;
    timezone: string;
    activism_team_url: string | null;
  } | null;
};

export default async function MePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: me }, { data: organiser }] = await Promise.all([
    supabase
      .from("people")
      .select(
        "id, first_name, last_name, phone, suburb, email, consent_marketing, starting_outreach_count, started_on, found_via, found_via_person_id, found_via_note, photo_updated_at, tutorial_done_at, notify_channel, whatsapp_joined_at, welcome_done_at, team:teams!people_team_id_fkey(name, slug, whatsapp_url, timezone, activism_team_url)",
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

  const [myTasks, { data: upcoming }, { data: trainings }] = await Promise.all([
    loadMyTasks(supabase, me.id),
    supabase.rpc("my_upcoming_events"),
    supabase.rpc("my_trainings"),
  ]);
  // eslint-disable-next-line react-hooks/purity -- server component, rendered per request
  const now = Date.now();

  return (
    <>
      <div className="mb-6 empty:hidden">
        <LivePlayers noIntro withToday={me.team?.timezone ?? DEFAULT_TZ} />
      </div>

      {me.team?.whatsapp_url && !me.whatsapp_joined_at && (
        <div className="mb-6">
          <WhatsAppJoin url={me.team.whatsapp_url} hideOnceJoined />
        </div>
      )}

      <section id="coming-up" className="scroll-mt-4">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Coming up
          </h2>
          {me.team?.slug && (
            <EventsShare
              slug={me.team.slug}
              community={me.team.name.replace(/, (Australia|New Zealand)$/, "")}
            />
          )}
        </div>
        <MyEvents
          events={(upcoming as MyEvent[] | null) ?? []}
          tz={me.team?.timezone ?? DEFAULT_TZ}
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

      <TrainingNudge
        data={trainings as MyTrainings | null}
        preview={previewNewMember}
      />

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
        notifyChannel={me.notify_channel ?? "none"}
        hasEmail={!!me.email}
        autoOpen={previewNewMember || !me.tutorial_done_at}
        preview={previewNewMember}
      />
    </>
  );
}
