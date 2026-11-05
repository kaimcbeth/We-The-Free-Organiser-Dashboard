"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

// Birthday (day and month, no year). Saved as soon as both are picked.
// On the day, the community gets an action to wish them happy birthday in
// the WhatsApp chat. Used on members' own profile and on People profiles.
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAYS_IN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function BirthdayField({
  personId,
  month: m0,
  day: d0,
  label = "Birthday",
  hint,
  dryRun = false,
  inForm = false,
}: {
  personId: string;
  month: number | null;
  day: number | null;
  label?: string;
  hint?: string;
  dryRun?: boolean;
  inForm?: boolean; // looks like the other boxes in a details form
}) {
  const [month, setMonth] = useState<number | null>(m0);
  const [day, setDay] = useState<number | null>(d0);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  const save = (m: number | null, d: number | null) => {
    setNote("");
    if ((m === null) !== (d === null) || dryRun) return;
    start(async () => {
      const { data, error } = await createClient().rpc("set_birthday", {
        p_person_id: personId,
        p_month: m,
        p_day: d,
      });
      setNote(error || !data ? "Couldn't save that. Please try again." : "");
    });
  };

  const max = month ? DAYS_IN[month - 1] : 31;
  const sel = inForm
    ? "rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-base disabled:opacity-60"
    : "rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm disabled:opacity-60";
  return (
    <div className="text-sm">
      <p
        className={
          inForm
            ? "mb-1.5 block text-sm font-medium text-stone-700"
            : "font-medium text-stone-700"
        }
      >
        {label}
      </p>
      {hint && <p className="text-xs text-stone-500">{hint}</p>}
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <select
          aria-label="Day"
          value={day ?? ""}
          disabled={pending}
          onChange={(e) => {
            const d = e.target.value ? Number(e.target.value) : null;
            setDay(d);
            save(month, d);
          }}
          className={sel}
        >
          <option value="">Day</option>
          {Array.from({ length: max }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>
        <select
          aria-label="Month"
          value={month ?? ""}
          disabled={pending}
          onChange={(e) => {
            const m = e.target.value ? Number(e.target.value) : null;
            const d = m && day && day > DAYS_IN[m - 1] ? null : day;
            setMonth(m);
            setDay(d);
            save(m, d);
          }}
          className={sel}
        >
          <option value="">Month</option>
          {MONTHS.map((name, i) => (
            <option key={name} value={i + 1}>
              {name}
            </option>
          ))}
        </select>
        {(month || day) && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setMonth(null);
              setDay(null);
              save(null, null);
            }}
            className="text-xs text-stone-400 hover:text-navy hover:underline"
          >
            Clear
          </button>
        )}
      </div>
      {note && <p className="mt-1 text-red-700">{note}</p>}
    </div>
  );
}
