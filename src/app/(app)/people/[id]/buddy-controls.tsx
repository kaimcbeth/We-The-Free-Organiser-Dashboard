"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { assignBuddy, setIsBuddy } from "@/app/actions";
import { formatEventDate } from "@/lib/time";

type Option = { id: string; name: string };

// Buddy role switch: "Approved buddy" (only for people with an account).
export function BuddySwitch({
  personId,
  initial,
  connected,
  firstName,
}: {
  personId: string;
  initial: boolean;
  connected: boolean;
  firstName: string;
}) {
  const [on, setOn] = useState(initial);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const disabled = pending || (!connected && !on);

  return (
    <div className="text-sm">
      <label
        className={`flex items-center gap-3 ${disabled ? "" : "cursor-pointer"}`}
      >
        <button
          type="button"
          role="switch"
          aria-checked={on}
          disabled={disabled}
          onClick={() => {
            const next = !on;
            if (
              !next &&
              !confirm(
                `Remove ${firstName} as a buddy? Their current pairings will end.`,
              )
            )
              return;
            setOn(next);
            start(async () => {
              const r = await setIsBuddy(personId, next);
              if (r.error) {
                setOn(!next);
                setError(r.error);
              } else setError("");
            });
          }}
          className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${on ? "bg-pink" : "bg-stone-300"} ${
            disabled ? "opacity-50" : ""
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`}
          />
        </button>
        <span className="text-stone-600">
          Approved buddy
          <span className="block text-xs text-stone-500">
            {connected
              ? "Can look after newcomers and gets reminders to reach out"
              : `${firstName} needs to connect their account first`}
          </span>
        </span>
      </label>
      {error && <p className="mt-1 text-red-700">{error}</p>}
    </div>
  );
}

// Pick (or change) this person's buddy.
export function BuddyPicker({
  newcomerId,
  current,
  options,
}: {
  newcomerId: string;
  current: { buddyId: string; name: string; since: string; via: string } | null;
  options: Option[];
}) {
  const [value, setValue] = useState(current?.buddyId ?? "");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  if (options.length === 0 && !current) {
    return (
      <p className="text-sm text-stone-500">
        No approved buddies yet. Switch on “Approved buddy” on a trusted
        attendee&apos;s profile first.
      </p>
    );
  }

  return (
    <div className="text-sm">
      {current && (
        <p className="mb-2 text-stone-600">
          <Link
            href={`/people/${current.buddyId}`}
            className="font-medium text-stone-900 hover:underline"
          >
            {current.name}
          </Link>{" "}
          since {formatEventDate(current.since)}
          {current.via === "claimed" ? " (they offered)" : ""}
        </p>
      )}
      <div className="flex gap-2">
        <select
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
          aria-label="Buddy"
          className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2"
        >
          <option value="">No buddy</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={pending || value === (current?.buddyId ?? "")}
          onClick={() =>
            start(async () => {
              const r = await assignBuddy(newcomerId, value || null);
              if (r.error) setError(r.error);
              else {
                setError("");
                setSaved(true);
              }
            })
          }
          className="shrink-0 rounded-xl bg-pink px-4 font-semibold text-navy hover:bg-pink-strong disabled:opacity-40"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      {saved && (
        <p className="mt-1 text-stone-600">
          {value
            ? "Saved. Their buddy gets a reminder to invite them in a week."
            : "Buddy removed."}
        </p>
      )}
      {error && <p className="mt-1 text-red-700">{error}</p>}
    </div>
  );
}
