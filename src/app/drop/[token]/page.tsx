import { createClient } from "@/lib/supabase/server";
import { AttendeeShell } from "@/components/attendee-shell";
import { DropUploader } from "./drop-uploader";

// Temporary photo upload link (Kai, 5 Nov 2026): an organiser shows a QR
// code from the Photo Hub; anyone can add photos here without logging in
// until the link runs out or is stopped.
export default async function DropPage({ params }: PageProps<"/drop/[token]">) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("photo_drop_info", { p_token: token });
  const info = data as {
    team_id: string;
    event_id: string | null;
    community: string;
    event: string | null;
    expires_at: string;
  } | null;
  if (!info)
    return (
      <AttendeeShell>
        <h1 className="text-3xl font-semibold tracking-tight">
          This link has ended
        </h1>
        <p className="mt-2 text-stone-600">
          Photo links only last a little while. Ask an organiser for a new QR
          code.
        </p>
      </AttendeeShell>
    );
  const community = info.community.split(",")[0].trim();
  return (
    <AttendeeShell>
      <h1 className="text-3xl font-semibold tracking-tight">Add your photos</h1>
      <p className="mt-2 text-stone-600">
        {info.event
          ? `For ${info.event}. They go straight into We The Free ${community}'s Photo Hub.`
          : `They go straight into We The Free ${community}'s Photo Hub.`}{" "}
        Pick as many as you like.
      </p>
      <DropUploader
        token={token}
        teamId={info.team_id}
        eventId={info.event_id}
      />
    </AttendeeShell>
  );
}
