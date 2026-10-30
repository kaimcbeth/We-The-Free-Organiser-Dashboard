import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";
import { DEFAULT_TZ, formatEventDate, setRequestTz } from "@/lib/time";
import { ProfileForm } from "../profile-form";
import { PhotoPicker } from "@/components/photo-picker";
import { OriginEditor } from "@/components/origin-editor";
import { signPhotos } from "@/lib/photos";

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
  team: { name: string; timezone: string } | null;
};

type Attended = {
  event: {
    id: string;
    title: string;
    starts_at: string;
    event_type: { name: string } | null;
  } | null;
};

// Your profile (from the photo in the top corner): photo, how you found us,
// the events you've been to, and your details.
export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase
    .from("people")
    .select(
      "id, first_name, last_name, phone, suburb, email, consent_marketing, starting_outreach_count, started_on, found_via, found_via_person_id, found_via_note, photo_updated_at, team:teams!people_team_id_fkey(name, timezone)",
    )
    .eq("user_id", user.id)
    .maybeSingle<Me>();
  if (!me) redirect("/me");
  setRequestTz(me.team?.timezone ?? DEFAULT_TZ);

  const [{ data: rows }, photos, { data: crew }] = await Promise.all([
    supabase
      .from("attendance")
      .select(
        "event:events(id, title, starts_at, event_type:event_types(name))",
      )
      .eq("person_id", me.id)
      .returns<Attended[]>(),
    signPhotos(supabase, [me]),
    supabase.rpc("my_team_crew"),
  ]);
  const events = (rows ?? [])
    .map((r) => r.event)
    .filter((e): e is NonNullable<Attended["event"]> => !!e)
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  const name = [me.first_name, me.last_name].filter(Boolean).join(" ");

  return (
    <>
      <Link
        href="/me"
        className="text-sm font-medium text-stone-500 hover:text-stone-800 hover:underline"
      >
        ← Events
      </Link>
      <div className="mt-4">
        <PhotoPicker
          personId={me.id}
          name={name}
          url={photos[me.id] ?? null}
          size={80}
        />
      </div>
      <p className="mt-4 text-sm text-stone-500">{me.team?.name}</p>
      <h1 className="text-3xl font-semibold tracking-tight">{name}</h1>
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
                className="flex items-center gap-3 border-b border-black/5 px-4 py-3 last:border-0 sm:gap-4"
              >
                <div className="w-11 shrink-0 text-xs font-medium leading-tight text-stone-500 sm:w-16 sm:text-sm">
                  {formatEventDate(e.starts_at)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-medium leading-snug">
                    {e.title}
                  </p>
                  {e.event_type && (
                    <p className="truncate text-xs text-stone-500 sm:text-sm">
                      {e.event_type.name}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="details" className="mt-8 scroll-mt-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
          Your details
        </h2>
        <ProfileForm me={me} />
      </section>

      <form action={signOut} className="mt-10 text-center">
        <button className="text-sm text-stone-400 hover:text-navy hover:underline">
          Sign out
        </button>
      </form>
    </>
  );
}
