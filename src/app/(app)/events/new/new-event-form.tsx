"use client";

import { useActionState } from "react";
import { createEvent, type FormState } from "@/app/actions";
import { Field, inputClass } from "@/components/form";

export function NewEventForm({
  types,
  today,
}: {
  types: { id: string; name: string }[];
  today: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    createEvent,
    {},
  );

  return (
    <form
      action={action}
      className="mt-6 space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5"
    >
      <Field label="Title" htmlFor="title">
        <input
          id="title"
          name="title"
          required
          className={inputClass}
          placeholder="e.g. Picnic in Hyde Park"
        />
      </Field>

      <Field label="Type" htmlFor="event_type_id">
        <select
          id="event_type_id"
          name="event_type_id"
          className={inputClass}
          defaultValue={types[0]?.id}
        >
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Date" htmlFor="date">
        <input
          id="date"
          name="date"
          type="date"
          required
          defaultValue={today}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Start" htmlFor="start">
          <input
            id="start"
            name="start"
            type="time"
            required
            className={inputClass}
          />
        </Field>
        <Field label="End" htmlFor="end" hint="optional">
          <input id="end" name="end" type="time" className={inputClass} />
        </Field>
      </div>

      <Field label="Venue" htmlFor="venue" hint="optional">
        <input
          id="venue"
          name="venue"
          className={inputClass}
          placeholder="e.g. Town Hall Square"
        />
      </Field>

      <Field label="Address" htmlFor="address" hint="optional">
        <input id="address" name="address" className={inputClass} />
      </Field>

      {state.error && <p className="text-sm text-red-700">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-pink px-4 py-3 font-semibold text-navy hover:bg-pink-strong disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save and open check-in"}
      </button>
    </form>
  );
}
