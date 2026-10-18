"use client";

import { useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { CheckInList, type CheckInPerson } from "@/components/check-in-list";
import type { HelperState } from "@/app/checkin/[token]/helper-check-in";

// Core Team attendance: same list as organisers, saved through Core Team functions (names only).
export function CoreCheckIn({
  eventId,
  state,
}: {
  eventId: string;
  state: HelperState;
}) {
  const supabase = useMemo(() => createClient(), []);

  const onToggle = useCallback(
    async (p: CheckInPerson, here: boolean) => {
      const { data, error } = await supabase.rpc("core_set_checkin", {
        p_event_id: eventId,
        p_person_id: p.id,
        p_here: here,
      });
      return !error && data === true;
    },
    [supabase, eventId],
  );

  const onAdd = useCallback(
    async (first: string, last: string) => {
      const { data, error } = await supabase.rpc("core_add_person", {
        p_event_id: eventId,
        p_first: first,
        p_last: last,
      });
      return error || !data ? null : (data as CheckInPerson);
    },
    [supabase, eventId],
  );

  const onMarkNotNew = useCallback(
    async (p: CheckInPerson) => {
      const { data, error } = await supabase.rpc("core_set_attended_before", {
        p_event_id: eventId,
        p_person_id: p.id,
        p_value: true,
      });
      return !error && data === true;
    },
    [supabase, eventId],
  );

  const poll = useCallback(async () => {
    const { data, error } = await supabase.rpc("core_checkin_state", {
      p_event_id: eventId,
    });
    const s = data as HelperState | null;
    if (error || !s || s.status !== "ok") return null;
    return { people: s.people, checkedIn: s.checked_in };
  }, [supabase, eventId]);

  return (
    <CheckInList
      initialPeople={state.people}
      initialCheckedIn={state.checked_in}
      returningIds={state.returning}
      onToggle={onToggle}
      onAdd={onAdd}
      poll={poll}
      stickyTopClass="top-[64px]"
      isOutreach={state.is_outreach}
      outreachBefore={state.outreach_before ?? {}}
      onMarkNotNew={onMarkNotNew}
      likely={state.likely ?? {}}
    />
  );
}
