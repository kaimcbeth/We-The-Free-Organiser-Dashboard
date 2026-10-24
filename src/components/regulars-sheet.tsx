"use client";

import { useState } from "react";
import { Sheet } from "@/components/sheet";
import {
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
}: {
  eventId: string;
  className?: string;
  invites?: boolean; // the personal invite list instead of all regulars
  newcomers?: boolean; // the community's newcomers
  quietTeamId?: string; // people not seen in a while (eventId = a key for ticks)
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
          if (!list)
            setList(
              (quietTeamId
                ? await getQuietList(quietTeamId)
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
                : "Set-up team"
          }
          onClose={() => setOpen(false)}
        >
          <p className="text-sm text-stone-600">
            {quietTeamId
              ? "A friendly hello, no pressure. Open a chat, write your own message, then tick them off."
              : invites || newcomers
                ? "Open a chat with WhatsApp or Messenger, write your own message, then tick them off."
                : "Ask your regulars who can help set up and pack down. Open a chat, write your own message, then tick them off."}
          </p>
          {list ? (
            <InviteList eventId={eventId} invites={list} local={!invites} />
          ) : (
            <p className="mt-4 text-sm text-stone-500">Loading…</p>
          )}
        </Sheet>
      )}
    </>
  );
}
