"use client";

import { useState, useTransition } from "react";
import { setStartingOutreach } from "@/app/actions";

// "Outreach before the app: [ 25 ] Save" for long-time volunteers.
export function StartingOutreach({ personId, initial }: { personId: string; initial: number }) {
  const [value, setValue] = useState(String(initial));
  const [saved, setSaved] = useState(initial);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const dirty = Number(value) !== saved;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await setStartingOutreach(personId, Number(value));
          if (r.error) setError(r.error);
          else {
            setError("");
            setSaved(Number(value));
          }
        });
      }}
      className="flex flex-wrap items-center gap-2 text-sm"
    >
      <label htmlFor="starting-outreach" className="text-stone-600">
        Outreach events before the app
      </label>
      <input
        id="starting-outreach"
        type="number"
        min={0}
        max={1000}
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-20 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-right tabular-nums outline-none focus:border-navy focus:ring-2 focus:ring-pink/40"
      />
      {dirty && (
        <button
          disabled={pending}
          className="rounded-lg bg-pink px-3 py-1.5 font-semibold text-navy hover:bg-pink-strong disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      )}
      {error && <span className="text-red-700">{error}</span>}
    </form>
  );
}
