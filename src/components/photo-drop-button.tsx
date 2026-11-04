"use client";

import { useState } from "react";
import { Sheet } from "@/components/sheet";
import { ShareLink } from "@/components/share-link";
import { createClient } from "@/lib/supabase/client";

// "QR code for uploads" (Kai, 5 Nov 2026): a temporary link anyone can use
// to add photos to the Photo Hub (or one event) without logging in.
const LENGTHS = [
  { hours: 2, label: "2 hours" },
  { hours: 12, label: "12 hours" },
  { hours: 24, label: "1 day" },
  { hours: 72, label: "3 days" },
  { hours: 168, label: "1 week" },
];

type Link = { token: string; expires_at: string; uploads: number };

export function PhotoDropButton({
  teamId,
  eventId,
  eventLabel,
  className = "rounded-xl px-3 py-1.5 text-sm font-semibold text-navy ring-1 ring-navy/20 hover:bg-navy/5",
}: {
  teamId: string;
  eventId: string | null;
  eventLabel?: string | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState<Link | null | undefined>(undefined);
  const [hours, setHours] = useState(24);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function show() {
    setOpen(true);
    setLink(undefined);
    setNote("");
    // The newest live link for this event (or the hub), if there is one.
    let q = createClient()
      .from("photo_drop_links")
      .select("token, expires_at, uploads")
      .eq("team_id", teamId)
      .is("stopped_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);
    q = eventId ? q.eq("event_id", eventId) : q.is("event_id", null);
    const { data } = await q;
    setLink((data?.[0] as Link | undefined) ?? null);
  }

  async function make() {
    setBusy(true);
    setNote("");
    const { data, error } = await createClient().rpc("create_photo_drop", {
      p_team_id: teamId,
      p_event_id: eventId,
      p_hours: hours,
    });
    setBusy(false);
    if (error || !data) return setNote("Couldn't make a link. Try again?");
    setLink({
      token: data as string,
      expires_at: new Date(Date.now() + hours * 3600e3).toISOString(),
      uploads: 0,
    });
  }

  async function stop() {
    if (!link) return;
    setBusy(true);
    await createClient().rpc("stop_photo_drop", { p_token: link.token });
    setBusy(false);
    setLink(null);
    setNote("Stopped. That QR code doesn't work any more.");
  }

  const where = eventLabel ? eventLabel : "the Photo Hub";
  const until = link
    ? new Intl.DateTimeFormat("en-AU", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(link.expires_at))
    : "";
  const url =
    link && typeof window !== "undefined"
      ? `${window.location.origin}/drop/${link.token}`
      : "";

  return (
    <>
      <button type="button" onClick={show} className={className}>
        QR code for uploads
      </button>
      {open && (
        <Sheet title="QR code for uploads" onClose={() => setOpen(false)}>
          {link === undefined ? (
            <p className="text-sm text-stone-500">Loading…</p>
          ) : link ? (
            <div className="space-y-4">
              <p className="text-sm text-stone-600">
                Anyone who scans this can add photos to{" "}
                <span className="font-semibold text-navy">{where}</span>, no
                login needed. It works until{" "}
                <span className="font-semibold text-navy">{until}</span>
                {link.uploads
                  ? ` (${link.uploads} photo${link.uploads === 1 ? "" : "s"} so far)`
                  : ""}
                .
              </p>
              <ShareLink
                url={url}
                title="Add your photos"
                text="Add your photos from the event to our Photo Hub:"
                qrLabel="Scan to add your photos"
              />
              <button
                type="button"
                disabled={busy}
                onClick={stop}
                className="w-full text-center text-sm text-red-700 hover:underline disabled:opacity-50"
              >
                Stop this link now
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-stone-600">
                Make a QR code people can scan to add their photos to{" "}
                <span className="font-semibold text-navy">{where}</span> without
                logging in. It stops working after:
              </p>
              <div className="flex flex-wrap gap-2">
                {LENGTHS.map((l) => (
                  <button
                    key={l.hours}
                    type="button"
                    onClick={() => setHours(l.hours)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 ${
                      hours === l.hours
                        ? "bg-navy text-white ring-navy"
                        : "bg-white text-stone-700 ring-stone-300"
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={make}
                className="w-full rounded-xl bg-pink px-4 py-2.5 font-semibold text-navy hover:bg-pink-strong disabled:opacity-50"
              >
                Make the QR code
              </button>
              {note && <p className="text-sm text-stone-600">{note}</p>}
            </div>
          )}
        </Sheet>
      )}
    </>
  );
}
