"use client";

import { useState } from "react";
import { Sheet } from "@/components/sheet";
import { formatEventDate, formatTimeRange } from "@/lib/time";

export type FbEventDetails = {
  title: string;
  startsAt: string;
  endsAt: string | null;
  venue: string | null;
  address: string | null;
  description: string | null;
  url: string | null;
};

// Facebook doesn't let apps create events, so this makes it a quick
// copy-and-paste: each field has its own Copy button, then open Facebook.
export function FacebookEventButton({
  event,
  tz,
  className,
}: {
  event: FbEventDetails;
  tz: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const location = [event.venue, event.address]
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(", ");
  const details = [
    event.description?.trim() ?? "",
    event.url && !event.description?.includes(event.url)
      ? `More info & RSVP: ${event.url}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "rounded-xl bg-[#1877F2] px-3 py-1.5 text-sm font-semibold text-white hover:brightness-95"
        }
      >
        Make Facebook event
      </button>
      {open && (
        <Sheet title="Make a Facebook event" onClose={() => setOpen(false)}>
          <p className="mb-3 text-sm text-stone-600">
            Copy each part, then paste it into Facebook&apos;s event form.
          </p>
          <ul className="space-y-2">
            <CopyRow label="Event name" value={event.title} />
            <li className="rounded-xl bg-stone-50 px-3 py-2 ring-1 ring-black/5">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                Date and time (pick these in Facebook)
              </p>
              <p className="mt-0.5 text-sm font-medium">
                {formatEventDate(event.startsAt, tz)},{" "}
                {formatTimeRange(event.startsAt, event.endsAt, tz)}
              </p>
            </li>
            {location && <CopyRow label="Location" value={location} />}
            {details && <CopyRow label="Details" value={details} clamp />}
          </ul>
          <a
            href="https://www.facebook.com/events/create/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 block w-full rounded-xl bg-[#1877F2] px-4 py-2.5 text-center text-sm font-semibold text-white hover:brightness-95"
          >
            Open Facebook ↗
          </a>
          <p className="mt-2 text-xs text-stone-500">
            Choose the community&apos;s page as the host if you manage it.
          </p>
        </Sheet>
      )}
    </>
  );
}

function CopyRow({
  label,
  value,
  clamp = false,
}: {
  label: string;
  value: string;
  clamp?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <li className="flex items-start gap-3 rounded-xl bg-stone-50 px-3 py-2 ring-1 ring-black/5">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          {label}
        </p>
        <p
          className={`mt-0.5 whitespace-pre-line text-sm ${clamp ? "line-clamp-3" : ""}`}
        >
          {value}
        </p>
      </div>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            /* clipboard blocked: the text is still there to select */
          }
        }}
        className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 ${
          copied
            ? "bg-cyan text-navy ring-cyan"
            : "bg-white text-navy ring-stone-300 hover:bg-stone-100"
        }`}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </li>
  );
}
