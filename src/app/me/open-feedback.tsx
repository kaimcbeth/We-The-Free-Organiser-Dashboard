"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Open feedback to the community's organisers, with your name or anonymously.
export function OpenFeedback({ preview = false }: { preview?: boolean }) {
  const [text, setText] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (text.trim().length < 2 || busy) return;
    setError("");
    if (preview) return setSent(true); // God Mode preview: nothing saved
    setBusy(true);
    const { data, error: err } = await createClient().rpc("send_my_feedback", {
      p_message: text,
      p_anonymous: anonymous,
    });
    setBusy(false);
    if (err || data !== "ok")
      return setError("Couldn't send that. Please try again.");
    setSent(true);
    setText("");
  }

  if (sent)
    return (
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <p className="font-medium text-navy">Thanks, it&apos;s been sent.</p>
        <p className="mt-1 text-sm text-stone-600">
          {anonymous
            ? "It went without your name."
            : "Your organisers will see it came from you."}
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-2 text-sm font-medium text-pink-ink hover:underline"
        >
          Send more
        </button>
      </div>
    );

  return (
    <form
      onSubmit={send}
      className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
    >
      <p className="text-sm text-stone-600">
        Anything you&apos;d like your organisers to know: what&apos;s working,
        what could be better, ideas, worries. Every message gets read.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 2000))}
        rows={4}
        placeholder="Your feedback…"
        aria-label="Your feedback"
        className="w-full rounded-xl bg-white p-3 text-sm ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-cyan"
      />
      <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          checked={anonymous}
          onChange={(e) => setAnonymous(e.target.checked)}
          className="h-4 w-4 accent-navy"
        />
        Send anonymously
      </label>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={busy || text.trim().length < 2}
        className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Sending…" : "Send"}
      </button>
    </form>
  );
}
