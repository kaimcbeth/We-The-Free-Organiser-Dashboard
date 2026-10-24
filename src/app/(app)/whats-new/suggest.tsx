"use client";

import { useState, useTransition } from "react";
import { addSuggestion, removeSuggestion } from "@/app/actions";

export type Suggestion = {
  id: string;
  body: string;
  created_at: string;
  author_name: string | null;
  team: string | null;
  mine: boolean;
};

const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short" });

export function Suggest({
  list,
  everyone,
}: {
  list: Suggestion[];
  everyone: boolean; // God: sees everyone's
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [thanks, setThanks] = useState(false);
  const [pending, start] = useTransition();

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <p className="text-xs font-semibold uppercase tracking-wide text-pink-ink">
        Suggest something
      </p>
      <p className="mt-1 text-sm text-stone-600">
        An idea that would make the Hub easier, or something that bugs you? Kai
        reads every one.
      </p>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setThanks(false);
        }}
        rows={3}
        placeholder="e.g. A way to see who's coming before the event"
        className="mt-2 w-full rounded-xl bg-white p-2 text-sm ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-cyan"
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          disabled={pending || text.trim().length === 0}
          onClick={() =>
            start(async () => {
              setError("");
              const r = await addSuggestion(text);
              if (r.error) return setError(r.error);
              setText("");
              setThanks(true);
            })
          }
          className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send suggestion"}
        </button>
        {thanks && (
          <span className="text-sm text-stone-600">Thanks, got it.</span>
        )}
        {error && <span className="text-sm text-red-700">{error}</span>}
      </div>

      {list.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-stone-500">
            {everyone ? `All suggestions (${list.length})` : "Your suggestions"}
          </p>
          <ul className="mt-1.5 space-y-2">
            {list.map((s) => (
              <li
                key={s.id}
                className="rounded-xl bg-stone-50 p-2.5 text-sm ring-1 ring-black/5"
              >
                <p className="whitespace-pre-line text-stone-800">{s.body}</p>
                <div className="mt-1 flex gap-2 text-xs text-stone-400">
                  <span>
                    {everyone && !s.mine
                      ? `${s.author_name ?? "Someone"}${s.team ? `, ${s.team}` : ""} · `
                      : ""}
                    {date(s.created_at)}
                  </span>
                  <button
                    type="button"
                    onClick={() => start(() => removeSuggestion(s.id))}
                    className="ml-auto hover:text-stone-700 hover:underline"
                  >
                    {everyone && !s.mine ? "Done" : "Remove"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
