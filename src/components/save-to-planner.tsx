"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { dayIn, planDayLabel, savePlanItem } from "@/lib/social-plan";

// "Save to planner": banks a written post or a graphic on a day of the
// Social Media Hub's planner. Pick the day, save, done.
export function SaveToPlanner({
  teamId,
  day,
  tz,
  caption,
  getImage,
  platforms = [],
  eventId,
  className = "rounded-lg px-2.5 py-1 text-xs font-medium text-stone-500 hover:text-stone-800",
}: {
  teamId: string;
  day?: string; // suggested day, yyyy-mm-dd (else today)
  tz?: string;
  caption?: string;
  getImage?: () => Promise<Blob | null>;
  platforms?: string[];
  eventId?: string | null;
  className?: string;
}) {
  const path = usePathname();
  const hub = path.startsWith("/attendance")
    ? "/attendance/resources/social#planner"
    : "/resources/social#planner";
  const [open, setOpen] = useState(false);
  const [when, setWhen] = useState(
    () =>
      day ??
      dayIn(Date.now(), tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone),
  );
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");

  async function save() {
    if (!when) return setError("Pick a day.");
    setError("");
    setBusy(true);
    try {
      const img = getImage ? await getImage() : null;
      await savePlanItem({
        teamId,
        day: when,
        caption: caption ?? null,
        platforms,
        images: img ? [img] : [],
        eventId,
      });
      setSaved(when);
      setOpen(false);
    } catch {
      setError("Couldn't save that. Try again?");
    }
    setBusy(false);
  }

  if (saved)
    return (
      <span className="text-xs text-stone-500">
        Saved for {planDayLabel(saved)} ·{" "}
        <Link href={hub} className="font-medium text-navy hover:underline">
          Planner
        </Link>
      </span>
    );
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className={className}>
        Save to planner
      </button>
    );
  return (
    <span className="flex flex-wrap items-center gap-1.5 text-xs">
      <input
        type="date"
        value={when}
        onChange={(e) => setWhen(e.target.value)}
        aria-label="Day to post it"
        className="rounded-lg bg-white px-2 py-1 ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-cyan"
      />
      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="rounded-lg bg-navy px-2.5 py-1 font-semibold text-white disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="px-1 text-stone-500 hover:underline"
      >
        Cancel
      </button>
      {error && <span className="text-red-700">{error}</span>}
    </span>
  );
}
