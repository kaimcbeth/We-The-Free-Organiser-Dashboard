"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteEvents } from "@/app/actions";

export type PastRow = {
  id: string;
  title: string;
  date: string; // e.g. "Sat 16 Mar 2024"
  sub: string; // type · venue
  host: string | null; // "Hosted by …" from the Facebook notes
  canDelete: boolean; // added by hand (imported ones would come back)
  checkedIn: number;
};

// The full Past list (/?past=all). "Select" turns rows into tick boxes so a
// lot of old events can be deleted in one go.
export function PastPicker({ rows }: { rows: PastRow[] }) {
  const router = useRouter();
  const [sel, setSel] = useState<Set<string> | null>(null);
  const [sure, setSure] = useState(false);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const deletable = rows.filter((r) => r.canDelete);
  const toggle = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <section className="w-full">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Past ({rows.length})
        </h2>
        {deletable.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setSel(sel ? null : new Set());
              setSure(false);
              setMsg("");
            }}
            className="text-sm font-medium text-stone-500 hover:text-stone-800 hover:underline"
          >
            {sel ? "Done" : "Select"}
          </button>
        )}
      </div>
      {msg && (
        <p className="mb-3 rounded-xl bg-cyan/15 px-3 py-2 text-sm text-navy">
          {msg}
        </p>
      )}
      {sel && (
        <p className="mb-2 text-xs text-stone-500">
          Tap events to tick them. Ones from activism.wtf can&apos;t be deleted
          here (they&apos;d come back), so they have no tick box.
        </p>
      )}
      <ul className="divide-y divide-black/5 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        {rows.map((r) => {
          const on = sel?.has(r.id) ?? false;
          const inner = (
            <>
              {sel && (
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-xs font-bold ring-1 ${
                    !r.canDelete
                      ? "opacity-0"
                      : on
                        ? "bg-red-700 text-white ring-red-700"
                        : "bg-white text-transparent ring-stone-300"
                  }`}
                >
                  ✓
                </span>
              )}
              <span className="w-24 shrink-0 text-xs font-medium leading-tight text-stone-500 sm:text-sm">
                {r.date}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium leading-snug sm:truncate">
                  {r.title}
                </span>
                <span className="block truncate text-xs text-stone-500 sm:text-sm">
                  {[r.host, r.sub].filter(Boolean).join(" · ")}
                </span>
              </span>
              {r.checkedIn > 0 && (
                <span
                  className="shrink-0 text-xs tabular-nums text-stone-500"
                  title="Checked in"
                >
                  {r.checkedIn}
                </span>
              )}
            </>
          );
          return (
            <li key={r.id} className={on ? "bg-red-50" : ""}>
              {sel ? (
                <button
                  type="button"
                  disabled={!r.canDelete}
                  onClick={() => toggle(r.id)}
                  className="flex w-full items-start gap-3 px-3 py-3 text-left hover:bg-stone-50 disabled:opacity-50 sm:px-4"
                >
                  {inner}
                </button>
              ) : (
                <Link
                  href={`/events/${r.id}`}
                  className="flex items-start gap-3 px-3 py-3 hover:bg-stone-50 sm:px-4"
                >
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      {sel && (
        <>
          <div className="h-24" aria-hidden />
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-white/95 px-4 pb-5 pt-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur">
            <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-navy">
                {sel.size} selected
              </span>
              {sel.size < deletable.length && (
                <button
                  type="button"
                  onClick={() => setSel(new Set(deletable.map((r) => r.id)))}
                  className="font-medium text-pink-ink hover:underline"
                >
                  Select all {deletable.length}
                </button>
              )}
              {sel.size > 0 && (
                <button
                  type="button"
                  onClick={() => setSel(new Set())}
                  className="text-stone-500 hover:underline"
                >
                  Clear
                </button>
              )}
              <span className="ml-auto flex gap-2">
                {sure ? (
                  <>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          const r = await deleteEvents([...sel]);
                          setSure(false);
                          if (r.error) setMsg(r.error);
                          else {
                            setMsg(
                              `${r.deleted} event${r.deleted === 1 ? "" : "s"} deleted. Their photos are still in the Photo Hub.`,
                            );
                            setSel(new Set());
                            router.refresh();
                          }
                        })
                      }
                      className="rounded-xl bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800 disabled:opacity-60"
                    >
                      {pending ? "Deleting…" : `Yes, delete ${sel.size}`}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSure(false)}
                      className="rounded-xl px-3 py-2 text-stone-700 hover:bg-black/5"
                    >
                      Keep
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={sel.size === 0}
                    onClick={() => setSure(true)}
                    className="rounded-xl bg-white px-4 py-2 font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-40"
                  >
                    Delete
                  </button>
                )}
              </span>
            </div>
            {sure && (
              <p className="mx-auto mt-2 max-w-2xl text-xs text-stone-500">
                Check-ins on these go too. It can&apos;t be undone.
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
