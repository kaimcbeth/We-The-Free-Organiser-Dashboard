"use client";

import { MoveChip } from "./move-chip";
import { useFindShortcut } from "@/lib/use-find-shortcut";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { createPerson, setAttendedBefore, type FormState } from "@/app/actions";
import { Field, inputClass } from "@/components/form";
import { Avatar } from "@/components/avatar";
import { RolePicker } from "@/components/role-picker";
import { RoleChip } from "@/components/role-chip";
import { MessengerButton } from "@/components/messenger-button";
import { WhatsAppButton } from "@/components/whatsapp-button";
import type { Access, CoreRole } from "@/lib/roles";
import { REGULAR_EVENTS, type Engagement, type Status } from "@/lib/engagement";
import { EngagementBar } from "@/components/engagement-bar";
import { driftText, type Drift } from "@/lib/drift";

export type PersonRow = {
  id: string;
  first_name: string;
  last_name: string | null;
  suburb: string | null;
  email: string | null;
  phone: string | null;
  connected: boolean;
  rolePending: boolean;
  roleTeamId: string | null;
  facebook_url: string | null;
  leads: CoreRole[];
  photoUrl: string | null;
  events: number;
  attendedBefore: boolean; // came before the app: never a first-timer
  status: Status | null; // First-timer, Newcomer, Regular, Occasional
  new_to_activism: boolean;
  recent: number; // events in the last 3 months
  engagement: Engagement | null;
  drift: Drift | null; // "Not seen in a while"
  role: Access | null;
};

