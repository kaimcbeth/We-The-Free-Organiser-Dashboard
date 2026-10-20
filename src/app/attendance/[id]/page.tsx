import Link from "next/link";
import { requireCore } from "@/lib/organiser";
import { formatEventDate, formatTimeRange } from "@/lib/time";
import type { HelperState } from "@/app/checkin/[token]/helper-check-in";
import { CoreCheckIn } from "./core-check-in";

export default async function CoreAttendancePage({
  params,
}: PageProps<"/attendance/[id]">) {
  const { id } = await params;
  const { supabase } = await requireCore();
  const { data } = await supabase.rpc("core_checkin_state", { p_event_id: id });
  const state = data as HelperState | null;

  if (!state || state.status !== "ok") {
    return (
      <div>
        <Link
          href="/attendance"
          className="text-sm text-stone-500 hover:text-stone-800"
        >
          ← Events
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          Can&apos;t open this event
        </h1>
        <p className="mt-2 text-stone-600">
          It may be for another community. Ask an organiser if you think this is
          wrong.
        </p>
      </div>
    );
  }

  const e = state.event;
  return (
    <div>
      <Link
        href="/attendance"
        className="text-sm text-stone-500 hover:text-stone-800"
      >
        ← Events
      </Link>
      <p className="mt-2 text-sm text-stone-500">
        {formatEventDate(e.starts_at)} ·{" "}
        {formatTimeRange(e.starts_at, e.ends_at)}
        {e.venue ? ` · ${e.venue}` : ""}
      </p>
      <h1 className="mt-0.5 text-2xl font-semibold leading-tight tracking-tight">
        {e.title}
      </h1>
      <CoreCheckIn eventId={id} state={state} />
    </div>
  );
}
