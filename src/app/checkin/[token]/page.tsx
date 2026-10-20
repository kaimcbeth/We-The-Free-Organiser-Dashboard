import { createClient } from "@/lib/supabase/server";
import { AttendeeShell } from "@/components/attendee-shell";
import {
  formatEventDate,
  formatTime,
  formatTimeRange,
  setRequestTz,
} from "@/lib/time";
import { HelperCheckIn, type HelperState } from "./helper-check-in";

// No-login check-in screen for a helper at the door (shared by an organiser).
export default async function HelperCheckInPage({
  params,
}: PageProps<"/checkin/[token]">) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("helper_checkin_state", {
    p_token: token,
  });
  const state = data as HelperState | null;
  setRequestTz((state as { timezone?: string } | null)?.timezone);

  if (state?.status === "no_event") {
    const next = (
      state as unknown as {
        next_event: { title: string; starts_at: string } | null;
      }
    ).next_event;
    return (
      <AttendeeShell
        right={
          <span className="text-xs font-medium text-white/75">
            Taking attendance
          </span>
        }
      >
        <h1 className="text-2xl font-semibold tracking-tight">
          No event today
        </h1>
        <p className="mt-2 text-stone-600">
          This link opens the day&apos;s event automatically. Keep it handy and
          scan it again on the day.
        </p>
        {next && (
          <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-black/5">
            Next up: <span className="font-medium">{next.title}</span>,{" "}
            {formatEventDate(next.starts_at)} at {formatTime(next.starts_at)}
          </p>
        )}
      </AttendeeShell>
    );
  }

  if (!state || state.status !== "ok") {
    return (
      <AttendeeShell>
        <h1 className="text-2xl font-semibold tracking-tight">
          This attendance link has ended
        </h1>
        <p className="mt-2 text-stone-600">
          It may have been turned off, or the event is over. Ask the organiser
          for a new QR code.
        </p>
      </AttendeeShell>
    );
  }

  const e = state.event;
  return (
    <AttendeeShell
      right={
        <span className="text-xs font-medium text-white/75">
          Taking attendance
        </span>
      }
    >
      <p className="text-sm text-stone-500">
        {formatEventDate(e.starts_at)} ·{" "}
        {formatTimeRange(e.starts_at, e.ends_at)}
        {e.venue ? ` · ${e.venue}` : ""}
      </p>
      <h1 className="mt-0.5 text-2xl font-semibold leading-tight tracking-tight">
        {e.title}
      </h1>
      <p className="mt-2 text-sm text-stone-600">
        Thanks for helping! Tap a name when someone arrives. Tap again to undo.
      </p>
      <HelperCheckIn token={token} state={state} />
    </AttendeeShell>
  );
}
