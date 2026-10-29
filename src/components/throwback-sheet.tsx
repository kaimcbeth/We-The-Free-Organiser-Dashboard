"use client";

import { useState } from "react";
import { Sheet } from "@/components/sheet";
import { Option } from "@/components/copy-maker";
import { createClient } from "@/lib/supabase/client";

type Throwback = {
  id: string;
  url: string;
  years: number;
  caption: string | null;
  eventTitle: string | null;
};

const ago = (n: number) => (n === 1 ? "1 year ago" : `${n} years ago`);
const captions = (t: Throwback) => {
  const what = t.eventTitle ?? t.caption;
  return [
    `Throwback to ${ago(t.years)}${what ? `: ${what}` : ""}. Look how far we've come.`,
    `${ago(t.years)} today${what ? ` (${what})` : ""}. Who remembers this one?`,
  ];
};

// "Throwback photo posted": photos from the Photo Hub taken this month in
// earlier years (like Facebook memories), to download and post.
export function ThrowbackSheet({
  teamId,
  className,
}: {
  teamId: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Throwback[] | null>(null);
  const [pick, setPick] = useState<Throwback | null>(null);

  async function show() {
    setOpen(true);
    if (list) return;
    const db = createClient();
    const { data } = await db.rpc("throwback_photos", { p_team_id: teamId });
    const rows = (data ?? []) as {
      id: string;
      path: string;
      years_ago: number;
      caption: string | null;
      event_title: string | null;
    }[];
    const { data: signed } = rows.length
      ? await db.storage.from("event-photos").createSignedUrls(
          rows.map((r) => r.path),
          3600,
        )
      : { data: [] };
    const url = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
    const out = rows
      .filter((r) => url.get(r.path))
      .map((r) => ({
        id: r.id,
        url: url.get(r.path)!,
        years: r.years_ago,
        caption: r.caption,
        eventTitle: r.event_title,
      }));
    setList(out);
    setPick(out[0] ?? null);
  }

  return (
    <>
      <button type="button" onClick={show} className={className}>
        Find a throwback
      </button>
      {open && (
        <Sheet title="Throwback photo" onClose={() => setOpen(false)}>
          {!list ? (
            <p className="text-sm text-stone-500">Looking…</p>
          ) : list.length === 0 ? (
            <p className="text-sm text-stone-600">
              No photos from this month in past years yet. Add older photos in
              Photo Hub (Resources) with the month and year they were taken, and
              they&apos;ll come up here, like Facebook memories.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-stone-600">
                From this month in past years. Pick one, download it and post
                it.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {list.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setPick(t)}
                    className={`relative overflow-hidden rounded-xl ring-2 ${pick?.id === t.id ? "ring-pink" : "ring-transparent"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
                    <img
                      src={t.url}
                      alt=""
                      className="aspect-square w-full object-cover"
                    />
                    <span className="absolute bottom-1 left-1 rounded bg-navy/70 px-1.5 text-[10px] font-medium text-white">
                      {ago(t.years)}
                    </span>
                  </button>
                ))}
              </div>
              {pick && (
                <>
                  <a
                    href={pick.url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block rounded-xl px-3 py-1.5 text-sm font-semibold ring-1 ring-black/10 hover:bg-stone-50"
                  >
                    Download photo
                  </a>
                  <ul className="space-y-2">
                    {captions(pick).map((c) => (
                      <Option key={c} text={c} />
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </Sheet>
      )}
    </>
  );
}
