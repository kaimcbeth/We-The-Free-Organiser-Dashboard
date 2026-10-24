"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { markInvited, setNoMessages } from "@/app/actions";
import type { Invite, InviteReason } from "@/lib/invites";

const WHY: Record<InviteReason, string> = {
  first_timer: "First-timer",
  newcomer: "Newcomer",
  drift: "Not seen in a while",
  drift_again: "Not seen in a while · 2nd nudge",
  occasional: "Comes now and then",
  regular: "Regular",
};

export function InviteList({
  eventId,
  invites,
}: {
  eventId: string;
  invites: Invite[];
}) {
  const [sent, setSent] = useState(
    () => new Set(invites.filter((i) => i.sent).map((i) => i.personId)),
  );
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [, start] = useTransition();

  function toggle(i: Invite) {
    const on = !sent.has(i.personId);
    setSent((s) => {
      const n = new Set(s);
      if (on) n.add(i.personId);
      else n.delete(i.personId);
      return n;
    });
    start(async () => {
      const r = await markInvited(eventId, i.personId, i.kind, on);
      if (r.error) setError(r.error);
    });
  }

  function optOut(i: Invite) {
    setHidden((h) => new Set(h).add(i.personId));
    start(async () => {
      const r = await setNoMessages(i.personId, true);
      if (r.error) setError(r.error);
    });
  }

  const shown = invites.filter((i) => !hidden.has(i.personId));
  const groups = [
    {
      title: "Priority",
      note: "New people and people drifting off. Do these first.",
      list: shown.filter((i) => i.group === "priority"),
    },
    {
      title: "Regulars",
      note: "A quick round. Easy to hand to a helper.",
      list: shown.filter((i) => i.group === "regulars"),
    },
  ];
  const done = shown.filter((i) => sent.has(i.personId)).length;

  if (shown.length === 0)
    return (
      <p className="mt-6 rounded-2xl bg-white p-4 text-sm text-stone-600 shadow-sm ring-1 ring-black/5">
        Nobody needs a personal message for this one. Everyone&apos;s either
        been messaged recently or isn&apos;t due yet.
      </p>
    );

  return (
    <>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-200">
        <div
          className="h-full rounded-full bg-cyan transition-all"
          style={{ width: `${(done / shown.length) * 100}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-stone-500">
        {done} of {shown.length} messaged
      </p>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      {groups.map(
        (g) =>
          g.list.length > 0 && (
            <section key={g.title} className="mt-6">
              <h2 className="font-semibold">
                {g.title}{" "}
                <span className="font-normal text-stone-400">
                  {g.list.length}
                </span>
              </h2>
              <p className="mb-2 text-sm text-stone-500">{g.note}</p>
              <ul className="divide-y divide-black/5 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                {g.list.map((i) => {
                  const isSent = sent.has(i.personId);
                  return (
                    <li
                      key={i.personId}
                      className={`flex items-start gap-3 px-4 py-3 ${isSent ? "bg-stone-50" : ""}`}
                    >
                      <button
                        type="button"
                        onClick={() => toggle(i)}
                        aria-label={isSent ? "Mark not sent" : "Mark sent"}
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-2 ${isSent ? "bg-cyan text-navy ring-cyan" : "ring-stone-300"}`}
                      >
                        {isSent ? "✓" : ""}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <Link
                            href={`/people/${i.personId}`}
                            target="_blank"
                            className={`font-medium hover:underline ${isSent ? "text-stone-400 line-through" : ""}`}
                          >
                            {i.name}
                          </Link>
                          <span className="text-xs text-stone-500">
                            {WHY[i.reason]} · {i.detail}
                          </span>
                        </div>
                        {i.kind === "ask" && (
                          <p className="mt-0.5 text-xs font-medium text-pink-ink">
                            Make it an ask: help set up, or bring a friend?
                          </p>
                        )}
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          {i.whatsapp && (
                            <a
                              href={i.whatsapp}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg bg-[#25D366]/15 px-2.5 py-1 text-xs font-semibold text-[#128C7E] hover:bg-[#25D366]/25"
                            >
                              WhatsApp ↗
                            </a>
                          )}
                          {i.facebook && (
                            <a
                              href={i.facebook}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg bg-[#0866FF]/10 px-2.5 py-1 text-xs font-semibold text-[#0866FF] hover:bg-[#0866FF]/15"
                            >
                              Messenger ↗
                            </a>
                          )}
                          {!i.whatsapp && !i.facebook && (
                            <span className="text-xs text-stone-400">
                              No contact details yet
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => optOut(i)}
                            className="ml-auto text-xs text-stone-400 hover:text-stone-700 hover:underline"
                          >
                            Doesn&apos;t want messages
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ),
      )}
    </>
  );
}
