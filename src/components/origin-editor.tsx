"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

// "Started with We The Free" and "How they found us", on a profile (organisers)
// or on someone's own page (members). Saved as the month they started, a
// source, and the person who brought them along if it was someone.

export const FOUND_VIA: { id: string; label: string }[] = [
  { id: "person", label: "Someone they know" },
  { id: "outreach", label: "Saw us doing outreach" },
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "tiktok", label: "TikTok" },
  { id: "youtube", label: "YouTube" },
  { id: "event_listing", label: "An event listing (Meetup, Eventbrite…)" },
  { id: "website", label: "The We The Free website" },
  { id: "other", label: "Something else" },
];

export type Origin = {
  started_on: string | null; // YYYY-MM-DD
  found_via: string | null;
  found_via_person_id: string | null;
  found_via_note: string | null;
};

const monthLabel = (d: string) =>
  new Date(d + "T12:00:00Z").toLocaleDateString("en-AU", {
    month: "long",
    year: "numeric",
  });

export function originSummary(
  o: Origin,
  people: { id: string; name: string }[],
  self = false,
) {
  const parts: string[] = [];
  if (o.started_on) parts.push(`Started ${monthLabel(o.started_on)}`);
  if (o.found_via) {
    const who =
      o.found_via === "person"
        ? (people.find((p) => p.id === o.found_via_person_id)?.name ??
          o.found_via_note ??
          "someone")
        : null;
    parts.push(
      who
        ? `${self ? "you" : "they"} found us through ${who}`
        : `found us: ${FOUND_VIA.find((f) => f.id === o.found_via)?.label ?? o.found_via}${o.found_via === "other" && o.found_via_note ? ` (${o.found_via_note})` : ""}`,
    );
  }
  const s = parts.join(" · ");
  return s ? s[0].toUpperCase() + s.slice(1) : "";
}

export function OriginEditor({
  personId,
  initial,
  people,
  self = false,
}: {
  personId: string;
  initial: Origin;
  people: { id: string; name: string }[]; // who could have brought them along
  self?: boolean; // their own page: "you" wording
}) {
  const [saved, setSaved] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [month, setMonth] = useState(initial.started_on?.slice(0, 7) ?? "");
  const [via, setVia] = useState(initial.found_via ?? "");
  const [who, setWho] = useState(initial.found_via_person_id ?? "");
  const [note, setNote] = useState(initial.found_via_note ?? "");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const summary = originSummary(saved, people, self);
  const field =
    "mt-1 w-full rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-cyan";

  if (!editing)
    return (
      <div className="text-sm">
        {summary ? (
          <p className="text-stone-600">
            {summary}{" "}
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="font-medium text-pink-ink hover:underline"
            >
              Edit
            </button>
          </p>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="font-medium text-pink-ink hover:underline"
          >
            {self
              ? "Add when you started and how you found us"
              : "Add when they started and how they found us"}
          </button>
        )}
      </div>
    );

  return (
    <form
      className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        if (via === "person" && !who && !note.trim())
          return setError("Pick who it was, or type their name.");
        start(async () => {
          const next: Origin = {
            started_on: month ? `${month}-01` : null,
            found_via: via || null,
            found_via_person_id: via === "person" && who ? who : null,
            found_via_note:
              (via === "person" && !who) || via === "other"
                ? note.trim() || null
                : null,
          };
          const { data, error: err } = await createClient().rpc(
            "set_person_origin",
            {
              p_person_id: personId,
              p_started: next.started_on,
              p_via: next.found_via ?? "",
              p_via_person: next.found_via_person_id,
              p_note: next.found_via_note ?? "",
            },
          );
          if (err || data !== "ok")
            return setError("Couldn't save that. Please try again.");
          setSaved(next);
          setEditing(false);
        });
      }}
    >
      <label className="block text-sm font-medium text-stone-700">
        {self
          ? "When did you start with We The Free?"
          : "When did they start with We The Free?"}
        <input
          type="month"
          value={month}
          max={new Date().toISOString().slice(0, 7)}
          onChange={(e) => setMonth(e.target.value)}
          className={field}
        />
      </label>
      <label className="block text-sm font-medium text-stone-700">
        {self
          ? "How did you find out about us?"
          : "How did they find out about us?"}
        <select
          value={via}
          onChange={(e) => setVia(e.target.value)}
          className={field}
        >
          <option value="">Choose…</option>
          {FOUND_VIA.map((f) => (
            <option key={f.id} value={f.id}>
              {self && f.id === "person"
                ? "Someone I know"
                : self && f.id === "outreach"
                  ? "Saw you doing outreach"
                  : f.label}
            </option>
          ))}
        </select>
      </label>
      {via === "person" && (
        <label className="block text-sm font-medium text-stone-700">
          Who?
          <select
            value={who}
            onChange={(e) => setWho(e.target.value)}
            className={field}
          >
            <option value="">Someone not listed</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {!who && (
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={100}
              placeholder="Their name"
              className={field}
            />
          )}
        </label>
      )}
      {via === "other" && (
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={100}
          placeholder="Tell us more (optional)"
          className={field}
        />
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-xl px-4 py-2 text-sm text-stone-600 hover:bg-black/5"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
