"use client";

import { useState, useTransition } from "react";
import {
  clearPendingRole,
  grantRole,
  setCoreRoles,
  setPersonContact,
} from "@/app/actions";
import { Sheet } from "@/components/sheet";
import { RoleChip } from "@/components/role-chip";
import {
  addAsLabel,
  CORE_ROLE_BLURB,
  CORE_ROLE_LABEL,
  CORE_ROLES,
  type CoreRole,
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
  pending: startsPending = false,
  leads = [],
  communities = [],
  homeTeamId,
  roleTeamId,
  phone = "",
  email = "",
}: {
  personId: string;
  firstName: string;
  connected: boolean;
  current: Access | null;
  gives: Access[]; // roles the viewer can hand out
  regions: { id: string; name: string }[];
  compact?: boolean;
  pending?: boolean; // the role waits until they connect their account
  leads?: CoreRole[]; // Core Team lead roles
  communities?: { id: string; name: string }[]; // where they could be Organiser
  homeTeamId?: string; // the community their profile is in
  roleTeamId?: string | null; // the community they're (going to be) Organiser for
  phone?: string;
  email?: string;
}) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Access | null>(current);
  const [isPending, setIsPending] = useState(startsPending && !!current);
  const [pick, setPick] = useState<Access>(
    current && gives.includes(current) ? current : gives[gives.length - 1],
  );
  const [region, setRegion] = useState("");
  const [roleTeam, setRoleTeam] = useState(roleTeamId ?? homeTeamId ?? "");
  const [community, setCommunity] = useState(roleTeam);
  const [contact, setContact] = useState({ phone, email });
  const contactChanged = contact.phone !== phone || contact.email !== email;
  const [savedLeads, setSavedLeads] = useState<CoreRole[]>(leads);
  const [leadPick, setLeadPick] = useState<Set<CoreRole>>(new Set(leads));
  const leadsChanged =
    leadPick.size !== savedLeads.length ||
    savedLeads.some((l) => !leadPick.has(l));
  // e.g. "Core Team · Promo Lead", or "Organiser · Sunshine Coast" when
  // they run a different community from the one their profile is in.
  const otherCommunity =
    role === "organiser" && roleTeam && homeTeamId && roleTeam !== homeTeamId
      ? communities
          .find((c) => c.id === roleTeam)
          ?.name.replace(/, (Australia|New Zealand|Canada)$/, "")
      : undefined;
  const detail =
    role === "core_team" && savedLeads.length
      ? savedLeads.map((l) => CORE_ROLE_LABEL[l]).join(" & ")
      : otherCommunity;
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const shown: ViewRole = role ?? (connected ? "member" : "attendee");
  // Can't change someone at or above the highest role you can give.
  const canChange =
    gives.length > 0 && (!role || ROLE_RANK[role] <= ROLE_RANK[gives[0]]);

  if (!canChange)
    return <RoleChip role={shown} pending={isPending} detail={detail} />;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-tour={compact && !role ? "role-button" : undefined}
        className="inline-flex shrink-0 items-center gap-1 rounded-full hover:opacity-80"
        aria-label={`Role: ${ROLE_LABEL[shown]}. Change`}
      >
        {compact && !role ? (
          <span className="rounded-full px-2 py-0.5 text-xs font-semibold text-pink-ink ring-1 ring-pink/50">
            + Role
          </span>
        ) : (
          <RoleChip role={shown} pending={isPending} detail={detail} />
        )}
        {!compact && <span className="text-xs text-stone-400">▾</span>}
      </button>
      {open && (
        <Sheet title={`${firstName}'s role`} onClose={() => setOpen(false)}>
          {
            <div className="space-y-3">
              <p className="text-sm text-stone-600">
                {role && isPending ? (
                  <>
                    {firstName} will be{" "}
                    <span className="font-medium text-stone-900">
                      {ROLE_LABEL[role]}
                    </span>{" "}
                    as soon as they connect their account.
                  </>
                ) : role ? (
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
              {pick === "organiser" && communities.length > 1 && (
                <label className="block">
                  <span className="mb-1 block text-sm font-medium">
                    Organiser for
                  </span>
                  <select
                    value={community}
                    onChange={(e) => setCommunity(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2"
                  >
                    {communities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <details
                className="rounded-xl bg-white p-3 ring-1 ring-stone-200"
                open={!connected && !phone && !email}
              >
                <summary className="cursor-pointer text-sm font-medium">
                  Contact details{" "}
                  <span className="font-normal text-stone-500">
                    {phone || email
                      ? [phone, email].filter(Boolean).join(" · ")
                      : "(optional)"}
                  </span>
                </summary>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <input
                    type="tel"
                    value={contact.phone}
                    onChange={(e) =>
                      setContact({ ...contact, phone: e.target.value })
                    }
                    placeholder="Phone (WhatsApp)"
                    aria-label="Phone"
                    className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="email"
                    value={contact.email}
                    onChange={(e) =>
                      setContact({ ...contact, email: e.target.value })
                    }
                    placeholder="Email"
                    aria-label="Email"
                    className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  />
                </div>
              </details>
              {pick === "core_team" && (
                <fieldset className="space-y-2">
                  <legend className="mb-1 text-sm font-medium">
                    Which area will {firstName} look after?
                  </legend>
                  {CORE_ROLES.map((l) => (
                    <label
                      key={l}
                      className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-white p-2.5 ring-1 ring-stone-200 hover:ring-stone-300"
                    >
                      <input
                        type="checkbox"
                        checked={leadPick.has(l)}
                        onChange={() => {
                          const next = new Set(leadPick);
                          if (next.has(l)) next.delete(l);
                          else next.add(l);
                          setLeadPick(next);
                        }}
                        className="mt-1 h-4 w-4"
                      />
                      <span>
                        <span className="block text-sm font-semibold">
                          {CORE_ROLE_LABEL[l]}
                        </span>
                        <span className="block text-xs text-stone-500">
                          {CORE_ROLE_BLURB[l]}
                        </span>
                      </span>
                    </label>
                  ))}
                  <p className="text-xs text-stone-500">
                    {firstName} then picks the tasks they&apos;ll look after.
                  </p>
                </fieldset>
              )}
              <button
                disabled={
                  pending ||
                  (pick === role &&
                    pick !== "regional_lead" &&
                    !(pick === "core_team" && leadsChanged) &&
                    !(pick === "organiser" && community !== roleTeam) &&
                    !contactChanged) ||
                  (pick === "regional_lead" && !region) ||
                  (pick === "core_team" && leadPick.size === 0)
                }
                onClick={() =>
                  start(async () => {
                    if (
                      pick !== role ||
                      pick === "regional_lead" ||
                      (pick === "organiser" && community !== roleTeam)
                    ) {
                      const r = await grantRole(
                        personId,
                        pick,
                        pick === "regional_lead" ? region : null,
                        pick === "organiser" && community ? community : null,
                      );
                      if (r.error) return setError(r.error);
                    }
                    if (contactChanged) {
                      const r = await setPersonContact(
                        personId,
                        contact.phone,
                        contact.email,
                      );
                      if (r.error) return setError(r.error);
                    }
                    if (pick === "core_team" && leadsChanged) {
                      const r = await setCoreRoles(personId, [...leadPick]);
                      if (r.error) return setError(r.error);
                      setSavedLeads([...leadPick]);
                    }
                    if (pick === "organiser") setRoleTeam(community);
                    setError("");
                    setRole(pick);
                    setIsPending(!connected);
                    setOpen(false);
                  })
                }
                className="w-full rounded-xl bg-pink px-4 py-2.5 font-semibold text-navy hover:bg-pink-strong disabled:opacity-40"
              >
                {pending
                  ? "Saving…"
                  : pick === role
                    ? "Save"
                    : addAsLabel(firstName, pick)}
              </button>
              {!connected && (
                <p className="text-xs text-stone-500">
                  {firstName} hasn&apos;t connected their account yet. The role
                  starts as soon as they do.
                </p>
              )}
              {error && <p className="text-sm text-red-700">{error}</p>}
              {role && isPending && (
                <button
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const r = await clearPendingRole(personId);
                      if (r.error) setError(r.error);
                      else {
                        setError("");
                        setRole(null);
                        setIsPending(false);
                        setOpen(false);
                      }
                    })
                  }
                  className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50"
                >
                  Don&apos;t give {firstName} a role
                </button>
              )}
              {role && !isPending && (
                <p className="text-xs text-stone-500">
                  Taking a role away completely is coming soon.
                </p>
              )}
            </div>
          }
        </Sheet>
      )}
    </>
  );
}
