"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { inputClass } from "@/components/form";
import { Sheet } from "@/components/sheet";
import { ConnectInvite } from "@/components/connect-invite";
import { ShareLink } from "@/components/share-link";
import { Avatar } from "@/components/avatar";

export type Person = {
  id: string;
  first_name: string;
  last_name: string | null;
  suburb: string | null;
};

const fullName = (p: Person) => [p.first_name, p.last_name].filter(Boolean).join(" ");

export function CheckIn({
  eventId,
  teamId,
  organiserId,
  initialPeople,
  initialCheckedIn,
  returningIds,
  teamSlug,
  photos,
}: {
  eventId: string;
  teamId: string;
  teamSlug: string;
  photos: Record<string, string>;
  organiserId: string;
  initialPeople: Person[];
  initialCheckedIn: string[];
  returningIds: string[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const returning = useMemo(() => new Set(returningIds), [returningIds]);

  const [people, setPeople] = useState(initialPeople);
  const [checkedIn, setCheckedIn] = useState(() => new Set(initialCheckedIn));
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [onlyHere, setOnlyHere] = useState(false);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  // Someone just added on the spot: offer their connect QR.
  const [justAdded, setJustAdded] = useState<Person | null>(null);
  const [sheet, setSheet] = useState<null | "connect" | "signup">(null);

  const firstTimers = [...checkedIn].filter((id) => !returning.has(id)).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people.filter((p) => {
      if (onlyHere && !checkedIn.has(p.id)) return false;
      if (!q) return true;
      return `${fullName(p)} ${p.suburb ?? ""}`.toLowerCase().includes(q);
    });
  }, [people, query, onlyHere, checkedIn]);

  function setBusy(id: string, busy: boolean) {
    setPending((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function toggle(person: Person) {
    if (pending.has(person.id)) return;
    const wasHere = checkedIn.has(person.id);
    setError("");
    setBusy(person.id, true);
    // Update the screen straight away, then save.
    setCheckedIn((prev) => {
      const next = new Set(prev);
      if (wasHere) next.delete(person.id);
      else next.add(person.id);
      return next;
    });

    const { error } = wasHere
      ? await supabase.from("attendance").delete().eq("event_id", eventId).eq("person_id", person.id)
      : await supabase
          .from("attendance")
          .upsert({ event_id: eventId, person_id: person.id, checked_in_by: organiserId });

    if (error) {
      // Put it back and say so.
      setCheckedIn((prev) => {
        const next = new Set(prev);
        if (wasHere) next.add(person.id);
        else next.delete(person.id);
        return next;
      });
      setError(`Couldn't save ${person.first_name}. Check your connection and try again.`);
    }
    setBusy(person.id, false);
  }

  async function addAndCheckIn(firstName: string, lastName: string, suburb: string) {
    setError("");
    const { data, error } = await supabase
      .from("people")
      .insert({
        team_id: teamId,
        first_name: firstName,
        last_name: lastName || null,
        suburb: suburb || null,
        added_via: "host",
      })
      .select("id, first_name, last_name, suburb")
      .single<Person>();

    if (error || !data) {
      setError("Couldn't add that person. Please try again.");
      return false;
    }

    setPeople((prev) => [...prev, data].sort((a, b) => fullName(a).localeCompare(fullName(b))));
    const { error: checkInError } = await supabase
      .from("attendance")
      .insert({ event_id: eventId, person_id: data.id, checked_in_by: organiserId });
    if (checkInError) {
      setError(`${data.first_name} was added but not checked in. Tap their name to check them in.`);
    } else {
      setCheckedIn((prev) => new Set(prev).add(data.id));
    }
    setQuery("");
    setAdding(false);
    setJustAdded(data);
    return true;
  }

  return (
    <div className="mt-5">
      {/* Live counts */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <p className="text-3xl font-semibold tabular-nums">{checkedIn.size}</p>
          <p className="text-sm text-stone-500">checked in</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <p className="text-3xl font-semibold tabular-nums">{firstTimers}</p>
          <p className="text-sm text-stone-500">{firstTimers === 1 ? "first-timer" : "first-timers"}</p>
        </div>
      </div>

      {/* Search and filters */}
      <div className="sticky top-[92px] z-[5] -mx-4 mt-5 bg-background/95 px-4 pb-3 pt-1 backdrop-blur">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or suburb"
          className={inputClass}
          aria-label="Search people"
        />
        <div className="mt-2 flex items-center justify-between">
          <div className="flex gap-1 rounded-lg bg-black/5 p-0.5 text-sm">
            <button
              onClick={() => setOnlyHere(false)}
              className={`rounded-md px-3 py-1 ${!onlyHere ? "bg-white font-medium shadow-sm" : "text-stone-600"}`}
            >
              Everyone
            </button>
            <button
              onClick={() => setOnlyHere(true)}
              className={`rounded-md px-3 py-1 ${onlyHere ? "bg-white font-medium shadow-sm" : "text-stone-600"}`}
            >
              Here ({checkedIn.size})
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSheet("signup")}
              className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-stone-600 hover:bg-black/5"
            >
              Sign-up QR
            </button>
            <button
              onClick={() => setAdding(true)}
              className="rounded-lg px-2.5 py-1.5 text-sm font-semibold text-pink-ink hover:bg-pink/10"
            >
              + New person
            </button>
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {adding && (
        <QuickAdd
          initialName={query}
          onCancel={() => setAdding(false)}
          onSave={addAndCheckIn}
        />
      )}

      {justAdded && !adding && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl bg-navy p-4 text-white">
          <p className="min-w-0 flex-1 text-sm">
            <span className="font-semibold">{justAdded.first_name}</span> added and checked in. Want them to
            connect an account?
          </p>
          <button
            onClick={() => setSheet("connect")}
            className="shrink-0 rounded-xl bg-pink px-3.5 py-2 text-sm font-semibold text-navy hover:bg-pink-strong"
          >
            Show QR
          </button>
          <button
            onClick={() => setJustAdded(null)}
            aria-label="Dismiss"
            className="shrink-0 rounded-lg px-2 py-1 text-white/70 hover:bg-white/10"
          >
            ✕
          </button>
        </div>
      )}

      {sheet === "connect" && justAdded && (
        <Sheet title={`Connect ${justAdded.first_name}`} onClose={() => setSheet(null)}>
          <ConnectInvite personId={justAdded.id} firstName={justAdded.first_name} />
        </Sheet>
      )}

      {sheet === "signup" && (
        <Sheet title="Sign-up QR" onClose={() => setSheet(null)}>
          <p className="mb-4 text-sm text-stone-600">
            For anyone who hasn&apos;t been added yet. They scan it, sign up, and appear in your list. If
            you&apos;ve already added them, use their own connect QR from the People page instead.
          </p>
          <ShareLink
            url={`${window.location.origin}/join/${teamSlug}`}
            title="Join We The Free"
            text="Sign up to We The Free so we can keep you in the loop:"
            qrLabel="Sign-up QR code"
          />
        </Sheet>
      )}

      {/* People */}
      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 px-4 py-8 text-center text-sm text-stone-500">
          {people.length === 0 ? (
            <>No one in the list yet. Add the first person with “+ New person”.</>
          ) : onlyHere ? (
            <>No one checked in yet.</>
          ) : (
            <>
              No one matches “{query}”.{" "}
              <button onClick={() => setAdding(true)} className="font-semibold text-pink-ink">
                Add them
              </button>
            </>
          )}
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          {visible.map((p) => {
            const here = checkedIn.has(p.id);
            const isNew = here && !returning.has(p.id);
            return (
              <li key={p.id} className="border-b border-black/5 last:border-0">
                <button
                  onClick={() => toggle(p)}
                  aria-pressed={here}
                  className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors ${
                    here ? "bg-cyan/15" : "hover:bg-stone-50"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                      here ? "border-cyan bg-cyan text-navy" : "border-stone-300"
                    } ${pending.has(p.id) ? "opacity-50" : ""}`}
                  >
                    {here && (
                      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M4 10.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <Avatar name={fullName(p)} url={photos[p.id]} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{fullName(p)}</span>
                    {p.suburb && <span className="block truncate text-sm text-stone-500">{p.suburb}</span>}
                  </span>
                  {isNew && (
                    <span className="shrink-0 rounded-full bg-yellow px-2 py-0.5 text-xs font-semibold text-navy">
                      First event
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function QuickAdd({
  initialName,
  onCancel,
  onSave,
}: {
  initialName: string;
  onCancel: () => void;
  onSave: (first: string, last: string, suburb: string) => Promise<boolean>;
}) {
  const [first, ...rest] = initialName.trim().split(/\s+/);
  const [firstName, setFirstName] = useState(first ?? "");
  const [lastName, setLastName] = useState(rest.join(" "));
  const [suburb, setSuburb] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim()) return;
    setSaving(true);
    const ok = await onSave(firstName.trim(), lastName.trim(), suburb.trim());
    if (!ok) setSaving(false);
  }

  return (
    <form onSubmit={submit} className="mb-4 space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-2 ring-pink/60">
      <p className="font-medium">Add someone new</p>
      <div className="grid grid-cols-2 gap-2">
        <input
          autoFocus
          required
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="First name"
          aria-label="First name"
          className={inputClass}
        />
        <input
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Last name"
          aria-label="Last name"
          className={inputClass}
        />
      </div>
      <input
        value={suburb}
        onChange={(e) => setSuburb(e.target.value)}
        placeholder="Suburb"
        aria-label="Suburb"
        className={inputClass}
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-xl bg-pink px-4 py-2.5 font-semibold text-navy hover:bg-pink-strong disabled:opacity-60"
        >
          {saving ? "Adding…" : "Add and check in"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-xl px-4 py-2.5 text-stone-600 hover:bg-black/5">
          Cancel
        </button>
      </div>
    </form>
  );
}
