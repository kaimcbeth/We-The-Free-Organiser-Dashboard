"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { movePersonToTeam } from "@/app/actions";

// "Community: Sydney · Change" on a profile (God Mode and RSLs).
export function MoveCommunity({
  personId,
  firstName,
  current,
  teams,
}: {
  personId: string;
  firstName: string;
  current: { id: string; name: string };
  teams: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [to, setTo] = useState(current.id);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const short = (n: string) => n.replace(/, (Australia|New Zealand)$/, "");

  if (!editing)
    return (
      <p className="mt-1 text-sm text-stone-500">
        Community: {short(current.name)}{" "}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs text-stone-400 hover:text-stone-700 hover:underline"
        >
          Change
        </button>
      </p>
    );
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
      <span className="text-stone-500">Move {firstName} to</span>
      <select
        value={to}
        onChange={(e) => setTo(e.target.value)}
        className="rounded-lg bg-white px-2 py-1 ring-1 ring-black/10"
      >
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {short(t.name)}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={pending || to === current.id}
        onClick={() =>
          start(async () => {
            const r = await movePersonToTeam(personId, to);
            if (r.error) return setError(r.error);
            router.push("/people");
          })
        }
        className="rounded-lg bg-navy px-3 py-1 font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Moving…" : "Move"}
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="text-xs text-stone-400 hover:text-stone-700"
      >
        Cancel
      </button>
      {error && <p className="w-full text-xs text-red-700">{error}</p>}
    </div>
  );
}
