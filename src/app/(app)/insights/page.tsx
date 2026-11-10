import Link from "next/link";
import { requireOrganiser } from "@/lib/organiser";
import { loadInsightData } from "@/lib/insights-data";
import { computeInsights, RULES, type PersonInsight } from "@/lib/insights";
import { LoadError } from "@/components/load-error";
import { EveryoneTable } from "./everyone-table";
import { RegionInsights } from "./region-insights";
import { computeCharts } from "@/lib/insight-charts";
import {
  ComeBack,
  EngagementBar,
  GrowthChart,
  KindChart,
  TopEvents,
} from "./charts";
import { GlobalInsights } from "./global-insights";

export default async function InsightsPage() {
  const { supabase, organiser } = await requireOrganiser();
  if (organiser.allCommunities && organiser.role === "god")
    return <GlobalInsights supabase={supabase} teams={organiser.teams} />;
  if (organiser.allCommunities)
    return <RegionInsights supabase={supabase} teams={organiser.teams} />;
  const data = await loadInsightData(supabase, organiser.team_id);
  if (!data) return <LoadError what="insights" />;

  const r = computeInsights(data.people, data.checkIns, data.events);
  const thisMonth = r.months[0];
  const lastMonth = r.months[1];
  const totalCheckIns = r.months.reduce((n, m) => n + m.checkIns, 0);
  const charts = computeCharts(
    data.people,
    data.checkIns,
    data.events,
    r.everyone,
  );
  // Weeks while the community is new to the app (months would be one bar).
  const startWeeks =
    !charts.firstData ||
    // eslint-disable-next-line react-hooks/purity -- server component
    Date.now() - Date.parse(charts.firstData) < 120 * 864e5;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
        <p className="mt-1 text-sm text-stone-500">
          {r.totals.everAttended} of {r.totals.people} people have been checked
          in to an event.
        </p>
        {totalCheckIns < 30 && (
          <p className="mt-3 rounded-xl bg-white px-4 py-3 text-sm text-stone-600 ring-1 ring-black/5">
            These get more useful after a few weeks of check-ins. Regulars,
            follow-ups and milestones will fill in as people come along.
          </p>
        )}
      </div>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            {thisMonth.label}
          </h2>
          <Link
            href={`/insights/month/${thisMonth.key}`}
            className="text-sm font-medium text-pink-ink"
          >
            See details
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            href={`/insights/month/${thisMonth.key}#events`}
            value={thisMonth.events}
            was={lastMonth?.events}
            label="events"
          />
          <Stat
            href={`/insights/month/${thisMonth.key}#events`}
            value={thisMonth.checkIns}
            was={lastMonth?.checkIns}
            label="check-ins"
          />
          <Stat
            href={`/insights/month/${thisMonth.key}#people`}
            value={thisMonth.people}
            was={lastMonth?.people}
            label="people"
          />
          <Stat
            href={`/insights/month/${thisMonth.key}#first-timers`}
            value={thisMonth.firstTimers}
            was={lastMonth?.firstTimers}
            label="first-timers"
            accent
          />
        </div>
      </section>

      <GrowthChart
        weeks={charts.weeks}
        months={charts.months}
        startWeeks={startWeeks}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <EngagementBar segments={charts.segments} />
        <ComeBack {...charts.comeBack} />
        <KindChart kinds={charts.kinds} />
        <TopEvents events={charts.topEvents} />
      </div>

      <section data-tour="insights-follow-up">
        <h2 className="text-lg font-semibold tracking-tight">
          Who to reach out to
        </h2>
        <p className="mt-0.5 text-sm text-stone-500">
          People worth a message, and milestones worth celebrating.
        </p>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
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
            title="Regulars"
            hint="3 or more events in the last 3 months"
            list={r.regulars}
            list_id="regulars"
            empty="No regulars yet."
          />
        </div>
      </section>

      <section data-tour="insights-table" className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">The details</h2>
        <details className="group rounded-2xl bg-white shadow-sm ring-1 ring-black/5 open:ring-pink/40">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
            <span>
              <span className="font-medium">Everyone</span>{" "}
              <span className="text-sm text-stone-500">
                · {r.everyone.length} people, their last event and how often
                they come
              </span>
            </span>
            <span
              aria-hidden
              className="text-stone-400 transition-transform group-open:rotate-180"
            >
              ▼
            </span>
          </summary>
          <div className="px-3 pb-4 sm:px-4">
            <div className="mb-2 text-right">
              <a
                href="/insights/export?list=everyone"
                className="text-sm font-medium text-pink-ink"
              >
                Download CSV
              </a>
            </div>
            <EveryoneTable rows={r.everyone} tz={organiser.team.timezone} />
            <p className="mt-2 text-xs text-stone-500">
              Tap a column heading to sort. Last event: cyan = last 2 weeks,
              yellow = last 2 months, pink = quieter. Darker circles = more
              events.
            </p>
          </div>
        </details>
        <details className="group rounded-2xl bg-white shadow-sm ring-1 ring-black/5 open:ring-pink/40">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
            <span>
              <span className="font-medium">Monthly totals</span>{" "}
              <span className="text-sm text-stone-500">
                · the last 6 months in numbers
              </span>
            </span>
            <span
              aria-hidden
              className="text-stone-400 transition-transform group-open:rotate-180"
            >
              ▼
            </span>
          </summary>
          <div className="px-3 pb-4 sm:px-4">
            <div className="mb-2 text-right">
              <a
                href="/insights/export?list=monthly"
                className="text-sm font-medium text-pink-ink"
              >
                Download CSV
              </a>
            </div>
            <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/5 text-left text-stone-500">
                    <th className="px-4 py-2.5 font-medium">Month</th>
                    <th className="px-3 py-2.5 text-right font-medium">
                      Events
                    </th>
                    <th className="px-3 py-2.5 text-right font-medium">
                      Check-ins
                    </th>
                    <th className="px-3 py-2.5 text-right font-medium">
                      Outreach
                    </th>
                    <th className="px-3 py-2.5 text-right font-medium">
                      People
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium">New</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {r.months.map((m) => (
                    <tr
                      key={m.key}
                      className="border-b border-black/5 last:border-0 hover:bg-stone-50"
                    >
                      <td className="px-4 py-2.5 font-medium">
                        <Link
                          href={`/insights/month/${m.key}`}
                          className="text-pink-ink hover:underline"
                        >
                          {m.label}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-right">{m.events}</td>
                      <td className="px-3 py-2.5 text-right">{m.checkIns}</td>
                      <td className="px-3 py-2.5 text-right">
                        {m.outreachCheckIns}
                      </td>
                      <td className="px-3 py-2.5 text-right">{m.people}</td>
                      <td className="px-4 py-2.5 text-right">
                        {m.firstTimers}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-stone-500">
              Tap a month for details. Outreach = check-ins at outreach events.
              People = different people that month. New = first ever event.
            </p>
          </div>
        </details>
      </section>
    </div>
  );
}

