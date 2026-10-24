"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/sheet";
import {
  findMergeCandidates,
  mergePeople,
  type MergeCandidate,
} from "@/app/actions";

// "Same person? Merge": fold a duplicate into one record.
export function MergePerson({
  personId,
  name,
  events,
  team,
}: {
  personId: string;
  name: string;
  events: number;
  team: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(name.split(" ")[0]);
  const [list, setList] = useState<MergeCandidate[] | null>(null);
  const [other, setOther] = useState<MergeCandidate | null>(null);
  const [keepThis, setKeepThis] = useState(true);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open || other) return;
    const t = setTimeout(
      () => findMergeCandidates(personId, query).then(setList),
      250,
    );
    return () => clearTimeout(t);
  }, [open, query, personId, other]);

  const card = (n: string, t: string, ev: number, detail?: string) => (
    <span className="min-w-0">
      <span className="block font-medium text-navy">{n}</span>
      <span className="block truncate text-xs text-stone-500">
        {t} · {ev} {ev === 1 ? "event" : "events"}
        {detail ? ` · ${detail}` : ""}
      </span>
    </span>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-stone-500 hover:text-stone-800 hover:underline"
      >
        Same person as someone else? Merge
      </button>
      {open && (
        <Sheet title="Merge duplicates" onClose={() => setOpen(false)}>
          {!other ? (
            <>
              <p className="text-sm text-stone-600">
                Find the other record for {name}. Their check-ins, messages and
                roles all come together into one.
              </p>
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name"
                className="mt-3 w-full rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-cyan"
              />
              <ul className="mt-3 space-y-1.5">
                {list === null ? (
                  <li className="text-sm text-stone-500">Searching…</li>
                ) : list.length === 0 ? (
                  <li className="text-sm text-stone-500">Nobody found.</li>
                ) : (
                  list.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setOther(c);
                          // Keep the one with an account, or more history.
                          setKeepThis(c.connected ? false : events >= c.events);
                        }}
                        className="flex w-full items-center rounded-xl bg-white px-3 py-2 text-left ring-1 ring-black/10 hover:ring-pink"
                      >
                        {card(c.name, c.team, c.events, c.detail)}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </>
          ) : (
            <>
              <p className="text-sm text-stone-600">
                Which one should stay? The other&apos;s check-ins and details
                move into it, then it&apos;s removed. This can&apos;t be undone.
              </p>
              <div className="mt-3 space-y-2">
                {[
                  { keep: true, n: name, t: team, ev: events },
                  {
                    keep: false,
                    n: other.name,
                    t: other.team,
                    ev: other.events,
                    d: other.connected ? "has an account" : other.detail,
                  },
                ].map((o) => (
                  <label
                    key={String(o.keep)}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl bg-white px-3 py-2 ring-1 ${keepThis === o.keep ? "ring-2 ring-navy" : "ring-black/10"}`}
                  >
                    <input
                      type="radio"
                      checked={keepThis === o.keep}
                      onChange={() => setKeepThis(o.keep)}
                      className="accent-navy"
                    />
                    {card(o.n, o.t, o.ev, "d" in o ? o.d : undefined)}
                  </label>
                ))}
              </div>
              <p className="mt-3 text-sm text-stone-600">
                Together: about {events + other.events} events (check-ins at the
                same event count once).
              </p>
              {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      setError("");
                      const keep = keepThis ? personId : other.id;
                      const drop = keepThis ? other.id : personId;
                      const r = await mergePeople(keep, drop);
                      if (r.error) return setError(r.error);
                      setOpen(false);
                      if (keepThis) router.refresh();
                      else router.replace(`/people/${keep}`);
                    })
                  }
                  className="flex-1 rounded-xl bg-pink px-4 py-2.5 font-semibold text-navy hover:bg-pink-strong disabled:opacity-60"
                >
                  {pending ? "Merging…" : "Merge into one"}
                </button>
                <button
                  type="button"
                  onClick={() => setOther(null)}
                  className="rounded-xl px-4 py-2.5 text-stone-600 hover:bg-black/5"
                >
                  Back
                </button>
              </div>
            </>
          )}
        </Sheet>
      )}
    </>
  );
}
