"use client";

import { useState, useTransition } from "react";
import { createHelperLink, revokeHelperLinks, type HelperLink } from "@/app/actions";
import { ShareLink } from "@/components/share-link";
import { formatEventDate, formatTime } from "@/lib/time";

export function HelperLinkSheet({ eventId, initial }: { eventId: string; initial: HelperLink | null }) {
  const [link, setLink] = useState<HelperLink | null>(initial);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  if (!link) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-stone-600">
          Let someone else do check-in, like a volunteer at the door. They scan a QR code and can tick people in
          straight away, with no login.
        </p>
        <ul className="space-y-1.5 text-sm text-stone-600">
          <li>• Works for this event only, and stops a few hours after it ends</li>
          <li>• They see names only: no photos, contact details or other pages</li>
          <li>• You can turn it off any time</li>
        </ul>
        <button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await createHelperLink(eventId);
              if (r.link) setLink(r.link);
              else setError(r.error ?? "Something went wrong.");
            })
          }
          className="w-full rounded-xl bg-pink px-4 py-3 font-semibold text-navy hover:bg-pink-strong disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create check-in link"}
        </button>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600">
        Anyone who scans this can check people in for this event, until{" "}
        <span className="font-medium text-stone-900">
          {formatTime(link.expires_at)} {formatEventDate(link.expires_at)}
        </span>
        .
      </p>
      <ShareLink
        url={`${window.location.origin}/checkin/${link.token}`}
        title="Help with check-in"
        text="Here's the link to help check people in at today's We The Free event:"
        qrLabel="Check-in helper QR code"
      />
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await revokeHelperLinks(eventId);
            if (r.error) setError(r.error);
            else setLink(null);
          })
        }
        className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-60"
      >
        {pending ? "Turning off…" : "Turn off this link"}
      </button>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
