"use client";

import { useState } from "react";
import { Sheet } from "@/components/sheet";
import { ShareLink } from "@/components/share-link";
import { createClient } from "@/lib/supabase/client";

// God / RSL: a one-use link that makes whoever opens it an organiser of this
// community, account and all (Kai, 6 Nov 2026; 0213 create_role_invite).
export function OrganiserInviteLink({
  teamId,
  community,
}: {
  teamId: string;
  community: string;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function make() {
    setBusy(true);
    setError("");
    const { data, error: e } = await createClient().rpc("create_role_invite", {
      p_team: teamId,
      p_access: "organiser",
    });
    setBusy(false);
    if (e || !data) {
      setError("Couldn't make a link. Try again in a moment.");
      return;
    }
    setUrl(`${window.location.origin}/start/${data}`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-pink-ink hover:underline"
      >
        Invite a new organiser
      </button>
      {open && (
        <Sheet
          title="Invite a new organiser"
          onClose={() => {
            setOpen(false);
            setUrl("");
          }}
        >
          <div className="space-y-4">
            <p className="text-sm text-stone-600">
              A link for one person. They make an account with their email, add
              their name and become an organiser for {community}. It works once
              and lasts 14 days.
            </p>
            {url ? (
              <ShareLink
                url={url}
                title="Your Movement Hub invite"
                text={`Here's your link to join the Movement Hub as an organiser for We The Free ${community}:`}
                qrLabel="Scan to join as an organiser"
              />
            ) : (
              <button
                type="button"
                onClick={make}
                disabled={busy}
                className="rounded-xl bg-pink px-4 py-2 text-sm font-semibold text-navy hover:bg-pink-strong disabled:opacity-60"
              >
                {busy ? "Making the link…" : "Make the link"}
              </button>
            )}
            {error && <p className="text-sm text-red-700">{error}</p>}
          </div>
        </Sheet>
      )}
    </>
  );
}
