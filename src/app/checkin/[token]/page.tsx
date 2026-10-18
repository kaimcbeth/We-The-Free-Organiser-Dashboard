import { createClient } from "@/lib/supabase/server";
import { AttendeeShell } from "@/components/attendee-shell";
import { formatEventDate, formatTimeRange } from "@/lib/time";
import { HelperCheckIn, type HelperState } from "./helper-check-in";

// No-login check-in screen for a helper at the door (shared by an organiser).
export default async function HelperCheckInPage({ params }: PageProps<"/checkin/[token]">) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("helper_checkin_state", { p_token: token });
  const state = data as HelperState | null;

  if (!state || state.status !== "ok") {
    return (
      <AttendeeShell>
        <h1 className="text-2xl font-semibold tracking-tight">This check-in link has ended</h1>
        <p className="mt-2 text-stone-600">
          It may have been turned off, or the event is over. Ask the organiser for a new QR code.
        </p>
      </AttendeeShell>
    );
  }

  const e = state.event;
  return (
    <AttendeeShell right={<span className="text-xs font-medium text-white/75">Check-in helper</span>}>
      <p className="text-sm text-stone-500">
        {formatEventDate(e.starts_at)} · {formatTimeRange(e.starts_at, e.ends_at)}
        {e.venue ? ` · ${e.venue}` : ""}
      </p>
      <h1 className="mt-0.5 text-2xl font-semibold leading-tight tracking-tight">{e.title}</h1>
      <p className="mt-2 text-sm text-stone-600">
        Thanks for helping! Tap a name when someone arrives. Tap again to undo.
      </p>
      <HelperCheckIn token={token} state={state} />
    </AttendeeShell>
  );
}
