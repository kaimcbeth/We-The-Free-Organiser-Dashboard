"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type MicroRole = {
  key: string;
  title: string;
  blurb: string;
  min_events: number;
  needs_ok: boolean;
  status: "pending" | "active" | null;
};
export type MyMicroRoles = { events: number; roles: MicroRole[] };

// Small roles that unlock as you come to more events. You see the ones you've
// unlocked (or already do) plus a peek at the next one, never the whole list.
export function MicroRoles({
  data,
  preview,
}: {
  data: MyMicroRoles;
  preview: boolean; // God Mode preview: don't save anything
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Record<string, string>>({});

  const open = data.roles.filter(
    (r) => r.status || r.min_events <= data.events,
  );
  const next = data.roles.find((r) => !r.status && r.min_events > data.events);

  function act(r: MicroRole, stop: boolean) {
    if (preview) {
      setMsg({ ...msg, [r.key]: "Preview: nothing saved." });
      return;
    }
    setBusy(r.key);
    start(async () => {
      const { data: res, error } = await createClient().rpc(
        stop ? "stop_micro_role" : "offer_micro_role",
        { p_key: r.key },
      );
      setBusy(null);
      if (error || res === "not_allowed" || res === "unknown")
        setMsg({ ...msg, [r.key]: "Something went wrong. Please try again." });
      else if (res === "locked")
        setMsg({ ...msg, [r.key]: "This one isn't open to you yet." });
      else {
        setMsg({ ...msg, [r.key]: "" });
        router.refresh();
      }
    });
  }

  return (
    <section className="mt-6">
      <ul className="space-y-3">
        {open.map((r) => (
          <li
            key={r.key}
            className={`rounded-2xl p-4 shadow-sm ring-1 ${
              r.status === "active"
                ? "bg-cyan/15 ring-cyan"
                : "bg-white ring-black/5"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{r.title}</h3>
                <p className="mt-0.5 text-sm text-stone-600">{r.blurb}</p>
              </div>
              {r.status === "active" && (
                <span className="shrink-0 rounded-full bg-cyan px-2.5 py-0.5 text-xs font-semibold text-navy">
                  You&apos;re doing this
                </span>
              )}
            </div>

            {r.status === "pending" ? (
              <p className="mt-3 text-sm text-stone-600">
                Asked. An organiser will be in touch to get you set up.{" "}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => act(r, true)}
                  className="text-stone-400 hover:text-navy hover:underline disabled:opacity-60"
                >
                  Take back
                </button>
              </p>
            ) : r.status === "active" ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => act(r, true)}
                className="mt-3 text-sm text-stone-400 hover:text-navy hover:underline disabled:opacity-60"
              >
                Stop doing this
              </button>
            ) : (
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => act(r, false)}
                  className="rounded-xl bg-pink px-4 py-2 text-sm font-semibold text-navy hover:bg-pink-strong disabled:opacity-60"
                >
                  {busy === r.key
                    ? "Saving…"
                    : r.needs_ok
                      ? "Ask to do this"
                      : "I'd like to do this"}
                </button>
                {r.needs_ok && (
                  <span className="text-xs text-stone-500">
                    An organiser sets you up first
                  </span>
                )}
              </div>
            )}
            {msg[r.key] && (
              <p className="mt-2 text-sm text-stone-600">{msg[r.key]}</p>
            )}
          </li>
        ))}
      </ul>

      {next && (
        <div className="mt-3 rounded-2xl border border-dashed border-stone-300 px-4 py-3 text-sm text-stone-500">
          <span className="font-medium text-stone-700">Coming up next:</span>{" "}
          {next.title.toLowerCase()}. Opens after{" "}
          {next.min_events - data.events} more{" "}
          {next.min_events - data.events === 1 ? "event" : "events"}.
        </div>
      )}
    </section>
  );
}
