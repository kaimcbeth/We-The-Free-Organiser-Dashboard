"use client";

import { useCallback, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Sheet } from "@/components/sheet";
import { ConnectInvite } from "@/components/connect-invite";
import { ShareLink } from "@/components/share-link";
import { CheckInList, type CheckInPerson } from "@/components/check-in-list";
import { HelperLinkSheet } from "./helper-link-sheet";
import { WhatsAppShare } from "@/components/whatsapp";

export type Person = CheckInPerson;

// Organiser's check-in screen: the shared list, plus connect QR, sign-up QR
// and the "share check-in" helper link.
export function CheckIn({
  eventId,
  teamId,
  organiserId,
  initialPeople,
  initialCheckedIn,
  returningIds,
  teamSlug,
  photos,
  helperLink,
  isOutreach,
  outreachBefore,
  likely,
  whatsappUrl,
  tz,
}: {
  eventId: string;
  teamId: string;
  teamSlug: string;
  photos: Record<string, string>;
  organiserId: string;
  initialPeople: Person[];
  initialCheckedIn: string[];
  returningIds: string[];
  helperLink: { token: string; expires_at: string } | null;
  isOutreach: boolean;
  outreachBefore: Record<string, number>;
  likely: Record<string, number>;
  whatsappUrl: string | null;
  tz: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [justAdded, setJustAdded] = useState<Person | null>(null);
  const [qrTab, setQrTab] = useState<"signup" | "whatsapp">("signup");
  const [sheet, setSheet] = useState<null | "connect" | "signup" | "helper">(
    null,
  );

  const onToggle = useCallback(
    async (p: Person, here: boolean) => {
      const { error } = here
        ? await supabase.from("attendance").upsert({
            event_id: eventId,
            person_id: p.id,
            checked_in_by: organiserId,
          })
        : await supabase
            .from("attendance")
            .delete()
            .eq("event_id", eventId)
            .eq("person_id", p.id);
      return !error;
    },
    [supabase, eventId, organiserId],
  );

  const onAdd = useCallback(
    async (first: string, last: string) => {
      const { data, error } = await supabase
        .from("people")
        .insert({
          team_id: teamId,
          first_name: first,
          last_name: last || null,
          added_via: "host",
        })
        .select("id, first_name, last_name")
        .single<Person>();
      if (error || !data) return null;
      await supabase.from("attendance").insert({
        event_id: eventId,
        person_id: data.id,
        checked_in_by: organiserId,
      });
      return data;
    },
    [supabase, teamId, eventId, organiserId],
  );

  const onMarkNotNew = useCallback(
    async (p: Person) => {
      const { error } = await supabase
        .from("people")
        .update({ attended_before_app: true })
        .eq("id", p.id);
      return !error;
    },
    [supabase],
  );

  const poll = useCallback(async () => {
    const [people, attendance] = await Promise.all([
      supabase
        .from("people")
        .select("id, first_name, last_name")
        .eq("team_id", teamId),
      supabase.from("attendance").select("person_id").eq("event_id", eventId),
    ]);
    if (people.error || attendance.error) return null;
    return {
      people: people.data as Person[],
      checkedIn: attendance.data.map((a) => a.person_id as string),
    };
  }, [supabase, teamId, eventId]);

  return (
    <CheckInList
      initialPeople={initialPeople}
      initialCheckedIn={initialCheckedIn}
      returningIds={returningIds}
      photos={photos}
      onToggle={onToggle}
      onAdd={onAdd}
      onAdded={setJustAdded}
      poll={poll}
      isOutreach={isOutreach}
      outreachBefore={outreachBefore}
      onMarkNotNew={onMarkNotNew}
      likely={likely}
      toolbarExtra={
        <>
          <button
            onClick={() => setSheet("helper")}
            className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-stone-600 hover:bg-black/5"
          >
            Share
          </button>
          <button
            onClick={() => setSheet("signup")}
            className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-stone-600 hover:bg-black/5"
          >
            QR codes
          </button>
        </>
      }
    >
      {justAdded && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl bg-navy p-4 text-white">
          <p className="min-w-0 flex-1 text-sm">
            <span className="font-semibold">{justAdded.first_name}</span> added
            and checked in. Want them to connect an account?
          </p>
          <button
            onClick={() => setSheet("connect")}
            className="shrink-0 rounded-xl bg-pink px-3.5 py-2 text-sm font-semibold text-navy hover:bg-pink-strong"
          >
            Show QR
          </button>
          <button
            onClick={() => setJustAdded(null)}
            aria-label="Dismiss"
            className="shrink-0 rounded-lg px-2 py-1 text-white/70 hover:bg-white/10"
          >
            ✕
          </button>
        </div>
      )}

      {sheet === "connect" && justAdded && (
        <Sheet
          title={`Connect ${justAdded.first_name}`}
          onClose={() => setSheet(null)}
        >
          <ConnectInvite
            personId={justAdded.id}
            firstName={justAdded.first_name}
          />
        </Sheet>
      )}

      {sheet === "signup" && (
        <Sheet title="QR codes" onClose={() => setSheet(null)}>
          <div className="mb-4 flex gap-1 rounded-lg bg-black/5 p-0.5 text-sm">
            {(["signup", "whatsapp"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setQrTab(t)}
                className={`flex-1 rounded-md px-3 py-1.5 ${qrTab === t ? "bg-white font-medium shadow-sm" : "text-stone-600"}`}
              >
                {t === "signup" ? "Sign up" : "WhatsApp"}
              </button>
            ))}
          </div>
          {qrTab === "whatsapp" ? (
            <WhatsAppShare initial={whatsappUrl} />
          ) : (
            <>
              <p className="mb-4 text-sm text-stone-600">
                For anyone who hasn&apos;t been added yet. They scan it, sign
                up, and appear in your list. If you&apos;ve already added them,
                use their own connect QR from the People page instead.
              </p>
              <ShareLink
                url={`${window.location.origin}/join/${teamSlug}`}
                title="Join We The Free"
                text="Sign up to We The Free so we can keep you in the loop:"
                qrLabel="Sign-up QR code"
              />
            </>
          )}
        </Sheet>
      )}

      {sheet === "helper" && (
        <Sheet title="Share check-in" onClose={() => setSheet(null)}>
          <HelperLinkSheet eventId={eventId} initial={helperLink} tz={tz} />
        </Sheet>
      )}
    </CheckInList>
  );
}
