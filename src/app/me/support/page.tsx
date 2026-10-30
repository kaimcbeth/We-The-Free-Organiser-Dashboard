import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TZ, setRequestTz } from "@/lib/time";
import { cookies } from "next/headers";
import { VIEW_AS_COOKIE } from "@/lib/organiser";
import { BuddySection, type BuddyDashboard } from "../buddy-section";
import { MicroRoles, type MyMicroRoles } from "./micro-roles";

// How you can help tab: small roles that unlock as you come to more events,
// and the newcomers an organiser has asked you to support.
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
  const [{ data: buddy }, { data: roles }, { data: organiser }] =
    await Promise.all([
      supabase.rpc("my_buddy_dashboard"),
      supabase.rpc("my_micro_roles"),
      supabase.from("organisers").select("id").eq("id", user.id).maybeSingle(),
    ]);
  const viewAs = (await cookies()).get(VIEW_AS_COOKIE)?.value ?? "";
  const preview = viewAs === "new_member" && !!organiser;

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">
        How you can help
      </h1>
      <p className="mt-1 text-stone-600">
        Small ways to help your community. More open up as you come to more
        events. Pick whatever suits you; there&apos;s no pressure.
      </p>
      {roles && <MicroRoles data={roles as MyMicroRoles} preview={preview} />}
      {buddy?.status === "ok" && (
        <BuddySection data={buddy as BuddyDashboard} tz={tz} />
      )}
    </>
  );
}
