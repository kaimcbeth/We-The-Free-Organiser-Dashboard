"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { BEST_CONTACT } from "@/lib/contact";

// "Best way to reach them" on a profile (Kai, 4 Nov 2026). Phone numbers and
// emails live in the contact details above; Instagram/Facebook keep a handle.
export function BestContact({
  personId,
  initial,
  initialHandle,
}: {
  personId: string;
  initial: string | null;
  initialHandle: string | null;
}) {
  const [value, setValue] = useState(initial ?? "");
  const [handle, setHandle] = useState(initialHandle ?? "");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const social = value === "instagram" || value === "facebook";

  function save(next: string, nextHandle: string) {
    start(async () => {
      const { data, error } = await createClient().rpc("set_newcomer_details", {
        p_person_id: personId,
        p_best_contact: next || null,
        p_contact:
          next === "instagram" || next === "facebook" ? nextHandle : null,
      });
      setMsg(
        error || !data ? "Couldn't save that. Please try again." : "Saved",
      );
      if (!error && data) setTimeout(() => setMsg(""), 1500);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-stone-600">Best way to reach them</span>
      <select
        value={value}
        disabled={pending}
        onChange={(e) => {
          setValue(e.target.value);
          if (e.target.value) save(e.target.value, handle);
        }}
        className="rounded-lg bg-white px-2 py-1 text-sm ring-1 ring-black/10"
      >
        {!value && <option value="">Not known</option>}
        {BEST_CONTACT.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
      {social && (
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          onBlur={() => handle !== (initialHandle ?? "") && save(value, handle)}
          placeholder={
            value === "instagram" ? "@handle" : "Name or profile link"
          }
          aria-label={
            value === "instagram" ? "Instagram handle" : "Facebook name or link"
          }
          className="w-48 rounded-lg bg-white px-2 py-1 text-sm ring-1 ring-black/10"
        />
      )}
      {msg && <span className="text-xs text-stone-500">{msg}</span>}
    </div>
  );
}
