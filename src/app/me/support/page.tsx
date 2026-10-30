import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TZ, setRequestTz } from "@/lib/time";
import { BuddySection, type BuddyDashboard } from "../buddy-section";

// How you can help tab: ways to help out. For now, the newcomers an organiser
// has asked you to support (more small roles to come).
export default async function SupportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase
    .from("people")
    .select("id, team:teams!people_team_id_fkey(timezone)")
    .eq("user_id", user.id)
    .maybeSingle<{ id: string; team: { timezone: string } | null }>();
  if (!me) redirect("/me");
  const tz = me.team?.timezone ?? DEFAULT_TZ;
  setRequestTz(tz);
  const { data: buddy } = await supabase.rpc("my_buddy_dashboard");

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">
        How you can help
      </h1>
      <p className="mt-1 text-stone-600">
        Small ways to help your community. Right now: helping someone new feel
        welcome. Say hi, invite them to the next event, and look out for them
        when they come.
      </p>
      {buddy?.status === "ok" ? (
        <BuddySection data={buddy as BuddyDashboard} tz={tz} />
      ) : (
        <p className="mt-6 rounded-2xl border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-500">
          No one to support right now. When an organiser asks you to support a
          new member, they&apos;ll show here.
        </p>
      )}
    </>
  );
}
