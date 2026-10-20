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
import { BuddySection, type BuddyDashboard } from "./buddy-section";

type Me = {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string | null;
  suburb: string | null;
  email: string | null;
  consent_marketing: boolean;
  starting_outreach_count: number;
  photo_updated_at: string | null;
  team: { name: string; whatsapp_url: string | null; timezone: string } | null;
};

type Attended = {
  event: {
    id: string;
    title: string;
    starts_at: string;
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
        "id, first_name, last_name, phone, suburb, email, consent_marketing, starting_outreach_count, photo_updated_at, team:teams(name, whatsapp_url, timezone)",
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
  const previewingAttendee =
    (await cookies()).get(VIEW_AS_COOKIE)?.value === "member";
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
        <h1 className="text-2xl font-semibold tracking-tight">
          Set up your profile
        </h1>
        <p className="mt-2 text-stone-600">
          You&apos;re an organiser, but you don&apos;t have an attendee profile
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
      "event:events(id, title, starts_at, event_type:event_types(name, counts_as_outreach))",
    )
    .eq("person_id", me.id)
    .returns<Attended[]>();

  const events = (rows ?? [])
    .map((r) => r.event)
    .filter((e): e is NonNullable<Attended["event"]> => !!e)
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  const photos = await signPhotos(supabase, [me]);
  const { data: buddy } = await supabase.rpc("my_buddy_dashboard");
  const outreach =
    events.filter((e) => e.event_type?.counts_as_outreach).length +
    me.starting_outreach_count;

  return (
    <AttendeeShell right={headerRight}>
      <PreviewBanner />
      {welcome && (
        <p className="mb-6 rounded-2xl bg-cyan/20 px-4 py-3 text-sm font-medium text-navy">
          You&apos;re connected. Welcome to We The Free!
        </p>
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

      {me.team?.whatsapp_url && (
        <div className="mt-6">
          <WhatsAppJoin url={me.team.whatsapp_url} />
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-navy p-4 text-white">
          <p className="text-3xl font-semibold tabular-nums">{events.length}</p>
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
      </div>

      {buddy?.status === "ok" && (
        <BuddySection
          data={buddy as BuddyDashboard}
          hasEmail={!!me.email}
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
    </AttendeeShell>
  );
}
