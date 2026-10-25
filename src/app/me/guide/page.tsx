import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AttendeeShell } from "@/components/attendee-shell";
import { OutreachGuide, type Reflection } from "@/components/outreach-guide";

// The Outreach guide: for between conversations at outreach.
export default async function GuidePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("people")
    .select("id, team_id")
    .eq("user_id", user.id)
    .maybeSingle<{ id: string; team_id: string }>();

  const since = new Date(
    // eslint-disable-next-line react-hooks/purity -- server component, rendered per request
    Date.now() - 12 * 36e5,
  ).toISOString();
  const [{ data: today }, { data: eventId }] = me
    ? await Promise.all([
        supabase
          .from("outreach_reflections")
          .select("id, outcome, stuck, objection, created_at")
          .eq("person_id", me.id)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .returns<Reflection[]>(),
        supabase.rpc("my_outreach_today"),
      ])
    : [{ data: [] as Reflection[] }, { data: null }];

  return (
    <AttendeeShell
      right={
        <Link
          href="/me"
          className="rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10"
        >
          Back
        </Link>
      }
    >
      <h1 className="text-3xl font-semibold tracking-tight">Outreach guide</h1>
      <p className="mt-1 text-stone-600">
        For between conversations, not during them. Ten seconds after each chat,
        then back out there.
      </p>
      <div className="mt-5">
        <OutreachGuide
          personId={me?.id ?? null}
          teamId={me?.team_id ?? null}
          eventId={(eventId as string | null) ?? null}
          today={today ?? []}
        />
      </div>
    </AttendeeShell>
  );
}