export function PeopleList({
  people,
  gives,
  regions,
  communities = [],
  homeTeamId,
  withContact = false,
  tz,
  initialFilter = "all",
  regionRoles = null,
  canMove = false,
}: {
  canMove?: boolean; // God Mode / RSLs: "Move" to another community
  initialFilter?: Filter;
  // "All communities": everyone with a role across them (for "Has a role").
  regionRoles?: RegionRole[] | null;
  withContact?: boolean;
  tz: string;
  people: PersonRow[];
  gives: Access[];
  regions: { id: string; name: string }[];
  communities?: { id: string; name: string }[];
  homeTeamId?: string;
}) {
  const [query, setQuery] = useState("");
  const searchRef = useFindShortcut();
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<Filter>(initialFilter);

  const counts = useMemo(() => {
    const c = { all: people.length, roles: 0, newcomers: 0, drift: 0 };
    for (const p of people)
      for (const f of FILTERS) if (f.id !== "all" && f.match(p)) c[f.id]++;
    if (regionRoles) c.roles = regionRoles.length;
    return c;
  }, [people, regionRoles]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const f = FILTERS.find((x) => x.id === filter)!;
    const shown = filter === "all" ? people : people.filter(f.match);
    if (!q) return shown;
    return shown.filter((p) =>
      [p.first_name, p.last_name, p.suburb, p.email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [people, query, filter]);

  return (
    <div className="mt-5">
      <div data-tour="people-search" className="flex gap-2">
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // Enter with no matches opens "Add person" with the name filled in.
            if (e.key === "Enter" && query.trim() && visible.length === 0) {
              e.preventDefault();
              setAdding(true);
            }
          }}
          placeholder="Search name, suburb or email"
          aria-label="Search people"
          className={inputClass}
        />
        <button
          onClick={() => setAdding((a) => !a)}
          className="shrink-0 rounded-xl bg-pink px-4 font-semibold text-navy hover:bg-pink-strong"
        >
          Add
        </button>
      </div>

      <div
        className="mt-3 flex flex-wrap gap-1.5"
        role="tablist"
        aria-label="Show"
      >
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-3 py-1 text-sm font-medium ring-1 transition-colors ${
              filter === f.id
                ? "bg-navy text-white ring-navy"
                : "bg-white text-stone-600 ring-stone-300 hover:bg-stone-50"
            }`}
          >
            {f.label}{" "}
            <span
              className={filter === f.id ? "text-white/60" : "text-stone-400"}
            >
              {counts[f.id]}
            </span>
          </button>
        ))}
      </div>

      {filter === "roles" && regionRoles ? (
        <RegionRoleList rows={regionRoles} query={query} />
      ) : (
        <>
          {adding && (
            <AddPersonForm
              withContact={withContact}
              initialName={query}
              onDone={() => {
                setAdding(false);
                setQuery("");
              }}
            />
          )}

          {visible.length === 0 ? (
            <p className="mt-6 text-center text-sm text-stone-500">
              {people.length === 0 ? (
                "No one in the list yet."
              ) : (
                <>
                  No one matches “{query}”.{" "}
                  {!adding && (
                    <button
                      onClick={() => setAdding(true)}
                      className="font-semibold text-pink-ink"
                    >
                      Add them
                    </button>
                  )}
                </>
              )}
            </p>
          ) : (
            <ul
              data-tour="people-list"
              className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5"
            >
              {visible.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center border-b border-black/5 last:border-0 hover:bg-stone-50"
                >
                  <Link
                    href={`/people/${p.id}`}
                    data-tour={`person-${p.first_name.toLowerCase()}`}
                    className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 pr-2"
                  >
                    <Avatar
                      name={[p.first_name, p.last_name]
                        .filter(Boolean)
                        .join(" ")}
                      url={p.photoUrl}
                      size={40}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 font-medium">
                        <span className="truncate">
                          {[p.first_name, p.last_name]
                            .filter(Boolean)
                            .join(" ")}
                        </span>
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${p.connected ? "bg-cyan" : "bg-stone-300"}`}
                          title={
                            p.connected ? "Account connected" : "No account yet"
                          }
                          aria-label={
                            p.connected ? "Account connected" : "No account yet"
                          }
                        />
                        {canMove && homeTeamId && communities.length > 1 && (
                          <MoveChip
                            personId={p.id}
                            currentTeamId={homeTeamId}
                            communities={communities}
                          />
                        )}
                        {p.drift && (
                          <span
                            title={driftText(p.drift)}
                            className="shrink-0 rounded-full bg-pink/25 px-2 py-0.5 text-xs font-semibold text-pink-ink"
                          >
                            Not seen in a while
                          </span>
                        )}
                        {p.status === "occasional" && (
                          <span
                            title="Has been around a while and comes now and then"
                            className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800"
                          >
                            Occasional
                          </span>
                        )}
                        {(p.status === "first_timer" ||
                          p.status === "newcomer") && (
                          <FirstTimerChip
                            personId={p.id}
                            name={p.first_name}
                            events={p.events}
                            recent={p.recent}
                          />
                        )}
                        {p.new_to_activism &&
                          (p.status === "first_timer" ||
                            p.status === "newcomer") && (
                            <span
                              title="Never done any activism before"
                              className="shrink-0 rounded-full bg-cyan/20 px-2 py-0.5 text-xs font-semibold text-navy"
                            >
                              New to activism
                            </span>
                          )}
                      </p>
                      <p className="truncate text-sm text-stone-500">
                        {[p.suburb, p.email, p.phone]
                          .filter(Boolean)
                          .join(" · ") ||
                          (p.facebook_url ? "Facebook" : "No details yet")}
                      </p>
                    </div>
                  </Link>
                  {(p.facebook_url || p.phone) && (
                    <span className="mr-2 flex shrink-0 gap-1">
                      <WhatsAppButton phone={p.phone} tz={tz} small />
                      <MessengerButton facebookUrl={p.facebook_url} small />
                    </span>
                  )}
                  <RolePicker
                    personId={p.id}
                    firstName={p.first_name}
                    connected={p.connected}
                    current={p.role}
                    pending={p.rolePending}
                    leads={p.leads}
                    communities={communities}
                    homeTeamId={homeTeamId}
                    roleTeamId={p.roleTeamId}
                    phone={p.phone ?? ""}
                    email={p.email ?? ""}
                    gives={gives}
                    regions={regions}
                    compact
                  />
                  <Link
                    href={`/people/${p.id}`}
                    className="w-20 shrink-0 py-3 pr-4 text-right"
                  >
                    <div>
                      <p className="text-sm font-semibold tabular-nums">
                        {p.events}
                      </p>
                      <p className="text-xs text-stone-500">
                        {p.events === 1 ? "event" : "events"}
                      </p>
                      {p.engagement && (
                        <span
                          data-tour="engagement-bar"
                          className="mt-1 flex justify-end"
                        >
                          <EngagementBar e={p.engagement} />
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

type Filter = "all" | "roles" | "newcomers" | "drift";
const FILTERS: {
  id: Filter;
  label: string;
  match: (p: PersonRow) => boolean;
}[] = [
  { id: "all", label: "Everyone", match: () => true },
  {
    id: "roles",
    label: "Has a role",
    match: (p) => !!p.role || p.leads.length > 0,
  },
  {
    id: "newcomers",
    label: "Newcomers",
    match: (p) => p.status === "first_timer" || p.status === "newcomer",
  },
  { id: "drift", label: "Not seen in a while", match: (p) => !!p.drift },
];

export type RegionRole = {
  key: string;
  personId: string | null;
  teamId: string | null;
  name: string;
  role: Access;
  where: string;
  pending: boolean;
};

// Everyone with a role across "All communities".
function RegionRoleList({
  rows,
  query,
}: {
  rows: RegionRole[];
  query: string;
}) {
  const q = query.trim().toLowerCase();
  const shown = q ? rows.filter((r) => r.name.toLowerCase().includes(q)) : rows;
  if (shown.length === 0)
    return (
      <p className="mt-6 text-center text-sm text-stone-500">No one matches.</p>
    );
  return (
    <ul className="mt-4 divide-y divide-black/5 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      {shown.map((r) => (
        <li key={r.key} className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            {r.personId ? (
              <Link
                href={`/people/open?id=${r.personId}${r.teamId ? `&team=${r.teamId}` : ""}`}
                className="truncate font-medium hover:underline"
              >
                {r.name}
              </Link>
            ) : (
              <p className="truncate font-medium">{r.name}</p>
            )}
            <p className="truncate text-sm text-stone-500">{r.where}</p>
          </div>
          <RoleChip role={r.role} pending={r.pending} />
        </li>
      ))}
    </ul>
  );
}

