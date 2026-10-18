import Link from "next/link";
import { requireOrganiser } from "@/lib/organiser";
import { loadInsightData } from "@/lib/insights-data";
import { computeInsights, RULES, type PersonInsight } from "@/lib/insights";
import { LoadError } from "@/components/load-error";
import { EveryoneTable } from "./everyone-table";

export default async function InsightsPage() {
  const { supabase, organiser } = await requireOrganiser();
  const data = await loadInsightData(supabase, organiser.team_id);
  if (!data) return <LoadError what="insights" />;

  const r = computeInsights(data.people, data.checkIns, data.events);
  const thisMonth = r.months[0];
  const totalCheckIns = r.months.reduce((n, m) => n + m.checkIns, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
        <p className="mt-1 text-sm text-stone-500">
          {r.totals.everAttended} of {r.totals.people} people have been checked in to an event.
        </p>
        {totalCheckIns < 30 && (
          <p className="mt-3 rounded-xl bg-white px-4 py-3 text-sm text-stone-600 ring-1 ring-black/5">
            These get more useful after a few weeks of check-ins. Regulars, follow-ups and milestones will fill in
            as people come along.
          </p>
        )}
      </div>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Everyone <span className="text-stone-400">· {r.everyone.length}</span>
          </h2>
          <a href="/insights/export?list=everyone" className="text-sm font-medium text-pink-ink">
            Download CSV
          </a>
        </div>
        <EveryoneTable rows={r.everyone} />
        <p className="mt-2 text-xs text-stone-500">Tap a column heading to sort. Counts are events attended.</p>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">{thisMonth.label}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat value={thisMonth.events} label="events" />
          <Stat value={thisMonth.checkIns} label="check-ins" />
          <Stat value={thisMonth.people} label="people" />
          <Stat value={thisMonth.firstTimers} label="first-timers" accent />
        </div>
      </section>

      <PeopleSection
        title="Milestones coming up"
        hint={`Next outreach event will be their ${RULES.milestoneEvery}th, 20th, 30th…`}
        list={r.milestoneSoon}
        list_id="milestones-soon"
        empty="No one is one outreach event away from a milestone right now."
      />
      <PeopleSection
        title="Recent milestones"
        hint="Reached in the last 30 days"
        list={r.milestoneRecent}
        list_id="milestones-recent"
        empty="No milestones in the last 30 days."
      />
      <PeopleSection
        title="Follow up: came once"
        hint="One event, more than a month ago. A friendly message could bring them back."
        list={r.oneTimers}
        list_id="one-timers"
        empty="No one to follow up yet."
      />
      <PeopleSection
        title="Drifted off"
        hint="Were regulars, nothing in the last 2 months"
        list={r.drifted}
        list_id="drifted"
        empty="No one has drifted off."
      />
      <PeopleSection
        title="Regulars"
        hint="3 or more events in the last 3 months"
        list={r.regulars}
        list_id="regulars"
        empty="No regulars yet."
      />

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Monthly totals</h2>
          <a href="/insights/export?list=monthly" className="text-sm font-medium text-pink-ink">
            Download CSV
          </a>
        </div>
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5 text-left text-stone-500">
                <th className="px-4 py-2.5 font-medium">Month</th>
                <th className="px-3 py-2.5 text-right font-medium">Events</th>
                <th className="px-3 py-2.5 text-right font-medium">Check-ins</th>
                <th className="px-3 py-2.5 text-right font-medium">Outreach</th>
                <th className="px-3 py-2.5 text-right font-medium">People</th>
                <th className="px-4 py-2.5 text-right font-medium">New</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {r.months.map((m) => (
                <tr key={m.key} className="border-b border-black/5 last:border-0">
                  <td className="px-4 py-2.5 font-medium">{m.label}</td>
                  <td className="px-3 py-2.5 text-right">{m.events}</td>
                  <td className="px-3 py-2.5 text-right">{m.checkIns}</td>
                  <td className="px-3 py-2.5 text-right">{m.outreachCheckIns}</td>
                  <td className="px-3 py-2.5 text-right">{m.people}</td>
                  <td className="px-4 py-2.5 text-right">{m.firstTimers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-stone-500">
          Outreach = check-ins at outreach events. People = different people that month. New = first ever event.
        </p>
      </section>
    </div>
  );
}

function Stat({ value, label, accent }: { value: number; label: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 ${accent ? "bg-navy text-white" : "bg-white shadow-sm ring-1 ring-black/5"}`}>
      <p className={`text-3xl font-semibold tabular-nums ${accent ? "text-pink" : ""}`}>{value}</p>
      <p className={`text-sm ${accent ? "text-white/75" : "text-stone-500"}`}>{label}</p>
    </div>
  );
}

function PeopleSection({
  title,
  hint,
  list,
  list_id,
  empty,
}: {
  title: string;
  hint: string;
  list: PersonInsight[];
  list_id: string;
  empty: string;
}) {
  return (
    <section>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          {title} <span className="text-stone-400">· {list.length}</span>
        </h2>
        {list.length > 0 && (
          <a href={`/insights/export?list=${list_id}`} className="shrink-0 text-sm font-medium text-pink-ink">
            Download CSV
          </a>
        )}
      </div>
      <p className="mb-3 text-xs text-stone-500">{hint}</p>
      {list.length === 0 ? (
        <p className="text-sm text-stone-500">{empty}</p>
      ) : (
        <ul className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          {list.slice(0, 25).map((p) => (
            <li key={p.id} className="border-b border-black/5 last:border-0">
              <Link href={`/people/${p.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="truncate text-sm text-stone-500">{p.detail}</p>
                </div>
                <div className="shrink-0 text-right text-xs text-stone-500">
                  <p>
                    <span className="font-semibold text-stone-800">{p.events}</span> events
                  </p>
                  <p>
                    <span className="font-semibold text-stone-800">{p.outreach}</span> outreach
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {list.length > 25 && (
        <p className="mt-2 text-xs text-stone-500">Showing 25 of {list.length}. Download the CSV for the full list.</p>
      )}
    </section>
  );
}
