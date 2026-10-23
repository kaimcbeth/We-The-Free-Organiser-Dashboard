"use client";

import { useState, useTransition } from "react";
import { setPersonContact } from "@/app/actions";

// For people with a role: phone (WhatsApp) and email their Regional Support
// Lead can use. Can be added before they've connected their account.
export function PhoneField({
  personId,
  initial,
  initialEmail,
}: {
  personId: string;
  initial: string;
  initialEmail: string;
}) {
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(initial);
  const [email, setEmail] = useState(initialEmail);
  const [saved, setSaved] = useState({ phone: initial, email: initialEmail });
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  if (!editing)
    return (
      <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-stone-500">Contact:</span>
        <span
          className={
            saved.phone || saved.email ? "font-medium" : "text-stone-400"
          }
        >
          {[saved.phone, saved.email].filter(Boolean).join(" · ") ||
            "No phone or email yet"}
        </span>
        <button
          onClick={() => setEditing(true)}
          className="rounded-lg px-1.5 py-0.5 text-xs font-medium text-pink-ink hover:bg-stone-100"
        >
          {saved.phone || saved.email ? "Change" : "Add"}
        </button>
      </p>
    );

  return (
    <form
      className="mt-2 flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await setPersonContact(personId, phone, email);
          if (r.error) setError(r.error);
          else {
            setError("");
            setSaved({
              phone: phone.trim(),
              email: email.trim().toLowerCase(),
            });
            setEditing(false);
          }
        });
      }}
    >
      <input
        autoFocus
        type="tel"
        inputMode="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Phone (WhatsApp)"
        aria-label="Phone"
        className="w-44 rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-sm"
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        aria-label="Email"
        className="w-56 rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-sm"
      />
      <button
        disabled={pending}
        className="rounded-xl bg-navy px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      <button
        type="button"
        onClick={() => {
          setPhone(saved.phone);
          setEmail(saved.email);
          setEditing(false);
          setError("");
        }}
        className="rounded-xl px-2 py-1.5 text-sm text-stone-500 hover:bg-stone-100"
      >
        Cancel
      </button>
      {error && <p className="w-full text-sm text-red-700">{error}</p>}
    </form>
  );
}
