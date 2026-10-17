"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { createPerson, type FormState } from "@/app/actions";
import { Field, inputClass } from "@/components/form";

export type PersonRow = {
  id: string;
  first_name: string;
  last_name: string | null;
  suburb: string | null;
  email: string | null;
  phone: string | null;
  events: number;
};

export function PeopleList({ people }: { people: PersonRow[] }) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) =>
      [p.first_name, p.last_name, p.suburb, p.email].filter(Boolean).join(" ").toLowerCase().includes(q),
    );
  }, [people, query]);

  return (
    <div className="mt-5">
      <div className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, suburb or email"
          aria-label="Search people"
          className={inputClass}
        />
        <button
          onClick={() => setAdding((a) => !a)}
          className="shrink-0 rounded-xl bg-brand px-4 font-semibold text-white hover:bg-brand-strong"
        >
          Add
        </button>
      </div>

      {adding && <AddPersonForm onDone={() => setAdding(false)} />}

      {visible.length === 0 ? (
        <p className="mt-6 text-center text-sm text-stone-500">
          {people.length === 0 ? "No one in the list yet." : `No one matches “${query}”.`}
        </p>
      ) : (
        <ul className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          {visible.map((p) => (
            <li key={p.id} className="flex items-center gap-3 border-b border-black/5 px-4 py-3 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{[p.first_name, p.last_name].filter(Boolean).join(" ")}</p>
                <p className="truncate text-sm text-stone-500">
                  {[p.suburb, p.email, p.phone].filter(Boolean).join(" · ") || "No details yet"}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold tabular-nums">{p.events}</p>
                <p className="text-xs text-stone-500">{p.events === 1 ? "event" : "events"}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AddPersonForm({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState<FormState & { ok?: boolean }, FormData>(
    async (prev, formData) => {
      const result = await createPerson(prev, formData);
      return result.error ? result : { ok: true };
    },
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      onDone();
    }
  }, [state, onDone]);

  return (
    <form ref={formRef} action={action} className="mt-4 space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-2 ring-brand/30">
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name" htmlFor="first_name">
          <input id="first_name" name="first_name" required autoFocus className={inputClass} />
        </Field>
        <Field label="Last name" htmlFor="last_name">
          <input id="last_name" name="last_name" className={inputClass} />
        </Field>
      </div>
      <Field label="Suburb" htmlFor="suburb">
        <input id="suburb" name="suburb" className={inputClass} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Email" htmlFor="email" hint="optional">
          <input id="email" name="email" type="email" className={inputClass} />
        </Field>
        <Field label="Phone" htmlFor="phone" hint="optional">
          <input id="phone" name="phone" type="tel" className={inputClass} />
        </Field>
      </div>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-brand px-4 py-2.5 font-semibold text-white hover:bg-brand-strong disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save person"}
      </button>
    </form>
  );
}
