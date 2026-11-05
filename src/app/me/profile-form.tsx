"use client";

import { useActionState, useState } from "react";
import { updateMyProfile, type ProfileState } from "@/app/attendee-actions";
import { Field, inputClass } from "@/components/form";
import { ConsentCheckbox } from "@/components/consent-checkbox";
import { BirthdayField } from "@/components/birthday-field";

type Me = {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string | null;
  suburb: string | null;
  email: string | null;
  consent_marketing: boolean;
  birth_month: number | null;
  birth_day: number | null;
};

export function ProfileForm({ me }: { me: Me }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(
    updateMyProfile,
    {},
  );
  const [values, setValues] = useState({
    first_name: me.first_name,
    last_name: me.last_name ?? "",
    suburb: me.suburb ?? "",
    phone: me.phone ?? "",
  });
  const [consent, setConsent] = useState(me.consent_marketing);

  const field = (name: keyof typeof values) => ({
    id: name,
    name,
    value: values[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setValues((v) => ({ ...v, [name]: e.target.value })),
    className: inputClass,
  });

  return (
    <form
      action={action}
      className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5"
    >
      <input type="hidden" name="person_id" value={me.id} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name" htmlFor="first_name">
          <input {...field("first_name")} required />
        </Field>
        <Field label="Last name" htmlFor="last_name">
          <input {...field("last_name")} />
        </Field>
      </div>
      <Field label="Suburb" htmlFor="suburb">
        <input {...field("suburb")} />
      </Field>
      <Field label="Mobile" htmlFor="phone">
        <input {...field("phone")} type="tel" />
      </Field>
      {/* Saves on its own as soon as day and month are picked. */}
      <BirthdayField
        personId={me.id}
        month={me.birth_month}
        day={me.birth_day}
        label="Birthday"
        hint="Optional. Day and month only, so we can wish you happy birthday in the WhatsApp chat."
        inForm
      />
      {me.email && (
        <p className="text-sm text-stone-500">
          Email: <span className="font-medium text-stone-800">{me.email}</span>
        </p>
      )}
      <ConsentCheckbox checked={consent} onChange={setConsent} />
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-pink px-4 py-3 font-semibold text-navy hover:bg-pink-strong disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save details"}
      </button>
      {state.saved && !pending && (
        <p className="text-sm text-stone-600">Saved.</p>
      )}
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
    </form>
  );
}
