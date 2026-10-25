"use client";

import { useState } from "react";
import { Sheet } from "@/components/sheet";
import {
  getAttendeesList,
  getInviteList,
  getNewcomersList,
  getQuietList,
  getRegularsList,
} from "@/app/actions";
import { InviteList } from "@/app/invites/[id]/invite-list";
import type { Invite } from "@/lib/invites";

// Message lists in a pop-up: "Message regulars" on the Set-up team action,
// and "Open invite list" on Personal invites sent.
export function RegularsSheet({
  eventId,
  className,
  invites = false,
  newcomers = false,
  quietTeamId,
  thanks = false,
}: {
  eventId: string;
  className?: string;
  invites?: boolean; // the personal invite list instead of all regulars
  newcomers?: boolean; // the community's newcomers
  quietTeamId?: string; // people not seen in a while (eventId = a key for ticks)
  thanks?: boolean; // everyone who came, to thank them
}) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Invite[] | null>(null);

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={async () => {
          setOpen(true);
          // Fresh each time, so ticks from last time show.
          setList(null);
          setList(
            (quietTeamId
              ? await getQuietList(quietTeamId)
              : thanks
                ? await getAttendeesList(eventId)
                : await (
                    invites
                      ? getInviteList
                      : newcomers
                        ? getNewcomersList
                        : getRegularsList
                  )(eventId)
            )?.invites ?? [],
          );
        }}
      >
        {quietTeamId
          ? "Message them"
          : thanks
            ? "Thank everyone"
            : invites
              ? "Open invite list"
              : newcomers
                ? "Message newcomers"
                : "Message regulars"}
      </button>
      {open && (
        <Sheet
          title={
            invites
              ? "Personal invites"
              : newcomers
                ? "Newcomers"
                : quietTeamId
                  ? "Quiet volunteers"
                  : thanks
                    ? "Thank everyone who came"
                    : "Set-up team"
          }
          onClose={() => setOpen(false)}
        >
          <p className="text-sm text-stone-600">
            {thanks
              ? "A quick personal thanks goes a long way, especially for first-timers. Open a chat, write your own message, then tick them off."
              : quietTeamId
                ? "A friendly hello, no pressure. Open a chat, write your own message, then tick them off."
                : invites || newcomers
                  ? "Open a chat with WhatsApp or Messenger, write your own message, then tick them off."
                  : "Ask your regulars who can help set up and pack down. Open a chat, write your own message, then tick them off."}
          </p>
          {list ? (
            <InviteList
              eventId={thanks ? `thanks-${eventId}` : eventId}
              invites={list}
              local={!invites}
              empty={
                thanks
                  ? "Nobody's checked in to this event yet, or nobody who came wants messages."
                  : undefined
              }
            />
          ) : (
            <p className="mt-4 text-sm text-stone-500">Loading…</p>
          )}
        </Sheet>
      )}
    </>
  );
}
