"use client";

import { useFindShortcut } from "@/lib/use-find-shortcut";
import { useEffect, useMemo, useRef, useState } from "react";
import { inputClass } from "@/components/form";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/avatar";
import { isMilestone, ordinal } from "@/lib/insights";
import { FOUND_VIA } from "@/components/origin-editor";
import { BEST_CONTACT } from "@/lib/contact";

// Optional extras asked when someone new is added (Kai, 4 Nov 2026).
export type NewcomerExtras = {
  newToActivism: boolean;
  foundVia: string;
  viaPerson: string;
  viaNote: string;
  bestContact: string;
  contact: string;
};

export type CheckInPerson = {
  id: string;
  first_name: string;
  last_name: string | null;
};

const fullName = (p: CheckInPerson) =>
  [p.first_name, p.last_name].filter(Boolean).join(" ");
const byName = (a: CheckInPerson, b: CheckInPerson) =>
  fullName(a).localeCompare(fullName(b));
// Check-ins that couldn't be sent (no signal at an outdoor event, Kai
// 12 Nov 2026) wait on the phone and go when the connection is back.
// New people added offline get a temporary id until they're sent.
type Queued =
  | { kind: "tick"; id: string; name: string; here: boolean; tries: number }
  | {
      kind: "add";
      tmp: string;
      first: string;
      last: string;
      x: NewcomerExtras;
      tries: number;
    };
const TMP = "tmp-";
const isOffline = () =>
  typeof navigator !== "undefined" && navigator.onLine === false;

// Below this someone's last visit was long ago (or only ever to the other kind of event).
const LIKELY_MIN = 0.15;

