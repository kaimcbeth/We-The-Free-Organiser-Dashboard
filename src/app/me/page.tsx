import { OriginEditor } from "@/components/origin-editor";
import { cookies } from "next/headers";
import { VIEW_AS_COOKIE } from "@/lib/organiser";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";
import { AttendeeShell } from "@/components/attendee-shell";
import { DEFAULT_TEAM_SLUG } from "@/lib/teams";
import { DEFAULT_TZ, formatEventDate, setRequestTz } from "@/lib/time";
import { ProfileForm } from "./profile-form";
import { PhotoPicker } from "@/components/photo-picker";
import { signPhotos } from "@/lib/photos";
import { NotificationBell } from "@/components/notification-bell";
import { WhatsAppJoin } from "@/components/whatsapp";
import { PreviewBanner } from "@/components/preview-banner";
import { TaskCard } from "@/components/task-card";
import { loadMyTasks } from "@/lib/tasks";
import { MemberTutorial, ReplayTour } from "./member-tutorial";
import {
  BuddySection,
  ReminderSetting,
  type BuddyDashboard,
} from "./buddy-section";
import { MyEvents, type MyEvent } from "./my-events";
import { impact } from "@/lib/impact";

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
  team: {
    name: string;
    whatsapp_url: string | null;
    timezone: string;
    activism_team_url: string | null;
  } | null;
};

