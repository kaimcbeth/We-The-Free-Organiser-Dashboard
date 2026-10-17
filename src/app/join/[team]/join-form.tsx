"use client";

import { useActionState, useRef, useState } from "react";
import { joinTeam, type JoinState } from "@/app/attendee-actions";
import { Field, inputClass } from "@/components/form";
import { ConsentCheckbox } from "@/components/consent-checkbox";

export function JoinForm({ team, email }: { team: string; email: string }) {
  const [state, action, pending] = useActionState<JoinState, FormData>(joinTeam, {});
  const [values, setValues] = useState({ first_name: "", last_name: "", suburb: "", phone: "" });
  const [consent, setConsent] = useState(false);
  const [forceNew, setForceNew] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const field = (name: keyof typeof values) => ({
    id: name,
    name,
    value: values[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setValues((v) => ({ ...v, [name]: e.target.value }));
      setForceNew(false);
    },
    className: inputClass,
  });

  return (
    <form ref={formRef} action={action} className="mt-6 space-y-4">
      <input type="hidden" name="team" value={team} />
      <input type="hidden" name="force_new" value={forceNew ? "true" : "false"} />

      <div className="grid grid-cols-2 gap-3">
        <Field label="First name" htmlFor="first_name">
          <input {...field("first_name")} required autoComplete="given-name" />
        </Field>
        <Field label="Last name" htmlFor="last_name">
          <input {...field("last_name")} autoComplete="family-name" />
        </Field>
      </div>
      <Field label="Suburb" htmlFor="suburb">
        <input {...field("suburb")} />
      </Field>
      <Field label="Mobile" htmlFor="phone" hint="optional">
        <input {...field("phone")} type="tel" autoComplete="tel" />
      </Field>
      <p className="text-sm text-stone-500">
        Email: <span className="font-medium text-stone-800">{email}</span>
      </p>
      <ConsentCheckbox checked={consent} onChange={setConsent} />

      {state.namesTaken && !forceNew ? (
        <div className="rounded-2xl bg-yellow/30 p-4 ring-1 ring-yellow">
          <p className="font-semibold">Have you been to an event already?</p>
          <p className="mt-1 text-sm text-stone-700">
            An organiser has already added{" "}
            <span className="font-medium">{state.namesTaken.join(", ")}</span>. If that&apos;s you, ask an
            organiser to show you your <span className="font-medium">connect QR code</span> so your events come
            with you.
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setForceNew(true);
              // Submit after the hidden field has updated.
              setTimeout(() => formRef.current?.requestSubmit(), 0);
            }}
            className="mt-3 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-navy ring-1 ring-stone-300"
          >
            That&apos;s not me, continue
          </button>
        </div>
      ) : (
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-pink px-4 py-3 font-semibold text-navy hover:bg-pink-strong disabled:opacity-60"
        >
          {pending ? "Saving…" : "Join"}
        </button>
      )}

      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
    </form>
  );
}
