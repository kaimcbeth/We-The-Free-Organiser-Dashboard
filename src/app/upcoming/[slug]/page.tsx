import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AttendeeShell } from "@/components/attendee-shell";
import { AddToCalendar } from "@/components/add-to-calendar";
import { EventsShare } from "@/components/events-share";
import { AccountPrompt } from "@/components/account-prompt";
import { formatEventDate, formatTimeRange } from "@/lib/time";

type PublicEvent = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  venue: string | null;
  address: string | null;
  description: string | null;
  image_url: string | null;
  url: string | null;
};
type Data = {
  team: { name: string; slug: string; timezone: string; url: string | null };
  events: PublicEvent[];
} | null;

const short = (n: string) => n.replace(/, (Australia|New Zealand)$/, "");

async function load(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("public_events", { p_slug: slug });
  return data as Data;
}

export async function generateMetadata({
  params,
}: PageProps<"/upcoming/[slug]">): Promise<Metadata> {
  const data = await load((await params).slug);
  const name = data ? short(data.team.name) : "We The Free";
  return {
    title: `Upcoming events · We The Free ${name}`,
    description: `What's on next with We The Free ${name}. Everyone's welcome.`,
  };
}

// Public list of a community's upcoming events: for sharing with people who
// don't have an account. No login needed.
export default async function UpcomingPage({
  params,
}: PageProps<"/upcoming/[slug]">) {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) notFound();
  const { team, events } = data;
  const tz = team.timezone;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <AttendeeShell community={team.name}>
      <h1 className="text-3xl font-semibold tracking-tight">Upcoming events</h1>
      <p className="mt-1 text-stone-600">
        We The Free {short(team.name)}. Everyone&apos;s welcome, no experience
        needed.
      </p>
      <div className="mt-3">
        <EventsShare
          slug={team.slug}
          community={short(team.name)}
          label="Share this list"
        />
      </div>

      {events.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-500">
          Nothing on the calendar right now. Check back soon.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {events.map((e) => (
            <li
              key={e.id}
              className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
            >
              <p className="text-sm font-semibold text-pink-ink">
                {formatEventDate(e.starts_at, tz)} ·{" "}
                {formatTimeRange(e.starts_at, e.ends_at, tz)}
              </p>
              <h2 className="mt-0.5 text-lg font-semibold">{e.title}</h2>
              {(e.venue || e.address) && (
                <p className="text-sm text-stone-600">
                  {[e.venue, e.address].filter(Boolean).join(", ")}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                {e.url && (
                  <a
                    href={e.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-pink-ink hover:underline"
                  >
                    Details and RSVP ↗
                  </a>
                )}
                <AddToCalendar
                  event={{
                    id: e.id,
                    title: e.title,
                    starts_at: e.starts_at,
                    ends_at: e.ends_at,
                    venue: e.venue,
                    address: e.address,
                    description: e.description,
                    url: e.url,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {!user && (
        <div className="mt-8">
          <AccountPrompt href={`/join/${team.slug}`} />
        </div>
      )}
    </AttendeeShell>
  );
}
