"use client";

import { useState } from "react";
import { Sheet } from "@/components/sheet";
import {
  getMeetMembersQuestions,
  saveMeetMembersQuestions,
} from "@/app/actions";
import {
  MEET_MEMBERS_DEFAULT,
  MEET_ORGANISERS_DEFAULT,
} from "@/lib/meet-members";

// On "Meet the Members: volunteer asked": copy the questions to send to the
// volunteer, or change them for future months.
export function MeetMembersQuestions() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [saved, setSaved] = useState("");
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function show() {
    setOpen(true);
    const r = await getMeetMembersQuestions();
    setText(r.questions);
    setSaved(r.questions);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(saved);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy: select the text and copy it instead.");
    }
  }

  async function save() {
    setBusy(true);
    setError("");
    const r = await saveMeetMembersQuestions(text);
    setBusy(false);
    if (r.error) return setError(r.error);
    setSaved(text.trim() || MEET_MEMBERS_DEFAULT);
    setText(text.trim() || MEET_MEMBERS_DEFAULT);
    setEditing(false);
  }

  const btn =
    "rounded-xl bg-pink px-3 py-1.5 text-sm font-semibold text-navy hover:bg-pink-strong";
  return (
    <>
      <button type="button" onClick={show} className={btn}>
        The questions
      </button>
      {open && (
        <Sheet title="Meet the Members" onClose={() => setOpen(false)}>
          {editing ? (
            <>
              <p className="mb-2 text-sm text-stone-600">
                Change the questions for this month and the months to come.
              </p>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 4000))}
                rows={16}
                aria-label="Meet the Members questions"
                className="w-full rounded-xl bg-white p-3 text-sm ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-cyan"
              />
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={save}
                  disabled={busy}
                  className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setText(saved);
                    setEditing(false);
                  }}
                  className="text-sm text-stone-500 hover:underline"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setText(MEET_MEMBERS_DEFAULT)}
                  className="ml-auto text-xs text-stone-400 hover:text-navy hover:underline"
                >
                  Back to the default questions
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="mb-2 text-sm text-stone-600">
                Send these to the member you&apos;re featuring this month.
              </p>
              <pre className="whitespace-pre-wrap rounded-xl bg-white p-3 font-sans text-sm text-stone-800 ring-1 ring-black/10">
                {saved || "Loading…"}
              </pre>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={copy}
                  disabled={!saved}
                  className="rounded-xl bg-pink px-4 py-2 text-sm font-semibold text-navy hover:bg-pink-strong disabled:opacity-50"
                >
                  {copied ? "Copied" : "Copy questions"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  disabled={!saved}
                  className="text-sm font-medium text-stone-500 hover:text-navy hover:underline"
                >
                  Change the questions
                </button>
              </div>
            </>
          )}
          {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
        </Sheet>
      )}
    </>
  );
}

// On "Meet the Organisers posted" (RSL, Kai 6 Nov 2026): the questions to
// send to the organiser being featured.
export function MeetOrganisersQuestions() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(MEET_ORGANISERS_DEFAULT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy: select the text and copy it instead.");
    }
  }
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl bg-navy/5 px-3 py-1.5 text-sm font-semibold text-navy hover:bg-navy/10"
      >
        The questions
      </button>
      {open && (
        <Sheet title="Meet the Organisers" onClose={() => setOpen(false)}>
          <p className="text-sm text-stone-600">
            Send these to the organiser you&apos;re featuring, with a few photos
            of them.
          </p>
          <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-white p-3 font-sans text-sm text-navy ring-1 ring-black/5">
            {MEET_ORGANISERS_DEFAULT}
          </pre>
          <button
            type="button"
            onClick={copy}
            className="mt-3 rounded-xl bg-pink px-3 py-1.5 text-sm font-semibold text-navy hover:bg-pink-strong"
          >
            {copied ? "Copied" : "Copy the questions"}
          </button>
          {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
        </Sheet>
      )}
    </>
  );
}
