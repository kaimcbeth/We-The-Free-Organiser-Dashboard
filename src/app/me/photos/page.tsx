import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AttendeeShell } from "@/components/attendee-shell";
import { PhotoHubView } from "./photo-hub-view";

// Photo Hub for members (and Core Team): browse and download the community's
// photos. Organisers manage them in Resources & Training.
export default async function MemberPhotosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase
    .from("people")
    .select("team_id")
    .eq("user_id", user.id)
    .maybeSingle<{ team_id: string }>();
  if (!me) redirect("/me");
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
      <h1 className="text-3xl font-semibold tracking-tight">Photo Hub</h1>
      <p className="mt-1 text-stone-600">
        Photos from our community. Tap one to see it big and download it.
      </p>
      <div className="mt-5">
        <PhotoHubView teamId={me.team_id} />
      </div>
    </AttendeeShell>
  );
}
