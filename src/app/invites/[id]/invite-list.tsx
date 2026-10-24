"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  markInvited,
  setNoMessages,
  setPersonFacebook,
  setPersonPhone,
} from "@/app/actions";
import { inputClass } from "@/components/form";
import { messengerLink } from "@/lib/messenger";
import { whatsappLink, type Invite, type InviteReason } from "@/lib/invites";

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
  local = false,
  empty,
}: {
  eventId: string;
  invites: Invite[];
  // A plain list of regulars to message (e.g. the set-up team): ticks are
  // only kept on this device, and nothing counts as a personal invite.
  local?: boolean;
  empty?: string; // text when there's nobody to show
}) {
  const storeKey = `regulars-${eventId}`;
  const [sent, setSent] = useState(() => {
    if (local && typeof window !== "undefined") {
      try {
        return new Set<string>(
          JSON.parse(localStorage.getItem(storeKey) ?? "[]"),
        );
      } catch {}
    }
    return new Set(invites.filter((i) => i.sent).map((i) => i.personId));
  });
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  // Contact details edited here: personId -> { phone, facebook } as saved.
  const [contact, setContact] = useState<
    Record<string, { phone: string; facebook: string }>
  >({});
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ phone: "", facebook: "" });
  const [saving, startSave] = useTransition();

  function openEdit(i: Invite) {
    const c = contact[i.personId];
    setDraft({
      phone: c?.phone ?? i.phone ?? "",
      facebook: c?.facebook ?? i.facebookUrl ?? "",
    });
    setEditing(i.personId);
    setError("");
  }

  function saveEdit(i: Invite) {
    startSave(async () => {
      const before = contact[i.personId] ?? {
        phone: i.phone ?? "",
        facebook: i.facebookUrl ?? "",
      };
      if (draft.phone.trim() !== before.phone) {
        const r = await setPersonPhone(i.personId, draft.phone);
        if (r.error) return setError(r.error);
      }
      if (draft.facebook.trim() !== before.facebook) {
        const r = await setPersonFacebook(i.personId, draft.facebook);
        if (r.error) return setError(r.error);
      }
      setContact((c) => ({
        ...c,
        [i.personId]: {
          phone: draft.phone.trim(),
          facebook: draft.facebook.trim(),
        },
      }));
      setEditing(null);
    });
  }

  // Links, using anything just added here.
  const links = (i: Invite) => {
    const c = contact[i.personId];
    if (!c) return { whatsapp: i.whatsapp, facebook: i.facebook };
    return {
      whatsapp: whatsappLink(c.phone || null),
      facebook: messengerLink(c.facebook || null),
    };
  };
  const [, start] = useTransition();

  function toggle(i: Invite) {
    const on = !sent.has(i.personId);
    setSent((s) => {
      const n = new Set(s);
      if (on) n.add(i.personId);
      else n.delete(i.personId);
      if (local)
        try {
          localStorage.setItem(storeKey, JSON.stringify([...n]));
        } catch {}
      return n;
    });
    if (local) return;
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
      note: "New people and people drifting off. Message these first.",
      list: shown.filter((i) => i.group === "priority"),
    },
    {
      title: "Regulars",
      note: local
        ? "People who come often, plus anyone with a role."
        : "People who come often. A quick \u201csee you there?\u201d is plenty.",
      list: shown.filter((i) => i.group === "regulars"),
    },
  ];
  const done = shown.filter((i) => sent.has(i.personId)).length;

  if (shown.length === 0)
    return (
      <p className="mt-6 rounded-2xl bg-white p-4 text-sm text-stone-600 shadow-sm ring-1 ring-black/5">
        {empty ??
          "Nobody needs a personal message for this one. Everyone's either been messaged recently or isn't due yet."}
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
                  const l = links(i);
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
                        {editing === i.personId && (
                          <div className="mt-2 space-y-2 rounded-xl bg-stone-50 p-3 ring-1 ring-black/5">
                            <label className="block text-xs font-medium text-stone-600">
                              Mobile (for WhatsApp)
                              <input
                                type="tel"
                                value={draft.phone}
                                onChange={(e) =>
                                  setDraft({ ...draft, phone: e.target.value })
                                }
                                placeholder="0412 345 678"
                                className={`${inputClass} mt-1`}
                              />
                            </label>
                            <label className="block text-xs font-medium text-stone-600">
                              Facebook profile link (for Messenger)
                              <input
                                type="url"
                                value={draft.facebook}
                                onChange={(e) =>
                                  setDraft({
                                    ...draft,
                                    facebook: e.target.value,
                                  })
                                }
                                placeholder="facebook.com/…"
                                className={`${inputClass} mt-1`}
                              />
                            </label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => saveEdit(i)}
                                className="rounded-lg bg-navy px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
                              >
                                {saving ? "Saving…" : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditing(null)}
                                className="rounded-lg px-3 py-1.5 text-sm text-stone-500 hover:text-stone-800"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                        {i.kind === "ask" && (
                          <p className="mt-0.5 text-xs font-medium text-pink-ink">
                            Make it an ask: help set up, or bring a friend?
                          </p>
                        )}
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          {l.whatsapp && (
                            <a
                              href={l.whatsapp}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg bg-[#25D366]/15 px-2.5 py-1 text-xs font-semibold text-[#128C7E] hover:bg-[#25D366]/25"
                            >
                              WhatsApp ↗
                            </a>
                          )}
                          {l.facebook && (
                            <a
                              href={l.facebook}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg bg-[#0866FF]/10 px-2.5 py-1 text-xs font-semibold text-[#0866FF] hover:bg-[#0866FF]/15"
                            >
                              Messenger ↗
                            </a>
                          )}
                          {!l.whatsapp && !l.facebook && (
                            <span className="text-xs text-stone-400">
                              No contact details yet
                            </span>
                          )}
                          {i.canEdit && editing !== i.personId && (
                            <button
                              type="button"
                              onClick={() => openEdit(i)}
                              className="text-xs font-medium text-pink-ink hover:underline"
                            >
                              {l.whatsapp || l.facebook
                                ? "Edit details"
                                : "Add details"}
                            </button>
                          )}
                          {!local && (
                            <button
                              type="button"
                              onClick={() => optOut(i)}
                              className="ml-auto text-xs text-stone-400 hover:text-stone-700 hover:underline"
                            >
                              Doesn&apos;t want messages
                            </button>
                          )}
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
