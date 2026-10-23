"use client";

import { useRef, useState, useTransition } from "react";
import { saveEventNotes } from "@/app/actions";

// Free-form notes for the event: saves a moment after you stop typing.
export function EventNotes({
  eventId,
  initial,
}: {
  eventId: string;
  initial: string;
}) {
  const [text, setText] = useState(initial);
  const [state, setState] = useState<"" | "saving" | "saved" | "error">("");
  const [, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function save(value: string) {
    setState("saving");
    start(async () => {
      const r = await saveEventNotes(eventId, value);
      setState(r.error ? "error" : "saved");
    });
  }

  return (
    <section className="mt-5">
      <div className="mb-1.5 flex items-baseline justify-between">
        <label
          htmlFor="event-notes"
          className="text-sm font-semibold text-navy"
        >
          Notes
        </label>
        <span className="text-xs text-stone-400">
          {state === "saving"
            ? "Saving…"
            : state === "saved"
              ? "Saved"
              : state === "error"
                ? "Couldn't save"
                : ""}
        </span>
      </div>
      <textarea
        id="event-notes"
        value={text}
        rows={text ? Math.min(10, text.split("\n").length + 1) : 2}
        maxLength={5000}
        placeholder="Anything to remember: who's bringing what, the venue contact, how it went…"
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          setState("");
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => save(v), 800);
        }}
        onBlur={() => {
          if (timer.current) {
            clearTimeout(timer.current);
            timer.current = null;
            if (text !== initial) save(text);
          }
        }}
        className="w-full rounded-2xl bg-white px-4 py-3 text-sm shadow-sm ring-1 ring-black/5 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-pink"
      />
    </section>
  );
}