// "First-timer" (1 event) or "Newcomer" (until they're a Regular) label;
// hover (or tap) the × to say they've been before.
function FirstTimerChip({
  personId,
  name,
  events,
  recent,
}: {
  personId: string;
  name: string;
  events: number;
  recent: number;
}) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <span
      title={
        events === 1
          ? "First event"
          : `Newcomer: ${recent} of ${REGULAR_EVENTS} events in the last 3 months`
      }
      className={`group/ft relative shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold text-navy bg-yellow`}
    >
      {events === 1 ? "First-timer" : "Newcomer"}
      <button
        type="button"
        title={`${name} isn't new: remove the label`}
        aria-label={`${name} isn't new: remove the label`}
        onClick={(e) => {
          // The label sits inside the link to their profile.
          e.preventDefault();
          e.stopPropagation();
          setHidden(true);
          setAttendedBefore(personId, true).then((r) => {
            if (r.error) setHidden(false);
          });
        }}
        // Sits on the chip's top-right corner, so the chip keeps its size.
        className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-navy text-white opacity-0 shadow ring-2 ring-white transition-opacity hover:bg-navy-2 focus:opacity-100 group-hover/ft:opacity-100 [@media(hover:none)]:opacity-70"
      >
        <svg
          viewBox="0 0 20 20"
          className="h-2 w-2"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          aria-hidden
        >
          <path d="M6 6l8 8M14 6l-8 8" strokeLinecap="round" />
        </svg>
      </button>
    </span>
  );
}

// Splits "Crystal Serfaty" into first "Crystal" and last "Serfaty"
// (everything after the first word counts as the last name).
function splitName(full: string) {
  const [first = "", ...rest] = full.trim().split(/\s+/);
  return { first, last: rest.join(" ") };
}

function AddPersonForm({
  onDone,
  initialName = "",
  withContact = false,
}: {
  onDone: () => void;
  initialName?: string;
  withContact?: boolean; // Regional Support Leads / God Mode can add contact details
}) {
  const [names] = useState(() => splitName(initialName));
  const [state, action, pending] = useActionState<
    FormState & { ok?: boolean },
    FormData
  >(async (prev, formData) => {
    const result = await createPerson(prev, formData);
    return result.error ? result : { ok: true };
  }, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      onDone();
    }
  }, [state, onDone]);

  return (
    <form
      ref={formRef}
      action={action}
      className="mt-4 space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-2 ring-pink/60"
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name" htmlFor="first_name">
          <input
            id="first_name"
            name="first_name"
            required
            autoFocus
            defaultValue={names.first}
            className={inputClass}
          />
        </Field>
        <Field label="Last name" htmlFor="last_name">
          <input
            id="last_name"
            name="last_name"
            defaultValue={names.last}
            className={inputClass}
          />
        </Field>
      </div>
      {withContact ? (
        <details className="rounded-xl bg-stone-50 p-3 ring-1 ring-black/5">
          <summary className="cursor-pointer text-sm font-medium">
            Contact details{" "}
            <span className="font-normal text-stone-500">(optional)</span>
          </summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <input
              name="phone"
              type="tel"
              placeholder="Phone (WhatsApp)"
              aria-label="Phone"
              className={inputClass}
            />
            <input
              name="email"
              type="email"
              placeholder="Email"
              aria-label="Email"
              className={inputClass}
            />
            <input
              name="facebook"
              type="url"
              placeholder="Facebook profile link"
              aria-label="Facebook profile link"
              className={inputClass}
            />
          </div>
        </details>
      ) : (
        <p className="text-xs text-stone-500">
          Just a name. They add their own details and photo when they connect
          their account.
        </p>
      )}
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-pink px-4 py-2.5 font-semibold text-navy hover:bg-pink-strong disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save person"}
      </button>
    </form>
  );
}
