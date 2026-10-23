import type { TaskRow } from "@/components/task-card";
import { formatEventDate } from "@/lib/time";

type Crew = {
  id: string;
  name: string;
  leads: string[];
  open: TaskRow[];
  done: number;
};

// Organisers' view of what the Core Team and helpers are looking after.
// A light overview ("Sam's on it"), not a checklist to chase people with.
export function CoreTeamTasks({
  crew,
  now,
  tz,
}: {
  crew: Crew[];
  now: number;
  tz: string;
}) {
  if (crew.length === 0) return null;
  return (
    <section className="rounded-3xl bg-cyan/10 p-4 ring-1 ring-cyan/30 sm:p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <span aria-hidden>🤝</span> Core Team and helpers
      </h2>
      <p className="mb-3 text-sm text-stone-500">
        What they&apos;re looking after. Nothing to do here unless they ask for
        a hand.
      </p>
      <ul className="space-y-2">
        {crew.map((c) => (
          <li
            key={c.id}
            className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-black/5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">
                {c.name}
                <span className="ml-2 text-xs font-semibold text-stone-500">
                  {c.leads.length ? c.leads.join(" & ") : "Helper"}
                </span>
              </p>
              <p className="text-xs text-stone-500">
                {c.open.length === 0
                  ? "All caught up"
                  : `${c.open.length} on the go`}
                {c.done > 0 && ` · ${c.done} done lately`}
              </p>
            </div>
            {c.open.length > 0 && (
              <ul className="mt-2 space-y-1">
                {c.open.map((t) => {
                  const hours = (Date.parse(t.dueAt) - now) / 36e5;
                  const dot =
                    hours <= 24
                      ? "bg-[#ef4444]"
                      : hours <= 72
                        ? "bg-[#f97316]"
                        : "bg-yellow";
                  return (
                    <li
                      key={t.id}
                      className="flex items-center gap-2 text-sm text-stone-700"
                    >
                      <span
                        aria-hidden
                        className={`h-2 w-2 shrink-0 rounded-full ${dot}`}
                      />
                      <span className="truncate">
                        {t.title}
                        {t.eventTitle && (
                          <span className="text-stone-500">
                            {" "}
                            · {t.eventTitle}
                            {t.eventAt
                              ? `, ${formatEventDate(t.eventAt, tz)}`
                              : ""}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