function Stat({
  href,
  value,
  was,
  label,
  accent,
}: {
  href: string;
  value: number;
  was?: number; // last month, for the change line
  label: string;
  accent?: boolean;
}) {
  const diff = was === undefined ? 0 : value - was;
  return (
    <Link
      href={href}
      className={`group rounded-2xl p-4 transition-transform hover:-translate-y-0.5 ${
        accent
          ? "bg-navy text-white"
          : "bg-white shadow-sm ring-1 ring-black/5 hover:ring-pink/60"
      }`}
    >
      <p
        className={`text-3xl font-semibold tabular-nums ${accent ? "text-pink" : ""}`}
      >
        {value}
      </p>
      <p
        className={`flex items-center justify-between text-sm ${accent ? "text-white/75" : "text-stone-500"}`}
      >
        {label}
        <span aria-hidden className="opacity-40 group-hover:opacity-100">
          →
        </span>
      </p>
      {was !== undefined && (
        <p
          className={`mt-1 text-xs ${accent ? "text-white/60" : "text-stone-500"}`}
        >
          {diff === 0
            ? "Same as last month"
            : `${diff > 0 ? "▲" : "▼"} ${Math.abs(diff)} on last month`}
        </p>
      )}
    </Link>
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
          <a
            href={`/insights/export?list=${list_id}`}
            className="shrink-0 text-sm font-medium text-pink-ink"
          >
            Download CSV
          </a>
        )}
      </div>
      <p className="mb-3 text-xs text-stone-500">{hint}</p>
      {list.length === 0 ? (
        <p className="text-sm text-stone-500">{empty}</p>
      ) : (
        <PeopleRows list={list.slice(0, 5)} />
      )}
      {list.length > 5 && (
        <details className="group mt-2">
          <summary className="cursor-pointer list-none text-sm font-medium text-pink-ink [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">
              Show {Math.min(list.length, 25) - 5} more
            </span>
            <span className="hidden group-open:inline">Show fewer</span>
          </summary>
          <div className="mt-2">
            <PeopleRows list={list.slice(5, 25)} />
          </div>
          {list.length > 25 && (
            <p className="mt-2 text-xs text-stone-500">
              Showing 25 of {list.length}. Download the CSV for the full list.
            </p>
          )}
        </details>
      )}
    </section>
  );
}

function PeopleRows({ list }: { list: PersonInsight[] }) {
  return (
    <ul className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      {list.map((p) => (
        <li key={p.id} className="border-b border-black/5 last:border-0">
          <Link
            href={`/people/${p.id}`}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{p.name}</p>
              <p className="truncate text-xs text-stone-500">{p.detail}</p>
            </div>
            <div className="shrink-0 text-right text-xs text-stone-500">
              <p>
                <span className="font-semibold text-stone-800">{p.events}</span>{" "}
                events
              </p>
              <p>
                <span className="font-semibold text-stone-800">
                  {p.outreach}
                </span>{" "}
                outreach
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
