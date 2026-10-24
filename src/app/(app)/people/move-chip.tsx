"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { movePersonToTeam } from "@/app/actions";

// Subtle "Move" beside a name on the People list (God Mode and RSLs): moves
// them to another community. Sits inside the row's link, so it stops clicks
// from opening the profile.
export function MoveChip({
  personId,
  currentTeamId,
  communities,
}: {
  personId: string;
  currentTeamId: string;
  communities: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const short = (n: string) => n.replace(/, (Australia|New Zealand)$/, "");

  return (
    <span
      className="relative shrink-0"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="rounded-full px-2 py-0.5 text-xs font-medium text-stone-400 ring-1 ring-stone-200 hover:text-navy hover:ring-stone-300"
      >
        Move
      </button>
      {open && (
        <span className="absolute left-0 top-7 z-20 flex items-center gap-2 rounded-xl bg-white p-2 text-sm font-normal shadow-lg ring-1 ring-black/10">
          <span className="whitespace-nowrap text-stone-500">Move to</span>
          <select
            defaultValue=""
            disabled={pending}
            onChange={(e) => {
              const to = e.target.value;
              if (!to) return;
              start(async () => {
                const r = await movePersonToTeam(personId, to);
                if (r.error) return setError(r.error);
                setOpen(false);
                router.refresh();
              });
            }}
            className="rounded-lg bg-white px-2 py-1 ring-1 ring-black/10"
          >
            <option value="">Pick a community…</option>
            {communities
              .filter((c) => c.id !== currentTeamId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {short(c.name)}
                </option>
              ))}
          </select>
          {pending && <span className="text-xs text-stone-400">Moving…</span>}
          {error && <span className="text-xs text-red-700">{error}</span>}
        </span>
      )}
    </span>
  );
}
