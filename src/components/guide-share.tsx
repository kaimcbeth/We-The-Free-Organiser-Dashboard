"use client";

import { useState } from "react";
import { Sheet } from "@/components/sheet";
import { ShareLink } from "@/components/share-link";

// "Show a newcomer": a QR code for the Outreach guide that also invites them
// to create an account with this community.
export function GuideShare({
  slug,
  label = "Show a newcomer the QR code",
  className = "text-sm font-medium text-stone-500 hover:text-stone-800 hover:underline",
}: {
  slug: string;
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
            `${window.location.origin}/guide?c=${encodeURIComponent(slug)}`,
          );
          setOpen(true);
        }}
        className={className}
      >
        {label}
      </button>
      {open && (
        <Sheet title="Outreach guide" onClose={() => setOpen(false)}>
          <p className="mb-4 text-sm text-stone-600">
            They scan it to open the questions on their phone. No login needed,
            and it invites them to create an account.
          </p>
          <ShareLink
            url={url}
            title="Outreach guide"
            text="The outreach questions, for between conversations"
            qrLabel="QR code for the Outreach guide"
          />
        </Sheet>
      )}
    </>
  );
}
