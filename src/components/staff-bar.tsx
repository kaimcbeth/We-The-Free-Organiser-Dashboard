"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { setActiveTeam, setViewAs } from "@/app/actions";
import type { ViewRole } from "@/lib/roles";
import { signInAsTestPerson } from "@/lib/test-login";

type ViewOption = { value: ViewRole | "new_organiser"; label: string };
const ROLE_OPTIONS: ViewOption[] = [
  { value: "god", label: "God Mode" },
  { value: "regional_lead", label: "Regional Support Lead" },
  { value: "organiser", label: "Organiser" },
  { value: "core_team", label: "Core Team" },
  { value: "member", label: "Member" },
];
const TUTORIAL_OPTIONS: ViewOption[] = [
  { value: "new_organiser", label: "New organiser" },
  { value: "new_member", label: "New member" },
];

// Thin bar under the header: team switcher (when there's more than one team)
// and, for God Mode, "View as".
export function StaffBar({
  teams,
  teamId,
  isGod,
  viewingAs,
  viewValue,
  allowAll = false,
  allCommunities = false,
}: {
  teams: { id: string; name: string }[];
  teamId: string;
  allowAll?: boolean; // offer "All communities" (Regional Support Lead / God)
  allCommunities?: boolean;
  isGod: boolean;
  viewingAs: ViewRole | null;
  viewValue?: string | null;
}) {
  const [pending, start] = useTransition();
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState("");
  if (teams.length < 2 && !isGod) return null;

  return (
    <div
      className={`border-t border-white/10 ${viewingAs ? "bg-yellow text-navy" : "bg-navy-2 text-white"}`}
    >
      <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1.5 text-xs">
        {teams.length > 1 && (
          <label className="flex items-center gap-1.5">
            <span className="opacity-75">Community</span>
            <select
              value={allCommunities ? "all" : teamId}
              disabled={pending}
              onChange={(e) => start(() => setActiveTeam(e.target.value))}
              className="rounded-md bg-white/15 px-1.5 py-0.5 font-medium"
            >
              {allowAll && (
                <option value="all" className="text-navy">
                  All communities
                </option>
              )}
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
              value={viewValue ?? "god"}
              disabled={pending || switching}
              onChange={async (e) => {
                const v = e.target.value;
                if (v === "fergus") {
                  // Really signs in as this community's test account.
                  setSwitching(true);
                  setError("");
                  const err = await signInAsTestPerson({ teamId });
                  if (err) {
                    setSwitching(false);
                    setError(err);
                  }
                  return;
                }
                start(() => setViewAs(v as ViewRole | "new_organiser"));
              }}
              className={`rounded-md px-1.5 py-0.5 font-medium ${viewingAs ? "bg-navy/10" : "bg-white/15"}`}
            >
              <optgroup label="Roles">
                {ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} className="text-navy">
                    {o.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Tutorials">
                {TUTORIAL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} className="text-navy">
                    {o.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Test account">
                <option value="fergus" className="text-navy">
                  Fergus
                </option>
              </optgroup>
            </select>
            {switching && <span className="opacity-75">Switching…</span>}
            {error && <span className="font-semibold">{error}</span>}
          </label>
        )}
        {isGod && !viewingAs && (
          <Link
            href="/test-accounts"
            className="ml-auto rounded-md px-1.5 py-0.5 font-medium opacity-75 hover:bg-white/10 hover:opacity-100"
          >
            Test account
          </Link>
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
