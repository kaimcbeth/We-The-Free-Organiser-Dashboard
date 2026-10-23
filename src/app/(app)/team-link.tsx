"use client";

import { useState, useTransition } from "react";
import { createTeamLink, revokeTeamLinks, type TeamLink } from "@/app/actions";
import { Sheet } from "@/components/sheet";
import { ShareLink } from "@/components/share-link";
import { formatEventDate, formatTime } from "@/lib/time";

const LENGTHS = [
  { value: "today", label: "Today" },
  { value: "month", label: "1 month" },
  { value: "3months", label: "3 months" },
] as const;

// "Attendance QR": one link a helper keeps that always opens today's event.
export function TeamLinkButton({
  initial,
  tz,
}: {
  initial: TeamLink | null;
  tz: string;
}) {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState<TeamLink | null>(initial);
  const [length, setLength] =
    useState<(typeof LENGTHS)[number]["value"]>("month");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  return (
    <>
      <button
        data-tour="helper-qr"
        onClick={() => setOpen(true)}
        className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-navy ring-1 ring-stone-300 hover:bg-stone-50"
      >
        Helper QR{link ? " ●" : ""}
      </button>
      {open && (
        <Sheet title="Attendance helper QR" onClose={() => setOpen(false)}>
          {!link ? (
            <div className="space-y-4">
              <p className="text-sm text-stone-600">
                Give a trusted volunteer one QR code. Whenever they scan it, it
                opens straight to that day&apos;s event so they can take
                attendance. No login, no picking an event.
              </p>
              <ul className="space-y-1.5 text-sm text-stone-600">
                <li>• On days with no event, it shows nothing</li>
                <li>• Names only: no photos, contact details or other pages</li>
                <li>• You can turn it off any time</li>
              </ul>
              <div>
                <p className="mb-2 text-sm font-medium">Works for</p>
                <div
                  className="grid grid-cols-3 gap-2"
                  role="radiogroup"
                  aria-label="How long the link works"
                >
                  {LENGTHS.map((l) => (
                    <button
                      key={l.value}
                      type="button"
                      role="radio"
                      aria-checked={length === l.value}
                      onClick={() => setLength(l.value)}
                      className={`rounded-xl px-2 py-2 text-sm font-semibold ring-1 ${
                        length === l.value
                          ? "bg-navy text-white ring-navy"
                          : "bg-white text-navy ring-stone-300"
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await createTeamLink(length);
                    if (r.link) {
                      setLink(r.link);
                      setError("");
                    } else setError(r.error ?? "Something went wrong.");
                  })
                }
                className="w-full rounded-xl bg-pink px-4 py-3 font-semibold text-navy hover:bg-pink-strong disabled:opacity-60"
              >
                {pending ? "Creating…" : "Create helper QR"}
              </button>
              {error && <p className="text-sm text-red-700">{error}</p>}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-stone-600">
                Opens whatever event is on that day. Works until{" "}
                <span className="font-medium text-stone-900">
                  {formatTime(link.expires_at, tz)}{" "}
                  {formatEventDate(link.expires_at, tz)}
                </span>
                .
              </p>
              <ShareLink
                url={`${window.location.origin}/checkin/${link.token}`}
                title="Take attendance"
                text="Here's your link for taking attendance at We The Free events. It opens whatever's on that day:"
                qrLabel="Attendance helper QR code"
              />
              <button
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await revokeTeamLinks();
                    if (r.error) setError(r.error);
                    else setLink(null);
                  })
                }
                className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-60"
              >
                {pending ? "Turning off…" : "Turn off this QR"}
              </button>
              {error && <p className="text-sm text-red-700">{error}</p>}
            </div>
          )}
        </Sheet>
      )}
    </>
  );
}
