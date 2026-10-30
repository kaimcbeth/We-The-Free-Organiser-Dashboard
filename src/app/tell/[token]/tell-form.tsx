"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function TellForm({ token }: { token: string }) {
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  if (done)
    return (
      <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <p className="text-lg font-semibold">Thank you.</p>
        <p className="mt-1 text-stone-600">
          It&apos;s gone to your organisers
          {name.trim() ? "" : ", without your name"}.
        </p>
        <button
          type="button"
          onClick={() => {
            setDone(false);
            setText("");
          }}
          className="mt-2 text-sm font-medium text-pink-ink hover:underline"
        >
          Send more
        </button>
      </div>
    );

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (text.trim().length < 2 || busy) return;
        setBusy(true);
        setError("");
        const { data, error: err } = await createClient().rpc(
          "submit_open_feedback",
          { p_token: token, p_message: text, p_name: name },
        );
        setBusy(false);
        if (err || !data)
          return setError("Couldn't send that. Please try again.");
        setDone(true);
      }}
      className="mt-6 space-y-4"
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 20000))}
        rows={8}
        placeholder="Your feedback…"
        aria-label="Your feedback"
        className="w-full rounded-xl bg-white p-3 text-base ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-cyan"
      />
      <label className="block text-sm text-stone-700">
        Your name (optional)
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 100))}
          placeholder="Leave blank to send anonymously"
          className="mt-1 w-full rounded-xl bg-white p-3 text-base ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-cyan"
        />
      </label>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={busy || text.trim().length < 2}
        className="w-full rounded-xl bg-pink px-4 py-3 font-semibold text-navy hover:bg-pink-strong disabled:opacity-50"
      >
        {busy ? "Sending…" : "Send"}
      </button>
    </form>
  );
}
