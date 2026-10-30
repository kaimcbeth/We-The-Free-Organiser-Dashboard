"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type HelperRow = {
  id: string;
  person_id: string;
  name: string;
  role_key: string;
  title: string;
  needs_ok: boolean;
  status: "pending" | "active";
  created_at: string;
  events: number;
};

// What each role needs from an organiser once they say yes.
const SET_UP: Record<string, string> = {
  attendance:
    "Make them Core Team on their profile so they can tick people in.",
  social_photos: "Give them access to the community's Instagram or Facebook.",
  facebook_events: "Make them an editor on the community's Facebook page.",
};

// People: members who've put their hand up for a micro role (How you can
// help). Asks that need an OK come first; everyone helping is folded below.
export function HelpingOut({
  rows,
  trained,
}: {
  rows: HelperRow[];
  trained: { title: string; people: { id: string; name: string }[] }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (rows.length === 0 && trained.length === 0) return null;
  const asks = rows.filter((r) => r.status === "pending");
  const active = rows.filter((r) => r.status === "active");
  const byRole = new Map<string, HelperRow[]>();
  for (const r of active)
    byRole.set(r.title, [...(byRole.get(r.title) ?? []), r]);

  function decide(id: string, yes: boolean) {
    start(async () => {
      await createClient().rpc("decide_micro_role", { p_id: id, p_yes: yes });
      router.refresh();
    });
  }

  return (
    <section id="helping-out" className="mt-6 scroll-mt-4">
      {asks.length > 0 && (
        <ul className="space-y-2">
          {asks.map((r) => (
            <li
              key={r.id}
              className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-pink"
            >
              <p className="font-semibold">
                <Link
                  href={`/people/${r.person_id}`}
                  className="hover:underline"
                >
                  {r.name}
                </Link>{" "}
                would like to help: {r.title.toLowerCase()}
              </p>
              <p className="mt-0.5 text-sm text-stone-500">
                {r.events} {r.events === 1 ? "event" : "events"}
                {SET_UP[r.role_key] && <> · If yes: {SET_UP[r.role_key]}</>}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => decide(r.id, true)}
                  className="rounded-xl bg-pink px-4 py-2 text-sm font-semibold text-navy hover:bg-pink-strong disabled:opacity-60"
                >
                  Yes
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => decide(r.id, false)}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50 disabled:opacity-60"
                >
                  Not right now
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {trained.length > 0 && (
        <details className="mt-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-black/5">
          <summary className="cursor-pointer text-sm font-semibold">
            Training done
          </summary>
          <ul className="mt-3 space-y-3 text-sm">
            {trained.map((t) => (
              <li key={t.title}>
                <p className="font-medium text-stone-700">
                  {t.title} ({t.people.length})
                </p>
                <p className="mt-1 text-stone-600">
                  {t.people.map((p, i) => (
                    <span key={p.id}>
                      {i > 0 && ", "}
                      <Link
                        href={`/people/${p.id}`}
                        className="hover:underline"
                      >
                        {p.name}
                      </Link>
                    </span>
                  ))}
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}

      {active.length > 0 && (
        <details className="mt-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-black/5">
          <summary className="cursor-pointer text-sm font-semibold">
            Helping out ({active.length})
          </summary>
          <ul className="mt-3 space-y-3 text-sm">
            {[...byRole].map(([title, list]) => (
              <li key={title}>
                <p className="font-medium text-stone-700">{title}</p>
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {list.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center gap-1 rounded-full bg-stone-100 py-0.5 pl-2.5 pr-1"
                    >
                      <Link
                        href={`/people/${r.person_id}`}
                        className="hover:underline"
                      >
                        {r.name}
                      </Link>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => decide(r.id, false)}
                        aria-label={`Take ${r.name} off ${title.toLowerCase()}`}
                        title="Take off this role"
                        className="rounded-full px-1.5 text-stone-400 hover:bg-stone-200 hover:text-navy"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
