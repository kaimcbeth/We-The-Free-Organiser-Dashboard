"use client";

import { useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { CheckInList, type CheckInPerson } from "@/components/check-in-list";

export type HelperState = {
  status: "ok" | "inactive";
  event: { id: string; title: string; starts_at: string; ends_at: string | null; venue: string | null };
  people: CheckInPerson[];
  checked_in: string[];
  returning: string[];
  is_outreach: boolean;
  outreach_before: Record<string, number>;
};

export function HelperCheckIn({ token, state }: { token: string; state: HelperState }) {
  const supabase = useMemo(() => createClient(), []);

  const onToggle = useCallback(
    async (p: CheckInPerson, here: boolean) => {
      const { data, error } = await supabase.rpc("helper_set_checkin", {
        p_token: token,
        p_person_id: p.id,
        p_here: here,
      });
      return !error && data === true;
    },
    [supabase, token],
  );

  const onAdd = useCallback(
    async (first: string, last: string) => {
      const { data, error } = await supabase.rpc("helper_add_person", { p_token: token, p_first: first, p_last: last });
      return error || !data ? null : (data as CheckInPerson);
    },
    [supabase, token],
  );

  const poll = useCallback(async () => {
    const { data, error } = await supabase.rpc("helper_checkin_state", { p_token: token });
    const s = data as HelperState | null;
    if (error || !s || s.status !== "ok") return null;
    return { people: s.people, checkedIn: s.checked_in };
  }, [supabase, token]);

  return (
    <CheckInList
      initialPeople={state.people}
      initialCheckedIn={state.checked_in}
      returningIds={state.returning}
      onToggle={onToggle}
      onAdd={onAdd}
      poll={poll}
      stickyTopClass="top-0"
      isOutreach={state.is_outreach}
      outreachBefore={state.outreach_before ?? {}}
    />
  );
}
