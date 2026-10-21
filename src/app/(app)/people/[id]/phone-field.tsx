"use client";

import { useState, useTransition } from "react";
import { setPersonPhone } from "@/app/actions";

// For people with a role: a WhatsApp number their Regional Support Lead can
// use (can be added before they've connected their account).
export function PhoneField({
  personId,
  initial,
}: {
  personId: string;
  initial: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  if (!editing)
    return (
      <p className="mt-2 flex items-center gap-2 text-sm">
        <span className="text-stone-500">WhatsApp:</span>
        <span className={saved ? "font-medium" : "text-stone-400"}>
          {saved || "No number yet"}
        </span>
        <button
          onClick={() => setEditing(true)}
          className="rounded-lg px-1.5 py-0.5 text-xs font-medium text-pink-ink hover:bg-stone-100"
        >
          {saved ? "Change" : "Add"}
        </button>
      </p>
    );

  return (
    <form
      className="mt-2 flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await setPersonPhone(personId, value);
          if (r.error) setError(r.error);
          else {
            setError("");
            setSaved(value.trim());
            setEditing(false);
          }
        });
      }}
    >
      <input
        autoFocus
        type="tel"
        inputMode="tel"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="0412 345 678"
        aria-label="WhatsApp number"
        className="w-44 rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-sm"
      />
      <button
        disabled={pending}
        className="rounded-xl bg-navy px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      <button
        type="button"
        onClick={() => {
          setValue(saved);
          setEditing(false);
          setError("");
        }}
        className="rounded-xl px-2 py-1.5 text-sm text-stone-500 hover:bg-stone-100"
      >
        Cancel
      </button>
      {error && <p className="w-full text-sm text-red-700">{error}</p>}
    </form>
  );
}
