"use client";

import { useState, useTransition } from "react";
import { saveEventFacebookUrl } from "@/app/actions";

// The event's Facebook event link: paste it once, then open or copy it from
// any Facebook-related action.
export function FbEventLink({
  eventId,
  initial,
  canAdd,
}: {
  eventId: string;
  initial: string | null;
  canAdd: boolean; // show the paste box when there's no link yet
}) {
  const [url, setUrl] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      const r = await saveEventFacebookUrl(eventId, draft);
      if (r.error) return setError(r.error);
      setUrl(r.url ?? null);
      setEditing(false);
      setError("");
    });
  }

  if (url && !editing)
    return (
      <span className="inline-flex flex-wrap items-center gap-2">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl bg-[#0866FF]/10 px-3 py-1.5 text-sm font-semibold text-[#0866FF] hover:bg-[#0866FF]/15"
        >
          Open Facebook event ↗
        </a>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="rounded px-1 py-0.5 text-xs text-stone-400 hover:text-stone-700 hover:underline"
        >
          {copied ? "Copied ✓" : "Copy link"}
        </button>
        <button
          type="button"
          onClick={() => {
            setDraft(url);
            setEditing(true);
          }}
          className="rounded px-1 py-0.5 text-xs text-stone-400 hover:text-stone-700 hover:underline"
        >
          Change
        </button>
      </span>
    );
  if (!canAdd && !editing) return null;
  return (
    <span className="flex w-full flex-wrap items-center gap-2">
      <input
        type="url"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && draft.trim() && save()}
        placeholder="Paste the Facebook event link"
        className="min-w-0 flex-1 rounded-xl bg-white px-3 py-1.5 text-sm ring-1 ring-black/10 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-cyan"
      />
      <button
        type="button"
        disabled={pending || !draft.trim()}
        onClick={save}
        className="rounded-xl bg-navy px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        Save
      </button>
      {editing && (
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-xs text-stone-400 hover:text-stone-700"
        >
          Cancel
        </button>
      )}
      {error && <span className="w-full text-xs text-red-700">{error}</span>}
    </span>
  );
}
