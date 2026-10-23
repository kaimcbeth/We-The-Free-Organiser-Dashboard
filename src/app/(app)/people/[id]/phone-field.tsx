"use client";

import { useState, useTransition } from "react";
import { setPersonContact, setPersonFacebook } from "@/app/actions";
import { messengerLink } from "@/lib/messenger";

// For people with a role: phone (WhatsApp) and email their Regional Support
// Lead can use. Can be added before they've connected their account.
export function PhoneField({
  personId,
  initial,
  initialEmail,
  initialFacebook,
}: {
  personId: string;
  initial: string;
  initialEmail: string;
  initialFacebook: string;
}) {
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(initial);
  const [email, setEmail] = useState(initialEmail);
  const [facebook, setFacebook] = useState(initialFacebook);
  const [saved, setSaved] = useState({
    phone: initial,
    email: initialEmail,
    facebook: initialFacebook,
  });
  const messenger = messengerLink(saved.facebook);
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
        {messenger && (
          <a
            href={messenger}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-[#0866FF] px-2 py-0.5 text-xs font-semibold text-white hover:brightness-110"
          >
            Messenger ↗
          </a>
        )}
        <button
          onClick={() => setEditing(true)}
          className="rounded-lg px-1.5 py-0.5 text-xs font-medium text-pink-ink hover:bg-stone-100"
        >
          {saved.phone || saved.email || saved.facebook ? "Change" : "Add"}
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
          if (r.error) return setError(r.error);
          if (facebook !== saved.facebook) {
            const f = await setPersonFacebook(personId, facebook);
            if (f.error) return setError(f.error);
          }
          setError("");
          setSaved({
            phone: phone.trim(),
            email: email.trim().toLowerCase(),
            facebook: facebook.trim(),
          });
          setEditing(false);
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
      <input
        type="url"
        value={facebook}
        onChange={(e) => setFacebook(e.target.value)}
        placeholder="Facebook profile link"
        aria-label="Facebook profile link"
        className="w-64 rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-sm"
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
          setFacebook(saved.facebook);
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
