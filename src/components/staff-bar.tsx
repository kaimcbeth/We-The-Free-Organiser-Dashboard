"use client";

import { useTransition } from "react";
import { setActiveTeam, setViewAs } from "@/app/actions";
import type { ViewRole } from "@/lib/roles";

const VIEW_OPTIONS: { value: ViewRole; label: string }[] = [
  { value: "god", label: "God Mode" },
  { value: "regional_lead", label: "Regional Support Lead" },
  { value: "organiser", label: "Organiser" },
  { value: "core_team", label: "Core Team" },
  { value: "member", label: "Attendee" },
];

// Thin bar under the header: team switcher (when there's more than one team)
// and, for God Mode, "View as".
export function StaffBar({
  teams,
  teamId,
  isGod,
  viewingAs,
}: {
  teams: { id: string; name: string }[];
  teamId: string;
  isGod: boolean;
  viewingAs: ViewRole | null;
}) {
  const [pending, start] = useTransition();
  if (teams.length < 2 && !isGod) return null;

  return (
    <div
      className={`border-t border-white/10 ${viewingAs ? "bg-yellow text-navy" : "bg-navy-2 text-white"}`}
    >
      <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1.5 text-xs">
        {teams.length > 1 && (
          <label className="flex items-center gap-1.5">
            <span className="opacity-75">Team</span>
            <select
              value={teamId}
              disabled={pending}
              onChange={(e) => start(() => setActiveTeam(e.target.value))}
              className="rounded-md bg-white/15 px-1.5 py-0.5 font-medium"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id} className="text-navy">
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {isGod && (
          <label className="flex items-center gap-1.5">
            <span className={viewingAs ? "font-semibold" : "opacity-75"}>
              {viewingAs ? "Previewing as" : "View as"}
            </span>
            <select
              value={viewingAs ?? "god"}
              disabled={pending}
              onChange={(e) =>
                start(() => setViewAs(e.target.value as ViewRole))
              }
              className={`rounded-md px-1.5 py-0.5 font-medium ${viewingAs ? "bg-navy/10" : "bg-white/15"}`}
            >
              {VIEW_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="text-navy">
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {viewingAs && (
          <button
            onClick={() => start(() => setViewAs(null))}
            className="ml-auto rounded-md bg-navy px-2 py-0.5 font-semibold text-white"
          >
            Exit preview
          </button>
        )}
      </div>
    </div>
  );
}
