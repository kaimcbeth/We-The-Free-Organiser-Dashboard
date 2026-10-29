import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOrganiser } from "@/lib/organiser";
import type { UsageSummary } from "@/lib/usage";

const WHO = ["Member", "Core Team", "Organiser", "Regional Support Lead"];
const WHO_COLOUR: Record<string, string> = {
  Member: "bg-cyan",
  "Core Team": "bg-amber-400",
  Organiser: "bg-pink",
  "Regional Support Lead": "bg-navy",
};
const RANGES = [7, 30, 90];

export default async function UsagePage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { supabase, organiser } = await requireOrganiser();
  if (organiser.access !== "god") redirect("/");
  const days = RANGES.includes(Number((await searchParams).days))
    ? Number((await searchParams).days)
    : 30;
  const { data } = await supabase.rpc("usage_summary", { p_days: days });
  const u = (data ?? {
    sections: [],
    daily: [],
    people: 0,
    views: 0,
    since: null,
  }) as UsageSummary;
  const top = Math.max(1, ...u.sections.map((s) => s.views));
  const topDay = Math.max(1, ...u.daily.map((d) => d.views));
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      timeZone: "Australia/Sydney",
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Usage</h1>
        <p className="mt-1 text-sm text-stone-500">
          Which parts of the app people open, and how often. Counts each page
          someone opens while signed in (the same page again within a minute
          isn&apos;t counted twice). You and test accounts are left out. Only
          God Mode sees this.
          {u.since && <> Counting since {fmt(u.since)}.</>}
        </p>
      </div>

      <div className="flex gap-1">
        {RANGES.map((d) => (
          <Link
            key={d}
            href={`/usage?days=${d}`}
            className={`rounded-full px-3 py-1 text-sm ${
              d === days
                ? "bg-navy text-white"
                : "bg-white text-stone-600 ring-1 ring-black/10 hover:bg-stone-50"
            }`}
          >
            {d} days
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Pages opened" value={u.views} />
        <Stat label="People" value={u.people} />
      </div>

      {u.sections.length === 0 ? (
        <p className="rounded-2xl bg-white p-4 text-sm text-stone-500 shadow-sm ring-1 ring-black/5">
          Nothing yet. Counting started today, so check back in a few days.
        </p>
      ) : (
        <>
          {u.daily.length > 1 && (
            <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
              <h2 className="text-sm font-semibold">Each day</h2>
              <div className="mt-3 flex h-24 items-end gap-0.5">
                {u.daily.map((d) => (
                  <div
                    key={d.day}
                    title={`${fmt(d.day)}: ${d.views} pages, ${d.people} people`}
                    className="flex-1 rounded-t bg-cyan/70 hover:bg-cyan"
                    style={{ height: `${(d.views / topDay) * 100}%` }}
                  />
                ))}
              </div>
              <div className="mt-1 flex justify-between text-xs text-stone-400">
                <span>{fmt(u.daily[0].day)}</span>
                <span>{fmt(u.daily[u.daily.length - 1].day)}</span>
              </div>
            </section>
          )}

          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold">By section</h2>
              <div className="flex flex-wrap gap-3 text-xs text-stone-500">
                {WHO.map((w) => (
                  <span key={w} className="flex items-center gap-1">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${WHO_COLOUR[w]}`}
                    />
                    {w}
                  </span>
                ))}
              </div>
            </div>
            <ul className="mt-3 space-y-3">
              {u.sections.map((s) => (
                <li key={s.section}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium">{s.section}</span>
                    <span className="shrink-0 text-xs text-stone-500">
                      {s.views} {s.views === 1 ? "time" : "times"} · {s.people}{" "}
                      {s.people === 1 ? "person" : "people"} · last{" "}
                      {fmt(s.last_at)}
                    </span>
                  </div>
                  <div
                    className="mt-1 flex h-2 overflow-hidden rounded-full bg-stone-100"
                    style={{ width: `${Math.max(4, (s.views / top) * 100)}%` }}
                  >
                    {WHO.filter((w) => s.by_who[w]).map((w) => (
                      <span
                        key={w}
                        title={`${w}: ${s.by_who[w]}`}
                        className={WHO_COLOUR[w]}
                        style={{ width: `${(s.by_who[w] / s.views) * 100}%` }}
                      />
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <p className="text-2xl font-semibold">{value.toLocaleString("en-AU")}</p>
      <p className="text-sm text-stone-500">{label}</p>
    </div>
  );
}
