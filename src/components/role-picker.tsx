"use client";

import { useState, useTransition } from "react";
import { grantRole } from "@/app/actions";
import { Sheet } from "@/components/sheet";
import { RoleChip } from "@/components/role-chip";
import {
  addAsLabel,
  ROLE_ACCENT,
  ROLE_INFO,
  ROLE_LABEL,
  ROLE_RANK,
  type Access,
  type ViewRole,
} from "@/lib/roles";

// A person's role chip; tap it to give them a role (only roles below yours).
export function RolePicker({
  personId,
  firstName,
  connected,
  current,
  gives,
  regions,
  compact,
}: {
  personId: string;
  firstName: string;
  connected: boolean;
  current: Access | null;
  gives: Access[]; // roles the viewer can hand out
  regions: { id: string; name: string }[];
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Access | null>(current);
  const [pick, setPick] = useState<Access>(
    current && gives.includes(current) ? current : gives[gives.length - 1],
  );
  const [region, setRegion] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const shown: ViewRole = role ?? "member";
  // Can't change someone at or above the highest role you can give.
  const canChange =
    gives.length > 0 && (!role || ROLE_RANK[role] <= ROLE_RANK[gives[0]]);

  // In lists, plain attendees without an account show nothing (they can't have a role yet).
  if (compact && !role && !connected) return null;
  if (!canChange) return <RoleChip role={shown} />;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center gap-1 rounded-full hover:opacity-80"
        aria-label={`Role: ${ROLE_LABEL[shown]}. Change`}
      >
        {compact && !role ? (
          <span className="rounded-full px-2 py-0.5 text-xs font-semibold text-pink-ink ring-1 ring-pink/50">
            + Role
          </span>
        ) : (
          <RoleChip role={shown} />
        )}
        {!compact && <span className="text-xs text-stone-400">▾</span>}
      </button>
      {open && (
        <Sheet title={`${firstName}'s role`} onClose={() => setOpen(false)}>
          {!connected ? (
            <p className="text-sm text-stone-600">
              {firstName} needs to connect their account before they can have a
              role. Open their profile and show them their connect QR.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-stone-600">
                {role ? (
                  <>
                    {firstName} is currently{" "}
                    <span className="font-medium text-stone-900">
                      {ROLE_LABEL[role]}
                    </span>
                    .
                  </>
                ) : (
                  <>
                    Give {firstName} a role to let them help run things. Pick
                    one:
                  </>
                )}
              </p>
              <div className="space-y-2" role="radiogroup" aria-label="Role">
                {gives.map((r) => {
                  const info = ROLE_INFO[r];
                  const selected = pick === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setPick(r)}
                      className={`w-full rounded-xl border-l-4 bg-white p-3 text-left ring-1 transition ${ROLE_ACCENT[r]} ${
                        selected
                          ? "ring-2 ring-navy"
                          : "ring-stone-200 hover:ring-stone-300"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2">
                          <span
                            aria-hidden
                            className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                              selected ? "border-navy" : "border-stone-300"
                            }`}
                          >
                            {selected && (
                              <span className="h-2 w-2 rounded-full bg-navy" />
                            )}
                          </span>
                          <span className="font-semibold">{ROLE_LABEL[r]}</span>
                        </span>
                        {role === r && (
                          <span className="text-xs text-stone-500">
                            Current
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block text-sm text-stone-600">
                        {info.summary}
                      </span>
                      <ul className="mt-1.5 space-y-0.5 text-sm text-stone-600">
                        {info.can.map((c) => (
                          <li key={c} className="flex gap-1.5">
                            <span aria-hidden className="text-cyan">
                              ✓
                            </span>
                            {c}
                          </li>
                        ))}
                        {info.cannot && (
                          <li className="flex gap-1.5 text-stone-500">
                            <span aria-hidden>–</span>
                            {info.cannot}
                          </li>
                        )}
                      </ul>
                    </button>
                  );
                })}
              </div>
              {pick === "regional_lead" && (
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  aria-label="Region"
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2"
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
                disabled={
                  pending ||
                  (pick === role && pick !== "regional_lead") ||
                  (pick === "regional_lead" && !region)
                }
                onClick={() =>
                  start(async () => {
                    const r = await grantRole(
                      personId,
                      pick,
                      pick === "regional_lead" ? region : null,
                    );
                    if (r.error) setError(r.error);
                    else {
                      setError("");
                      setRole(pick);
                      setOpen(false);
                    }
                  })
                }
                className="w-full rounded-xl bg-pink px-4 py-2.5 font-semibold text-navy hover:bg-pink-strong disabled:opacity-40"
              >
                {pending ? "Saving…" : addAsLabel(firstName, pick)}
              </button>
              {error && <p className="text-sm text-red-700">{error}</p>}
              {role && (
                <p className="text-xs text-stone-500">
                  Taking a role away completely is coming soon.
                </p>
              )}
            </div>
          )}
        </Sheet>
      )}
    </>
  );
}
