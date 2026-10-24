"use client";

import { useState, useTransition } from "react";
import { setNoMessages } from "@/app/actions";

// Switch: they would rather not get personal messages before events.
export function NoMessages({
  personId,
  initial,
}: {
  personId: string;
  initial: boolean;
}) {
  const [on, setOn] = useState(initial);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  return (
    <div className="text-sm">
      <label className="flex cursor-pointer items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={on}
          disabled={pending}
          onClick={() => {
            const next = !on;
            setOn(next);
            start(async () => {
              const r = await setNoMessages(personId, next);
              if (r.error) {
                setOn(!next);
                setError(r.error);
              } else setError("");
            });
          }}
          className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${on ? "bg-cyan" : "bg-stone-300"} ${
            pending ? "opacity-60" : ""
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`}
          />
        </button>
        <span className="text-stone-600">
          Doesn&apos;t want personal messages before events
        </span>
      </label>
      {error && <p className="mt-1 text-red-700">{error}</p>}
    </div>
  );
}
