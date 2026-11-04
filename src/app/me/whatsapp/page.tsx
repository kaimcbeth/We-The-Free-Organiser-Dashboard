import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { VIEW_AS_COOKIE } from "@/lib/organiser";
import { WhatsAppGuidelines } from "./guidelines";

// Join the WhatsApp community (Kai, 4 Nov 2026): opened from "Join WhatsApp"
// in the members' top bar. Content in ./guidelines.tsx.
export default async function JoinWhatsAppPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase
    .from("people")
    .select("team:teams!people_team_id_fkey(name, whatsapp_url)")
    .eq("user_id", user.id)
    .maybeSingle<{
      team: { name: string; whatsapp_url: string | null } | null;
    }>();
  const community = (me?.team?.name ?? "").replace(
    /, (Australia|New Zealand)$/,
    "",
  );
  const url = me?.team?.whatsapp_url ?? null;

  // God Mode "View as New member": show it as new, save nothing.
  const preview = (await cookies()).get(VIEW_AS_COOKIE)?.value === "new_member";

  return (
    <WhatsAppGuidelines community={community} url={url} preview={preview} />
  );
}