type Attended = {
  event: {
    id: string;
    title: string;
    starts_at: string;
    ends_at: string | null;
    event_type: { name: string; counts_as_outreach: boolean } | null;
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
        "id, first_name, last_name, phone, suburb, email, consent_marketing, starting_outreach_count, started_on, found_via, found_via_person_id, found_via_note, photo_updated_at, tutorial_done_at, notify_channel, team:teams!people_team_id_fkey(name, whatsapp_url, timezone, activism_team_url)",
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

  // Hidden while God Mode is previewing as an attendee.
  const viewAs = (await cookies()).get(VIEW_AS_COOKIE)?.value ?? "";
  const previewingAttendee = ["member", "new_member"].includes(viewAs);
  // God Mode "View as New member" runs the tour every time (and saves nothing).
  const previewNewMember = viewAs === "new_member" && !!organiser;
  const staffLink = !!organiser && !previewingAttendee;
  const headerRight = (
    <div className="flex items-center gap-1">
      <NotificationBell supabase={supabase} userId={user.id} />
      {staffLink && (
        <Link
          href="/"
          className="rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10"
        >
          {organiser!.access === "core_team"
            ? "Take attendance"
            : "Organiser view"}
        </Link>
      )}
      <form action={signOut}>
        <button className="rounded-lg px-3 py-2 text-sm text-white/75 hover:bg-white/10 hover:text-white">
          Sign out
        </button>
      </form>
    </div>
  );

  if (!me && organiser) {
    return (
      <AttendeeShell right={headerRight}>
        <PreviewBanner />
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
      </AttendeeShell>
    );
  }

  if (!me) {
    return (
      <AttendeeShell right={headerRight}>
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
      </AttendeeShell>
    );
  }

  const { data: rows } = await supabase
    .from("attendance")
    .select(
      "event:events(id, title, starts_at, ends_at, event_type:event_types(name, counts_as_outreach))",
    )
    .eq("person_id", me.id)
    .returns<Attended[]>();

  const events = (rows ?? [])
    .map((r) => r.event)
    .filter((e): e is NonNullable<Attended["event"]> => !!e)
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  const photos = await signPhotos(supabase, [me]);
  const [
    { data: buddy },
    myTasks,
    { data: crew },
    { data: upcoming },
    { data: outreachToday },
  ] = await Promise.all([
    supabase.rpc("my_buddy_dashboard"),
    loadMyTasks(supabase, me.id),
    supabase.rpc("my_team_crew"),
    supabase.rpc("my_upcoming_events"),
    supabase.rpc("my_outreach_today"),
  ]);
  // eslint-disable-next-line react-hooks/purity -- server component, rendered per request
  const now = Date.now();
  const outreach =
    events.filter((e) => e.event_type?.counts_as_outreach).length +
    me.starting_outreach_count;

  return (
    <AttendeeShell right={headerRight}>
      <PreviewBanner />
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
      <PhotoPicker
        personId={me.id}
        name={[me.first_name, me.last_name].filter(Boolean).join(" ")}
        url={photos[me.id] ?? null}
        size={80}
      />
      <p className="mt-4 text-sm text-stone-500">{me.team?.name}</p>
      <h1 className="text-3xl font-semibold tracking-tight">
        {[me.first_name, me.last_name].filter(Boolean).join(" ")}
      </h1>

      <div className="mt-3">
        <OriginEditor
          self
          personId={me.id}
          initial={{
            started_on: me.started_on,
            found_via: me.found_via,
            found_via_person_id: me.found_via_person_id,
            found_via_note: me.found_via_note,
          }}
          people={(crew as { id: string; name: string }[] | null) ?? []}
        />
      </div>

      {me.team?.whatsapp_url && (
        <div className="mt-6">
          <WhatsAppJoin url={me.team.whatsapp_url} />
        </div>
      )}

      {outreachToday ? (
        <Link
          href="/guide"
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

      {(() => {
        const im = impact(
          events.map((e) => ({
            starts_at: e.starts_at,
            ends_at: e.ends_at,
            outreach: !!e.event_type?.counts_as_outreach,
          })),
          me.starting_outreach_count,
          me.started_on,
          now,
        );
        const sinceLabel = im.since
          ? new Date(im.since + "T12:00:00Z").toLocaleDateString("en-AU", {
              month: "long",
              year: "numeric",
            })
          : null;
        const toNext = im.next ? im.next - im.outreach : 0;
        return (
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
              Your impact
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-navy p-4 text-white">
                <p className="text-3xl font-semibold tabular-nums">
                  {events.length}
                </p>
                <p className="text-sm text-white/75">
                  {events.length === 1 ? "event" : "events"}
                </p>
              </div>
              <div className="rounded-2xl bg-navy p-4 text-white">
                <p className="text-3xl font-semibold tabular-nums text-pink">
                  {outreach}
                </p>
                <p className="text-sm text-white/75">outreach</p>
              </div>
              <div className="rounded-2xl bg-navy p-4 text-white">
                <p className="text-3xl font-semibold tabular-nums text-cyan">
                  {im.hours}
                </p>
                <p className="text-sm text-white/75">
                  {im.hours === 1 ? "hour" : "hours"} at outreach
                </p>
              </div>
            </div>
            <ul className="mt-3 space-y-1.5 text-sm text-stone-700">
              {im.next && (
                <li>
                  <span className="font-semibold text-navy">{toNext} more</span>{" "}
                  outreach {toNext === 1 ? "event" : "events"} to your{" "}
                  {im.next === 1 ? "first" : `${im.next}th`}
                  {im.last ? ` (you passed ${im.last} already)` : ""}.
                </li>
              )}
              {im.streak >= 2 && (
                <li>
                  <span className="font-semibold text-navy">
                    {im.streak} months
                  </span>{" "}
                  in a row with at least one event.
                </li>
              )}
              {sinceLabel && <li>With We The Free since {sinceLabel}.</li>}
            </ul>
            <Link
              href="/me/welcome"
              className="mr-4 mt-3 inline-block text-sm font-medium text-pink-ink hover:underline"
            >
              Welcome to We The Free →
            </Link>
            {!outreachToday && (
              <Link
                href="/guide"
                className="mt-3 inline-block text-sm font-medium text-pink-ink hover:underline"
              >
                Outreach guide →
              </Link>
            )}
          </section>
        );
      })()}

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
        <BuddySection
          data={buddy as BuddyDashboard}
          tz={me.team?.timezone ?? DEFAULT_TZ}
        />
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
          Your events
        </h2>
        {events.length === 0 ? (
          <p className="text-sm text-stone-500">
            Your events will show here once an organiser checks you in.
          </p>
        ) : (
          <ul className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
            {events.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-4 border-b border-black/5 px-4 py-3 last:border-0"
              >
                <div className="w-16 shrink-0 text-sm font-medium text-stone-500">
                  {formatEventDate(e.starts_at)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{e.title}</p>
                  {e.event_type && (
                    <p className="truncate text-sm text-stone-500">
                      {e.event_type.name}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
          Your details
        </h2>
        <ProfileForm me={me} />
      </section>

      <div className="mt-10 text-center">
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
    </AttendeeShell>
  );
}