// The check-in screen itself, shared by organisers and helper links.
// How a tick or a new person is saved is passed in, so each side can use
// its own permissions.
export function CheckInList({
  initialPeople,
  initialCheckedIn,
  returningIds,
  photos = {},
  onToggle,
  onAdd,
  onAdded,
  poll,
  toolbarExtra,
  children,
  stickyTopClass = "top-[92px]",
  isOutreach = false,
  outreachBefore = {},
  onMarkNotNew,
  linkToken,
  likely = {},
}: {
  initialPeople: CheckInPerson[];
  initialCheckedIn: string[];
  returningIds: string[];
  photos?: Record<string, string>;
  onToggle: (person: CheckInPerson, here: boolean) => Promise<boolean>;
  onAdd: (first: string, last: string) => Promise<CheckInPerson | null>;
  onAdded?: (person: CheckInPerson) => void;
  poll?: () => Promise<{ people: CheckInPerson[]; checkedIn: string[] } | null>;
  toolbarExtra?: React.ReactNode;
  children?: React.ReactNode; // shown between the toolbar and the list
  stickyTopClass?: string;
  isOutreach?: boolean; // does this event count towards outreach milestones?
  outreachBefore?: Record<string, number>; // each person's outreach count not counting this event
  linkToken?: string; // helper check-in link (no login)
  onMarkNotNew?: (person: CheckInPerson) => Promise<boolean>; // tap "First event" to say they've been before
  likely?: Record<string, number>; // how likely each person is to come (higher = more likely)
}) {
  // People marked "been before" on this screen, on top of those already known.
  const [markedNotNew, setMarkedNotNew] = useState<Set<string>>(new Set());
  const returning = useMemo(
    () => new Set([...returningIds, ...markedNotNew]),
    [returningIds, markedNotNew],
  );
  const [people, setPeople] = useState(() => [...initialPeople].sort(byName));
  const [checkedIn, setCheckedIn] = useState(() => new Set(initialCheckedIn));
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const searchRef = useFindShortcut();
  const [onlyHere, setOnlyHere] = useState(false);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [celebrate, setCelebrate] = useState<{
    name: string;
    n: number;
  } | null>(null);
  const hasLikely = Object.values(likely).some((v) => v >= LIKELY_MIN);
  const [order, setOrder] = useState<"likely" | "az">("likely");
  const chooseOrder = setOrder;

  // Their outreach count including this event, if they're checked in to it.
  const milestoneFor = (id: string) => {
    if (!isOutreach || !checkedIn.has(id)) return null;
    const n = (outreachBefore[id] ?? 0) + 1;
    return isMilestone(n) ? n : null;
  };

  // ---- Waiting to send (offline) ----
  const queueKey = useRef("");
  const queue = useRef<Queued[]>([]);
  const flushing = useRef(false);
  const [waiting, setWaiting] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  function saveQueue() {
    try {
      localStorage.setItem(queueKey.current, JSON.stringify(queue.current));
    } catch {}
    setWaiting(
      new Set(queue.current.map((q) => (q.kind === "tick" ? q.id : q.tmp))),
    );
  }
  function enqueue(item: Queued) {
    if (item.kind === "tick")
      queue.current = queue.current.filter(
        (q) => !(q.kind === "tick" && q.id === item.id),
      );
    queue.current.push(item);
    saveQueue();
  }
  // Shows queued ticks and new people on top of what the server says.
  function overlay(list: CheckInPerson[], here: Set<string>) {
    const people = [...list];
    const next = new Set(here);
    for (const q of queue.current) {
      if (q.kind === "add") {
        if (!people.some((p) => p.id === q.tmp))
          people.push({
            id: q.tmp,
            first_name: q.first,
            last_name: q.last || null,
          });
        next.add(q.tmp);
      } else if (q.here) next.add(q.id);
      else next.delete(q.id);
    }
    return { people: people.sort(byName), here: next };
  }

  function sendExtras(person: CheckInPerson, x: NewcomerExtras) {
    if (x.newToActivism)
      void createClient().rpc("set_new_to_activism", {
        p_person_id: person.id,
        p_value: true,
        p_token: linkToken ?? null,
      });
    if (x.foundVia || x.bestContact)
      void createClient().rpc("set_newcomer_details", {
        p_person_id: person.id,
        p_token: linkToken ?? null,
        p_found_via: x.foundVia || null,
        p_via_person:
          x.foundVia === "person" && x.viaPerson ? x.viaPerson : null,
        p_note:
          x.foundVia === "other" || (x.foundVia === "person" && !x.viaPerson)
            ? x.viaNote
            : null,
        p_best_contact: x.bestContact || null,
        p_contact: x.bestContact ? x.contact : null,
      });
  }

  // Sends what's waiting, oldest first. Stops at the first failure (still no
  // signal); something that fails 3 times while online is dropped and undone.
  async function flush() {
    if (flushing.current || queue.current.length === 0 || isOffline()) return;
    flushing.current = true;
    setSending(true);
    while (queue.current.length) {
      const q = queue.current[0];
      let ok = false;
      if (q.kind === "add") {
        const person = await onAdd(q.first, q.last).catch(() => null);
        if (person) {
          ok = true;
          sendExtras(person, q.x);
          for (const t of queue.current)
            if (t.kind === "tick" && t.id === q.tmp) t.id = person.id;
          setPeople((prev) =>
            prev.map((p) => (p.id === q.tmp ? person : p)).sort(byName),
          );
          setCheckedIn((prev) => {
            const next = new Set(prev);
            if (next.delete(q.tmp)) next.add(person.id);
            return next;
          });
        }
      } else if (q.id.startsWith(TMP)) {
        ok = true; // its person never got sent; nothing to do
      } else {
        ok = await onToggle(
          { id: q.id, first_name: q.name, last_name: null },
          q.here,
        ).catch(() => false);
      }
      if (ok) {
        queue.current.shift();
        saveQueue();
        continue;
      }
      q.tries++;
      if (q.tries >= 3 && !isOffline()) {
        queue.current.shift();
        if (q.kind === "tick") {
          flip(q.id, !q.here);
          setError(`Couldn't save ${q.name}. Please try again.`);
        } else {
          setPeople((prev) => prev.filter((p) => p.id !== q.tmp));
          setError(`Couldn't add ${q.first}. Please add them again.`);
        }
        saveQueue();
        continue;
      }
      saveQueue();
      break;
    }
    flushing.current = false;
    setSending(false);
  }
  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  });

  // Load anything left from before (page reloaded while offline), then keep
  // trying: when the phone says it's back online, and every 20 seconds.
  useEffect(() => {
    queueKey.current = `wtf-checkin-queue:${location.pathname}`;
    try {
      queue.current = JSON.parse(
        localStorage.getItem(queueKey.current) ?? "[]",
      ) as Queued[];
    } catch {
      queue.current = [];
    }
    queueMicrotask(() => {
      if (queue.current.length) {
        const o = overlay(people, checkedIn);
        setPeople(o.people);
        setCheckedIn(o.here);
        saveQueue();
        void flushRef.current();
      }
    });
    const online = () => void flushRef.current();
    window.addEventListener("online", online);
    const t = setInterval(() => void flushRef.current(), 20000);
    return () => {
      window.removeEventListener("online", online);
      clearInterval(t);
    };
    // Runs once: the first people/checkedIn are what the queue goes on top of.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pick up ticks made on other phones every 15 seconds.
  const busy = useRef(false);
  useEffect(() => {
    busy.current = pending.size > 0 || adding;
  }, [pending, adding]);
  useEffect(() => {
    if (!poll) return;
    const t = setInterval(async () => {
      if (busy.current || document.hidden) return;
      const fresh = await poll();
      if (!fresh || busy.current) return;
      const o = overlay(fresh.people, new Set(fresh.checkedIn));
      setPeople(o.people);
      setCheckedIn(o.here);
    }, 15000);
    return () => clearInterval(t);
  }, [poll]);

  const firstTimers = [...checkedIn].filter((id) => !returning.has(id)).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people.filter((p) => {
      if (onlyHere && !checkedIn.has(p.id)) return false;
      if (!q) return true;
      return fullName(p).toLowerCase().includes(q);
    });
  }, [people, query, onlyHere, checkedIn]);

  // "Likely first": people who usually come to this kind of event at the top
  // (most likely first), then everyone else A to Z. Ticking someone never moves them.
  const groups = useMemo(() => {
    if (order === "az" || !hasLikely || onlyHere)
      return [{ label: "", items: visible }];
    const score = (p: CheckInPerson) => likely[p.id] ?? 0;
    const top = visible
      .filter((p) => score(p) >= LIKELY_MIN)
      .sort((a, b) => score(b) - score(a) || byName(a, b));
    const rest = visible.filter((p) => score(p) < LIKELY_MIN);
    if (query.trim()) return [{ label: "", items: [...top, ...rest] }];
    return [
      { label: `Likely here · ${top.length}`, items: top },
      { label: "Everyone else", items: rest },
    ].filter((g) => g.items.length > 0);
  }, [order, hasLikely, onlyHere, visible, likely, query]);

  function setBusy(id: string, on: boolean) {
    setPending((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function flip(id: string, here: boolean) {
    setCheckedIn((prev) => {
      const next = new Set(prev);
      if (here) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function toggle(person: CheckInPerson) {
    if (pending.has(person.id)) return;
    const here = !checkedIn.has(person.id);
    setError("");
    flip(person.id, here); // update the screen straight away, then save
    const celebrateIf = () => {
      if (!here || !isOutreach) return;
      const n = (outreachBefore[person.id] ?? 0) + 1;
      if (isMilestone(n)) setCelebrate({ name: person.first_name, n });
    };
    const tick: Queued = {
      kind: "tick",
      id: person.id,
      name: person.first_name,
      here,
      tries: 0,
    };
    // No signal, or other ticks still waiting (keep them in order): keep it
    // on the phone and send it later.
    if (isOffline() || queue.current.length > 0) {
      enqueue(tick);
      celebrateIf();
      void flush();
      return;
    }
    setBusy(person.id, true);
    const ok = await onToggle(person, here).catch(() => false);
    if (ok) celebrateIf();
    else {
      enqueue({ ...tick, tries: 1 });
      celebrateIf();
    }
    setBusy(person.id, false);
  }

  async function markNotNew(person: CheckInPerson) {
    setError("");
    if (person.id.startsWith(TMP)) {
      setError(
        `${person.first_name} hasn't been sent yet. Try again once they have.`,
      );
      return;
    }
    setMarkedNotNew((prev) => new Set(prev).add(person.id));
    const ok = await onMarkNotNew?.(person);
    if (!ok) {
      setMarkedNotNew((prev) => {
        const next = new Set(prev);
        next.delete(person.id);
        return next;
      });
      setError(`Couldn't update ${person.first_name}. Please try again.`);
    }
  }

  async function add(first: string, last: string, x: NewcomerExtras) {
    setError("");
    const person =
      isOffline() || queue.current.length > 0
        ? null
        : await onAdd(first, last).catch(() => null);
    if (!person) {
      // No signal: add them on this phone now and send them later.
      const tmp: CheckInPerson = {
        id: `${TMP}${crypto.randomUUID()}`,
        first_name: first,
        last_name: last || null,
      };
      enqueue({ kind: "add", tmp: tmp.id, first, last, x, tries: 0 });
      setPeople((prev) => [...prev, tmp].sort(byName));
      flip(tmp.id, true);
      setQuery("");
      setAdding(false);
      void flush();
      return true;
    }
    sendExtras(person, x);
    setPeople((prev) => [...prev, person].sort(byName));
    flip(person.id, true);
    setQuery("");
    setAdding(false);
    onAdded?.(person);
    return true;
  }

  return (
    <div className="mt-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <p className="text-3xl font-semibold tabular-nums">
            {checkedIn.size}
          </p>
          <p className="text-sm text-stone-500">checked in</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <p className="text-3xl font-semibold tabular-nums">{firstTimers}</p>
          <p className="text-sm text-stone-500">
            {firstTimers === 1 ? "first-timer" : "first-timers"}
          </p>
        </div>
      </div>

      <div
        className={`sticky ${stickyTopClass} z-[5] -mx-4 mt-5 bg-background/95 px-4 pb-3 pt-1 backdrop-blur`}
      >
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // Enter: no match -> add them as a new person; exactly one match -> tick them in.
            if (e.key !== "Enter" || !query.trim()) return;
            e.preventDefault();
            if (visible.length === 0) setAdding(true);
            else if (visible.length === 1) {
              const p = visible[0];
              if (!checkedIn.has(p.id)) toggle(p);
              setQuery("");
            }
          }}
          enterKeyHint="go"
          placeholder="Search by name"
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
          {hasLikely && !onlyHere && (
            <button
              onClick={() => chooseOrder(order === "likely" ? "az" : "likely")}
              className="rounded-lg px-2 py-1.5 text-sm text-stone-600 hover:bg-black/5"
              title="Change the order of the list"
            >
              {order === "likely" ? "Likely first" : "A–Z"}
              <span aria-hidden className="ml-1 text-stone-400">
                ⇅
              </span>
            </button>
          )}
          <div className="flex items-center gap-1">
            {toolbarExtra}
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
        <p
          role="alert"
          className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      {waiting.size > 0 && (
        <div
          role="status"
          className="mb-3 flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200"
        >
          <p className="min-w-0 flex-1">
            {sending ? "Sending" : "No signal?"} {waiting.size}{" "}
            {waiting.size === 1 ? "check-in is" : "check-ins are"} saved on this
            phone{sending ? "…" : " and will send when you're back online."}
          </p>
          {!sending && (
            <button
              type="button"
              onClick={() => void flush()}
              className="shrink-0 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-amber-900 ring-1 ring-amber-300 hover:bg-amber-100"
            >
              Send now
            </button>
          )}
        </div>
      )}

      {celebrate && (
        <div
          role="status"
          className="mb-4 flex items-center gap-3 rounded-2xl bg-pink p-4 text-navy shadow-sm"
        >
          <span aria-hidden className="text-3xl">
            🎉
          </span>
          <p className="min-w-0 flex-1">
            <span className="block text-lg font-bold leading-tight">
              {celebrate.name}&apos;s {ordinal(celebrate.n)} outreach event!
            </span>
            <span className="text-sm">Give them a shout-out.</span>
          </p>
          <button
            onClick={() => setCelebrate(null)}
            aria-label="Dismiss"
            className="shrink-0 rounded-lg px-2 py-1 text-navy/70 hover:bg-white/30"
          >
            ✕
          </button>
        </div>
      )}

      {adding && (
        <QuickAdd
          initialName={query}
          onCancel={() => setAdding(false)}
          onSave={add}
          people={people}
        />
      )}

      {children}

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 px-4 py-8 text-center text-sm text-stone-500">
          {people.length === 0 ? (
            <>
              No one in the list yet. Add the first person with “+ New person”.
            </>
          ) : onlyHere ? (
            <>No one checked in yet.</>
          ) : (
            <>
              No one matches “{query}”.{" "}
              <button
                onClick={() => setAdding(true)}
                className="font-semibold text-pink-ink"
              >
                Add them
              </button>
            </>
          )}
        </div>
      ) : (
        groups.map((g, n) => (
          <div
            key={g.label || "all"}
            data-tour={n === 0 ? "checkin-list" : undefined}
            className="mb-4 scroll-mt-24"
          >
            {g.label && (
              <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
                {g.label}
              </h3>
            )}
            <ul className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              {g.items.map((p) => {
                const here = checkedIn.has(p.id);
                const isNew = here && !returning.has(p.id);
                return (
                  <li
                    key={p.id}
                    className={`flex items-center border-b border-black/5 transition-colors last:border-0 ${
                      here ? "bg-cyan/15" : "hover:bg-stone-50"
                    }`}
                  >
                    <button
                      onClick={() => toggle(p)}
                      aria-pressed={here}
                      className="flex min-w-0 flex-1 items-center gap-3 py-3.5 pl-4 pr-2 text-left"
                    >
                      <span
                        aria-hidden
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                          here
                            ? "border-cyan bg-cyan text-navy"
                            : "border-stone-300"
                        } ${pending.has(p.id) ? "opacity-50" : ""}`}
                      >
                        {here && (
                          <svg
                            viewBox="0 0 20 20"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                          >
                            <path
                              d="M4 10.5l4 4 8-9"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </span>
                      <Avatar name={fullName(p)} url={photos[p.id]} size={40} />
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {fullName(p)}
                        {waiting.has(p.id) && (
                          <span className="ml-2 text-xs font-normal text-amber-700">
                            Not sent yet
                          </span>
                        )}
                      </span>
                      {milestoneFor(p.id) && (
                        <span className="shrink-0 rounded-full bg-pink px-2 py-0.5 text-xs font-semibold text-navy">
                          {ordinal(milestoneFor(p.id)!)} outreach
                        </span>
                      )}
                    </button>
                    {isNew &&
                      (onMarkNotNew ? (
                        <button
                          onClick={() => markNotNew(p)}
                          aria-label={`${p.first_name} has been before: not a first-timer`}
                          title="Been before? Tap to mark as not a first-timer"
                          className="mr-3 flex shrink-0 items-center gap-1 rounded-full bg-yellow py-0.5 pl-2 pr-1.5 text-xs font-semibold text-navy hover:bg-yellow/70"
                        >
                          First event
                          <svg
                            viewBox="0 0 20 20"
                            className="h-3.5 w-3.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            aria-hidden
                          >
                            <path
                              d="M6 6l8 8M14 6l-8 8"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      ) : (
                        <span className="mr-4 shrink-0 rounded-full bg-yellow px-2 py-0.5 text-xs font-semibold text-navy">
                          First event
                        </span>
                      ))}
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}

function QuickAdd({
  initialName,
  onCancel,
  onSave,
  people,
}: {
  initialName: string;
  onCancel: () => void;
  onSave: (first: string, last: string, x: NewcomerExtras) => Promise<boolean>;
  people: CheckInPerson[];
}) {
  const [first, ...rest] = initialName.trim().split(/\s+/);
  const [firstName, setFirstName] = useState(first ?? "");
  const [lastName, setLastName] = useState(rest.join(" "));
  const [saving, setSaving] = useState(false);
  const [newToActivism, setNewToActivism] = useState(false);
  const [foundVia, setFoundVia] = useState("");
  const [viaPerson, setViaPerson] = useState("");
  const [viaNote, setViaNote] = useState("");
  const [bestContact, setBestContact] = useState("");
  const [contact, setContact] = useState("");
  const how = BEST_CONTACT.find((c) => c.id === bestContact);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim()) return;
    setSaving(true);
    const ok = await onSave(firstName.trim(), lastName.trim(), {
      newToActivism,
      foundVia,
      viaPerson,
      viaNote: viaNote.trim(),
      bestContact,
      contact: contact.trim(),
    });
    if (!ok) setSaving(false);
  }

  return (
    <form
      onSubmit={submit}
      className="mb-4 space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-2 ring-pink/60"
    >
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
      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          checked={newToActivism}
          onChange={(e) => setNewToActivism(e.target.checked)}
          className="h-4 w-4 accent-navy"
        />
        New to activism (never done any before)
      </label>
      <div className="space-y-2">
        <select
          value={foundVia}
          onChange={(e) => setFoundVia(e.target.value)}
          aria-label="How they found We The Free"
          className={`${inputClass} ${foundVia ? "" : "text-stone-500"}`}
        >
          <option value="">How did they find us? (optional)</option>
          {FOUND_VIA.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
        {foundVia === "person" && (
          <select
            value={viaPerson}
            onChange={(e) => setViaPerson(e.target.value)}
            aria-label="Who brought them"
            className={inputClass}
          >
            <option value="">Who? (pick, or type below)</option>
            {[...people].sort(byName).map((p) => (
              <option key={p.id} value={p.id}>
                {fullName(p)}
              </option>
            ))}
          </select>
        )}
        {(foundVia === "other" || (foundVia === "person" && !viaPerson)) && (
          <input
            value={viaNote}
            onChange={(e) => setViaNote(e.target.value)}
            maxLength={100}
            placeholder={foundVia === "person" ? "Their name" : "Where?"}
            aria-label={
              foundVia === "person" ? "Who brought them" : "Where they found us"
            }
            className={inputClass}
          />
        )}
        <div className="grid grid-cols-2 gap-2">
          <select
            value={bestContact}
            onChange={(e) => setBestContact(e.target.value)}
            aria-label="Best way to reach them"
            className={`${inputClass} ${bestContact ? "" : "text-stone-500"}`}
          >
            <option value="">Best contact (optional)</option>
            {BEST_CONTACT.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          {how && (
            <input
              type={how.input}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={how.placeholder}
              aria-label={how.placeholder}
              className={inputClass}
            />
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-xl bg-pink px-4 py-2.5 font-semibold text-navy hover:bg-pink-strong disabled:opacity-60"
        >
          {saving ? "Adding…" : "Add and check in"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-4 py-2.5 text-stone-600 hover:bg-black/5"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
