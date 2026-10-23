"use client";

import { useState, useTransition } from "react";
import { chooseCoreTasks, setAwayUntil, setTaskHelper } from "@/app/actions";
import { CORE_ROLE_BLURB, CORE_ROLE_LABEL, type CoreRole } from "@/lib/roles";

export type SetupTask = {
  kind: string;
  title: string;
  blurb: string | null;
  coreRole: CoreRole;
  estimate: string;
  when: string;
  ownerId: string | null;
  ownerName: string | null;
  helperId: string | null;
};

export function CoreTaskSetup({
  myId,
  roles,
  tasks,
  helpers,
  awayUntil,
  preview,
  today,
}: {
  myId: string;
  roles: CoreRole[];
  tasks: SetupTask[];
  helpers: { id: string; name: string }[];
  awayUntil: string | null;
  preview: boolean;
  today: string;
}) {
  const mine = tasks.filter((t) => t.ownerId === myId).map((t) => t.kind);
  const firstTime = preview || mine.length === 0;
  const [chosen, setChosen] = useState<Set<string>>(new Set(mine));
  const [saved, setSaved] = useState<Set<string>>(new Set(mine));
  const [helperOf, setHelperOf] = useState<Record<string, string>>(
    Object.fromEntries(tasks.map((t) => [t.kind, t.helperId ?? ""])),
  );
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const changed =
    chosen.size !== saved.size || [...chosen].some((k) => !saved.has(k));

  function toggle(kind: string) {
    const next = new Set(chosen);
    if (next.has(kind)) next.delete(kind);
    else next.add(kind);
    setChosen(next);
    setMessage("");
  }

  function save() {
    start(async () => {
      const r = await chooseCoreTasks([...chosen]);
      if (r.error) setError(r.error);
      else {
        setError("");
        setSaved(new Set(chosen));
        setMessage(
          preview
            ? "Preview: nothing was saved."
            : "Saved. These come to you from now on.",
        );
      }
    });
  }

  return (
    <div id="choose" className="scroll-mt-24 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {firstTime ? "Welcome to the Core Team!" : "Your Core Team actions"}
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          {firstTime
            ? "Pick the actions you'd like to look after. They'll come to you every time, with a reminder. Anything you don't pick stays with the organisers."
            : "The actions you look after. Change them any time, or hand one to a helper."}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {roles.map((r) => (
            <span
              key={r}
              className="rounded-full bg-yellow px-2.5 py-0.5 text-xs font-semibold text-navy"
            >
              {CORE_ROLE_LABEL[r]}
            </span>
          ))}
        </div>
      </div>

      {roles.map((role) => {
        const list = tasks.filter((t) => t.coreRole === role);
        return (
          <section key={role}>
            <h2 className="font-semibold">{CORE_ROLE_LABEL[role]}</h2>
            <p className="mb-2 text-sm text-stone-500">
              {CORE_ROLE_BLURB[role]}
            </p>
            {list.length === 0 ? (
              <p className="text-sm text-stone-500">No actions here yet.</p>
            ) : (
              <ul className="divide-y divide-black/5 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                {list.map((t) => {
                  const takenBy =
                    t.ownerId && t.ownerId !== myId ? t.ownerName : null;
                  const on = chosen.has(t.kind);
                  return (
                    <li key={t.kind} className="px-4 py-3">
                      <label
                        className={`flex items-start gap-3 ${takenBy ? "opacity-60" : "cursor-pointer"}`}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          disabled={!!takenBy}
                          onChange={() => toggle(t.kind)}
                          className="mt-1 h-4 w-4 accent-[var(--color-navy)]"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{t.title}</span>
                            <span className="rounded-full bg-navy/5 px-2 py-0.5 text-xs font-semibold">
                              ~{t.estimate} min
                            </span>
                            <span className="text-xs text-stone-500">
                              {t.when}
                            </span>
                          </span>
                          {t.blurb && (
                            <span className="block text-sm text-stone-500">
                              {t.blurb}
                            </span>
                          )}
                          {takenBy && (
                            <span className="block text-sm font-medium text-stone-600">
                              {takenBy} has this one
                            </span>
                          )}
                        </span>
                      </label>
                      {saved.has(t.kind) && on && helpers.length > 0 && (
                        <div className="mt-2 flex items-center gap-2 pl-7 text-sm">
                          <span className="text-stone-500">Done by</span>
                          <select
                            value={helperOf[t.kind] ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setHelperOf({ ...helperOf, [t.kind]: v });
                              start(async () => {
                                const r = await setTaskHelper(
                                  t.kind,
                                  v || null,
                                );
                                if (r.error) setError(r.error);
                              });
                            }}
                            className="rounded-lg border border-stone-300 bg-white px-2 py-1"
                            aria-label={`Who does ${t.title}`}
                          >
                            <option value="">Me</option>
                            {helpers.map((h) => (
                              <option key={h.id} value={h.id}>
                                {h.name} (helper)
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}

      <div className="sticky bottom-3 z-10">
        <button
          onClick={save}
          disabled={pending || (!changed && !firstTime)}
          className="w-full rounded-xl bg-pink px-4 py-3 font-semibold text-navy shadow-lg hover:bg-pink-strong disabled:opacity-50"
        >
          {pending
            ? "Saving…"
            : firstTime
              ? `These are my actions (${chosen.size})`
              : changed
                ? "Save changes"
                : "Saved"}
        </button>
        {message && (
          <p className="mt-2 rounded-lg bg-cyan/20 px-3 py-2 text-center text-sm font-medium text-navy">
            {message}
          </p>
        )}
        {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      </div>

      {!firstTime && (
        <Away initial={awayUntil} today={today} preview={preview} />
      )}
    </div>
  );
}

function Away({
  initial,
  today,
  preview,
}: {
  initial: string | null;
  today: string;
  preview: boolean;
}) {
  const away = initial && initial >= today ? initial : null;
  const [date, setDate] = useState(away ?? "");
  const [current, setCurrent] = useState(away);
  const [pending, start] = useTransition();
  const save = (v: string | null) =>
    start(async () => {
      if (!preview) await setAwayUntil(v);
      setCurrent(v);
    });
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <h2 className="font-semibold">Going away?</h2>
      {current ? (
        <>
          <p className="mt-1 text-sm text-stone-600">
            You&apos;re away until{" "}
            <span className="font-medium">
              {new Date(current + "T12:00:00Z").toLocaleDateString("en-AU", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </span>
            . Your actions go to the organisers until then.
          </p>
          <button
            disabled={pending}
            onClick={() => save(null)}
            className="mt-3 rounded-xl px-4 py-2 text-sm font-semibold text-navy ring-1 ring-stone-300 hover:bg-stone-50"
          >
            I&apos;m back
          </button>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-stone-600">
            Your actions go to the organisers while you&apos;re away.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="text-sm text-stone-600" htmlFor="away-until">
              Away until
            </label>
            <input
              id="away-until"
              type="date"
              min={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm"
            />
            <button
              disabled={pending || !date}
              onClick={() => save(date)}
              className="rounded-xl bg-navy px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </>
      )}
    </section>
  );
}
