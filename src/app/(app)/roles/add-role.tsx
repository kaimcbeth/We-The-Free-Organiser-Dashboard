"use client";

import { useMemo, useState, useTransition } from "react";
import { grantRole } from "@/app/actions";
import { addAsLabel, ROLE_LABEL, type Access } from "@/lib/roles";
import { inputClass } from "@/components/form";
import type { Candidate } from "./page";

export function AddRole({
  candidates,
  roles,
  regions,
}: {
  candidates: Candidate[];
  roles: Access[];
  regions: { id: string; name: string }[];
}) {
  const [query, setQuery] = useState("");
  const [person, setPerson] = useState<Candidate | null>(null);
  const [role, setRole] = useState<Access>(roles[roles.length - 1]);
  const [region, setRegion] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return candidates
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [candidates, query]);

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <h2 className="font-semibold">Give someone a role</h2>
      <p className="text-sm text-stone-500">
        They need to have connected their account.
      </p>

      {person ? (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2">
          <span>
            <span className="font-medium">{person.name}</span>
            <span className="text-sm text-stone-500">
              {" "}
              · {person.team}
              {person.role ? ` · now ${ROLE_LABEL[person.role]}` : ""}
            </span>
          </span>
          <button
            onClick={() => setPerson(null)}
            className="text-sm text-stone-500 hover:text-stone-800"
          >
            Change
          </button>
        </div>
      ) : (
        <div className="mt-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search members by name"
            aria-label="Search members"
            className={inputClass}
          />
          {query.trim() && (
            <ul className="mt-2 divide-y divide-black/5 rounded-xl ring-1 ring-black/5">
              {matches.length === 0 ? (
                <li className="px-3 py-2 text-sm text-stone-500">
                  No one with an account matches.
                </li>
              ) : (
                matches.map((c) => (
                  <li key={c.person_id}>
                    <button
                      onClick={() => {
                        setPerson(c);
                        setQuery("");
                        setMsg(null);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-stone-50"
                    >
                      <span className="font-medium">{c.name}</span>
                      <span className="text-sm text-stone-500">
                        {" "}
                        · {c.team}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}

      <div
        className="mt-3 flex flex-wrap gap-2"
        role="radiogroup"
        aria-label="Role"
      >
        {roles.map((r) => (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={role === r}
            onClick={() => setRole(r)}
            className={`rounded-xl px-3 py-2 text-sm font-semibold ring-1 ${
              role === r
                ? "bg-navy text-white ring-navy"
                : "bg-white text-navy ring-stone-300 hover:bg-stone-50"
            }`}
          >
            {ROLE_LABEL[r]}
          </button>
        ))}
      </div>

      {role === "regional_lead" && (
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          aria-label="Region"
          className="mt-3 w-full rounded-xl border border-stone-300 bg-white px-3 py-2"
        >
          <option value="">Pick a region…</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      )}

      <button
        disabled={!person || pending || (role === "regional_lead" && !region)}
        onClick={() =>
          start(async () => {
            if (!person) return;
            const r = await grantRole(
              person.person_id,
              role,
              role === "regional_lead" ? region : null,
            );
            if (r.error) setMsg({ ok: false, text: r.error });
            else {
              setMsg({
                ok: true,
                text: `${person.name} is now ${ROLE_LABEL[role]}.`,
              });
              setPerson(null);
            }
          })
        }
        className="mt-4 w-full rounded-xl bg-pink px-4 py-2.5 font-semibold text-navy hover:bg-pink-strong disabled:opacity-40"
      >
        {pending
          ? "Saving…"
          : person
            ? addAsLabel(person.name.split(" ")[0], role)
            : "Pick someone first"}
      </button>
      {msg && (
        <p
          className={`mt-2 text-sm ${msg.ok ? "text-stone-700" : "text-red-700"}`}
        >
          {msg.text}
        </p>
      )}
    </section>
  );
}
