"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const SCALE = ["Not great", "Meh", "OK", "Good", "Loving it"];

export function FeedbackForm({ token }: { token: string }) {
  const [rating, setRating] = useState<number | null>(null);
  const [well, setWell] = useState("");
  const [better, setBetter] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  if (done)
    return (
      <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <p className="text-lg font-semibold">Thank you.</p>
        <p className="mt-1 text-stone-600">
          Your organisers will read it. See you at the next one.
        </p>
      </div>
    );

  const field =
    "mt-1 w-full rounded-xl bg-white p-3 text-base ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-cyan";
  return (
    <form
      className="mt-6 space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        if (rating === null && !well.trim() && !better.trim())
          return setError("Answer at least one question.");
        setBusy(true);
        const { data, error: err } = await createClient().rpc(
          "submit_feedback",
          {
            p_token: token,
            p_rating: rating,
            p_going_well: well,
            p_better: better,
            p_name: name,
          },
        );
        setBusy(false);
        if (err || !data) return setError("Couldn't send that. Try again?");
        setDone(true);
      }}
    >
      <fieldset>
        <legend className="font-medium">
          How are you finding volunteering with us?
        </legend>
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {SCALE.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setRating(i + 1)}
              className={`rounded-xl px-1 py-2.5 text-xs font-medium ring-1 sm:text-sm ${
                rating === i + 1
                  ? "bg-navy text-white ring-navy"
                  : "bg-white text-stone-700 ring-black/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="block font-medium">
        What&apos;s working well?
        <textarea
          value={well}
          onChange={(e) => setWell(e.target.value)}
          rows={3}
          maxLength={2000}
          className={field}
        />
      </label>
      <label className="block font-medium">
        What would make it better?
        <textarea
          value={better}
          onChange={(e) => setBetter(e.target.value)}
          rows={3}
          maxLength={2000}
          className={field}
        />
      </label>
      <label className="block font-medium">
        Your name <span className="font-normal text-stone-400">(optional)</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          className={field}
        />
      </label>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-pink px-4 py-3 font-semibold text-navy hover:bg-pink-strong disabled:opacity-60"
      >
        {busy ? "Sending…" : "Send"}
      </button>
    </form>
  );
}
