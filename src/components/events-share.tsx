"use client";

import { useState } from "react";
import { Sheet } from "@/components/sheet";
import { ShareLink } from "@/components/share-link";

// "Share our events": a link (and QR code) to the community's public list of
// upcoming events, for people without an account.
export function EventsShare({
  slug,
  community,
  label = "Share our events",
  className = "text-sm font-medium text-pink-ink hover:underline",
}: {
  slug: string;
  community: string;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setUrl(
            `${window.location.origin}/upcoming/${encodeURIComponent(slug)}`,
          );
          setOpen(true);
        }}
        className={className}
      >
        {label}
      </button>
      {open && (
        <Sheet title="Share our events" onClose={() => setOpen(false)}>
          <p className="mb-4 text-sm text-stone-600">
            Anyone can open this list of upcoming events. No account needed.
          </p>
          <ShareLink
            url={url}
            title={`We The Free ${community}: upcoming events`}
            text={`What's on next with We The Free ${community}`}
            qrLabel="QR code for our upcoming events"
          />
        </Sheet>
      )}
    </>
  );
}
