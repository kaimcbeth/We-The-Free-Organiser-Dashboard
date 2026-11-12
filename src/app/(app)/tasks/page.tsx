import Link from "next/link";
import { cookies } from "next/headers";
import { ShowToggle } from "./show-toggle";
import { SHOW_COOKIE, type ShowActions } from "@/lib/actions-show";
import { requireOrganiser } from "@/lib/organiser";
import { LoadError } from "@/components/load-error";
import { LaterRow } from "@/components/later-row";
import { TaskCard } from "@/components/task-card";
import { loadRegionTasks, loadTeamTasks } from "@/lib/tasks";
import { RegionActions } from "./region-actions";
import { loadTaskSetup } from "@/lib/task-setup";
import { loadUpcomingActions } from "@/lib/upcoming-actions";
import { ComingUp } from "./coming-up";
import { ShowMoreEvents } from "./show-more";
import { ChooseTasks } from "./choose-tasks";
import { RegionPlanner } from "@/components/region-planner";
import { AddRegionAction } from "@/components/add-region-action";
import { RemoveEventTasks } from "./remove-event-tasks";
import {
  dayBoundsUtc,
  formatEventDate,
  formatTime,
  todayInTz,
} from "@/lib/time";
import { loadConnectContext } from "@/lib/connect";
import { loadRslTeams } from "@/lib/rsl-teams";
import { GroupedCheckIns } from "@/components/grouped-checkins";
import { OrganiserChatsLink } from "@/components/organiser-chats-link";
import { loadChatLinks } from "@/lib/beeper";
import { RegionTasks } from "./region-tasks";
import { GodOverview } from "./god-overview";
import { CoreTeamTasks } from "./core-team-tasks";
import { ActionSearch } from "./action-search";
import { EventGroup } from "./event-group";
import { CORE_ROLE_LABEL, type CoreRole } from "@/lib/roles";

// Under 100 minutes: "85 min"; 100 and over: "2 hr 42 min".
const hoursMinutes = (m: number) =>
  m < 100
    ? `${m} min`
    : `${Math.floor(m / 60)} hr${m % 60 ? ` ${m % 60} min` : ""}`;

export default async function TasksPage({ searchParams }: PageProps<"/tasks">) {
  const { event: onlyEvent } = await searchParams;
  const { supabase, organiser } = await requireOrganiser();
  const regionalStaff =
    organiser.role === "god" || organiser.role === "regional_lead";
  // Regional Support Leads only get their own tasks (the communities' tasks
  // are for the communities). God Mode sees both.
  // God Mode with "All communities": a light overview by region.
  // Region-wide actions (e.g. promoting an Organiser Hangout) for the
  // regions they lead: not while "viewing as" someone else.
  const regionTasks = await loadRegionTasks(
    supabase,
    organiser.viewingAs ? [] : organiser.leadRegionIds,
  );
  if (organiser.role === "god" && organiser.allCommunities)
    return (
      <GodOverview
        supabase={supabase}
        teams={organiser.teams}
        regionTasks={regionTasks.open}
      />
    );
  if (organiser.role === "regional_lead" || organiser.allCommunities) {
    // An RSL sees every community they look after (their region plus its
    // extra countries, e.g. Oceania + Japan), not just the one picked at the
    // top (Kai, 6 Nov 2026). God previewing as an RSL gets the picked
    // community's region.
    const regionIds =
      organiser.viewingAs === "regional_lead"
        ? organiser.previewRegionId
          ? [organiser.previewRegionId]
          : organiser.team.region_id
            ? [organiser.team.region_id]
            : []
        : organiser.role === "regional_lead"
          ? organiser.region_id
            ? [organiser.region_id]
            : organiser.leadRegionIds
          : organiser.leadRegionIds;
    // Their region's communities plus its extra countries (Oceania + Japan),
    // with "All communities" too; God's overview is handled above.
    const rslTeams = regionIds.length
      ? await loadRslTeams(supabase, regionIds)
      : organiser.allCommunities
        ? organiser.teams
        : [];
    const previewRegion =
      organiser.viewingAs === "regional_lead"
        ? (await loadRegionTasks(supabase, regionIds)).open
        : null;
    return (
      <RegionTasks
        supabase={supabase}
        teams={rslTeams.length ? rslTeams : [organiser.team]}
        showCommunities={organiser.role === "god"}
        regionTasks={previewRegion ?? regionTasks.open}
        planRegionId={regionIds[0]}
      />
    );
  }
  const [tasks, { data: people }, setup, connect, { data: leadRows }] =
    await Promise.all([
      loadTeamTasks(supabase, organiser.team_id, { regional: regionalStaff }),
      // (The tour's Example Community has no accounts: show everyone.)
      organiser.exampleMode
        ? supabase
            .from("people")
            .select("id, first_name, last_name")
            .eq("team_id", organiser.team_id)
            .order("first_name")
        : supabase
            .from("people")
            .select("id, first_name, last_name")
            .eq("team_id", organiser.team_id)
            .not("user_id", "is", null)
            .order("first_name"),
      loadTaskSetup(supabase, organiser.team_id),
      regionalStaff
        ? loadConnectContext(supabase, [organiser.team])
        : Promise.resolve(null),
      supabase
        .from("person_core_roles")
        .select("person_id, core_role, person:people(first_name, last_name)")
        .eq("team_id", organiser.team_id)
        .is("ended_at", null),
    ]);
  if (!tasks) return <LoadError what="tasks" />;

  // An RSL who's also a community's organiser (Kai, 6 Nov 2026): a check-in
  // for every community they look after (Oceania + Japan), not just this one.
  const rslTeams =
    !organiser.viewingAs && organiser.leadRegionIds.length
      ? await loadRslTeams(supabase, organiser.leadRegionIds)
      : [];
  const [rslTasks, rslConnect] = rslTeams.length
    ? await Promise.all([
        loadTeamTasks(
          supabase,
          rslTeams.map((t) => t.id),
          { regional: true },
        ),
        loadConnectContext(supabase, rslTeams),
      ])
    : [null, null];
  const chats = rslTeams.length ? await loadChatLinks(supabase) : null;
  const rslTeamById = Object.fromEntries(rslTeams.map((t) => [t.id, t]));
  const withTeam = <T extends { title: string; teamId: string }>(t: T): T =>
    rslTeamById[t.teamId]
      ? {
          ...t,
          title: `${t.title}: ${rslTeamById[t.teamId].name.replace(/, .*$/, "")}`,
        }
      : t;
  const allConnect = { ...(connect ?? {}), ...(rslConnect ?? {}) };
  // This community's own RSL actions are in rslTasks too, so take them from
  // there when it's loaded.
  const rslOpen = rslTasks
    ? rslTasks.open.filter((t) => t.regional)
    : tasks.open.filter((t) => t.regional);
  const rslLater = rslTasks
    ? rslTasks.later.filter((t) => t.regional)
    : tasks.later.filter((t) => t.regional);
  const rslDone = rslTasks
    ? rslTasks.done.filter((t) => t.regional)
    : tasks.done.filter((t) => t.regional);

  // eslint-disable-next-line react-hooks/purity -- server component, rendered per request
  const now = Date.now();
  const assignable = (people ?? []).map((p) => ({
    id: p.id,
    name: [p.first_name, p.last_name].filter(Boolean).join(" "),
  }));
  // Tasks with someone on them (Core Team or a helper) are shown separately,
  // so the main list is just what's left for the organisers.
  const covered = tasks.open.filter((t) => !t.regional && t.assignedTo);
  const leadsOf = new Map<string, string[]>();
  const leadName = new Map<string, string>();
  for (const r of (leadRows ?? []) as unknown as {
    person_id: string;
    core_role: CoreRole;
    person: { first_name: string; last_name: string | null } | null;
  }[]) {
    if (r.person)
      leadName.set(
        r.person_id,
        [r.person.first_name, r.person.last_name].filter(Boolean).join(" "),
      );
    leadsOf.set(r.person_id, [
      ...(leadsOf.get(r.person_id) ?? []),
      CORE_ROLE_LABEL[r.core_role],
    ]);
  }
  const crew = [
    ...new Set([
      ...covered.map((t) => t.assignedTo!),
      ...tasks.done.filter((t) => t.assignedTo).map((t) => t.assignedTo!),
      ...leadsOf.keys(),
    ]),
  ]
    .map((id) => ({
      id,
      name:
        assignable.find((p) => p.id === id)?.name ??
        covered.find((t) => t.assignedTo === id)?.assigneeName ??
        leadName.get(id) ??
        "Someone",
      leads: leadsOf.get(id) ?? [],
      open: covered
        .filter((t) => t.assignedTo === id)
        .sort((a, b) => a.dueAt.localeCompare(b.dueAt)),
      done: tasks.done.filter((t) => t.assignedTo === id).length,
    }))
    .sort(
      (a, b) => b.leads.length - a.leads.length || a.name.localeCompare(b.name),
    );
  const minutes = tasks.open
    .filter((t) => !t.regional && !t.assignedTo)
    .reduce((n, t) => n + t.estimateMinutes, 0);
  // Regional Support Lead check-ins sit on their own, above the community's tasks.
  const checkIns = rslOpen
    .map(withTeam)
    .sort(
      (a, b) =>
        a.dueAt.localeCompare(b.dueAt) || a.title.localeCompare(b.title),
    );

  // An RSL who's also this community's organiser can show just one side.
  const hasRsl =
    regionTasks.open.length > 0 ||
    checkIns.length > 0 ||
    (!organiser.viewingAs && organiser.leadRegionIds.length > 0);
  const saved = (await cookies()).get(SHOW_COOKIE)?.value;
  const show: ShowActions =
    hasRsl && (saved === "rsl" || saved === "local") ? saved : "both";
  const showRsl = show !== "local";
  const showLocal = show !== "rsl";
  const shortName = organiser.team.name
    .replace(/, .*$/, "")
    .replace(/^(we the free|wtf)\s+/i, "");
  // Moved for later / done: this community's own, plus the RSL ones.
  const laterShown = [
    ...(showLocal ? tasks.later.filter((t) => !t.regional) : []),
    ...(showRsl ? rslLater.map(withTeam) : []),
  ];
  const doneShown = [
    ...(showLocal ? tasks.done.filter((t) => !t.regional) : []),
    ...(showRsl ? rslDone.map(withTeam) : []),
  ];

  // Open tasks grouped by event: the event due soonest first, then the
  // tasks in their usual order (WhatsApp, Facebook, Instagram…).
  const byEvent = new Map<
    string,
    { key: string; title: string; at: string | null; tasks: typeof tasks.open }
  >();
  for (const t of tasks.open.filter((t) => !t.regional && !t.assignedTo)) {
    const key = t.eventId ?? "other";
    const g = byEvent.get(key) ?? {
      key,
      title: t.eventTitle ?? "Other actions",
      at: t.eventAt,
      tasks: [],
    };
    g.tasks.push(t);
    byEvent.set(key, g);
  }
  // This week's progress (Monday to Sunday, community time): your tasks
  // ticked off this week, out of those plus everything still open that's due
  // by Sunday (overdue ones included).
  const today = todayInTz();
  const d = new Date(`${today}T00:00:00Z`);
  const monday = new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 864e5);
  const ymd = (x: Date) => x.toISOString().slice(0, 10);
  const weekStart = dayBoundsUtc(ymd(monday)).start;
  const weekEnd = dayBoundsUtc(
    ymd(new Date(monday.getTime() + 7 * 864e5)),
  ).start;
  const mine = (t: { regional: boolean; assignedTo: string | null }) =>
    !t.regional && !t.assignedTo;
  const weekDone = tasks.done.filter(
    (t) => mine(t) && t.doneAt && Date.parse(t.doneAt) >= Date.parse(weekStart),
  ).length;
  const weekLeft = tasks.open.filter(
    (t) => mine(t) && Date.parse(t.dueAt) < Date.parse(weekEnd),
  ).length;
  const weekTotal = weekDone + weekLeft;

  // Actions still to come for the next 3 weeks of events (shown quietly).
  const upcoming = await loadUpcomingActions(
    supabase,
    organiser.team_id,
    setup.enabled,
    now,
    // Opened from one event: all of its actions, however far ahead.
    typeof onlyEvent === "string" ? { eventId: onlyEvent } : undefined,
    180, // every upcoming event in the next 6 months
  );
  const upcomingFor = (eventId: string) =>
    upcoming.filter((u) => u.eventId === eventId);
  const when = (iso: string) => {
    const days = Math.round((Date.parse(iso) - now) / 864e5);
    if (Date.parse(iso) <= now) return "any minute now";
    return days <= 0
      ? `today at ${formatTime(iso)}`
      : days === 1
        ? "tomorrow"
        : `in ${days} days`;
  };
  const whenLabel = Object.fromEntries(
    upcoming.map((u) => [u.appearsAt, when(u.appearsAt)]),
  );
  // Every upcoming event gets a group, even with nothing due yet (just its
  // coming-up actions), so you can page through all of them.
  const { data: ahead } = await supabase
    .from("events")
    .select("id, title, starts_at")
    .eq("team_id", organiser.team_id)
    .gt("starts_at", new Date(now).toISOString())
    .lte("starts_at", new Date(now + 180 * 864e5).toISOString())
    .order("starts_at")
    .limit(100);
  for (const e of ahead ?? [])
    if (!byEvent.has(e.id))
      byEvent.set(e.id, {
        key: e.id,
        title: e.title,
        at: e.starts_at,
        tasks: [],
      });
  const groups = [...byEvent.values()]
    .map((g) => ({
      ...g,
      tasks: g.tasks.sort((a, b) => a.sortOrder - b.sortOrder),
    }))
    .sort((a, b) => (a.at ?? "").localeCompare(b.at ?? ""));
  const common = {
    tz: organiser.team.timezone,
    now,
    standing: setup.delegates,
    people: assignable,
    whatsappUrl: organiser.team.whatsapp_url,
  };

  // Past events' follow-ups always show, plus the next 2 upcoming events;
  // later ones wait behind "Show more upcoming events".
  const upcomingGroups = groups.filter((g) => g.at && Date.parse(g.at) > now);
  // Opened from an event ("3 actions →"): just that event's actions.
  const focus =
    typeof onlyEvent === "string"
      ? (groups.find((g) => g.key === onlyEvent) ?? null)
      : null;
  const laterKeys = new Set(upcomingGroups.slice(2).map((g) => g.key));
  const shownGroups = focus
    ? [focus]
    : groups.filter((g) => !laterKeys.has(g.key));
  const laterGroups = focus ? [] : groups.filter((g) => laterKeys.has(g.key));
  const renderGroup = (g: (typeof groups)[number], n: number) => (
    <section
      key={g.key}
      data-tour={n === 0 ? "task-group" : undefined}
      data-search-group
      className="scroll-mt-24"
    >
      <EventGroup
        id={g.key}
        header={
          <>
            <h2 className="min-w-0 truncate font-semibold">
              {g.title}
              {g.at && (
                <span className="font-normal text-stone-500">
                  {" "}
                  · {formatEventDate(g.at)}
                </span>
              )}
            </h2>
            <span className="ml-auto shrink-0 text-xs text-stone-500">
              {g.tasks.length
                ? `${g.tasks.length} to do · ~${hoursMinutes(g.tasks.reduce((n, t) => n + t.estimateMinutes, 0))}`
                : "Nothing due yet"}
            </span>
            {g.key !== "other" && g.tasks.length > 0 && (
              <RemoveEventTasks eventId={g.key} count={g.tasks.length} />
            )}
          </>
        }
        below={
          g.key !== "other" &&
          (() => {
            // This event's progress: everything for it, whoever has it.
            const open = tasks.open.filter((t) => t.eventId === g.key).length;
            const done = tasks.done.filter((t) => t.eventId === g.key).length;
            const total = open + done;
            if (total === 0) return null;
            const COLOURS = [
              "#2fd9df",
              "#ffd90f",
              "#a78bfa",
              "#34d399",
              "#fb923c",
            ];
            return (
              <div className="-mt-1 mb-3 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-200">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(done / total) * 100}%`,
                      background: COLOURS[n % COLOURS.length],
                    }}
                  />
                </div>
                <span className="shrink-0 text-xs text-stone-500">
                  {done} of {total} done
                </span>
              </div>
            );
          })()
        }
      >
        <ul className="space-y-3">
          {g.tasks.map((t) => (
            <TaskCard key={t.id} task={t} {...common} hideEvent />
          ))}
        </ul>
        {upcomingFor(g.key).length > 0 && (
          <>
            <ComingUp items={upcomingFor(g.key)} whenLabel={whenLabel} />
          </>
        )}
      </EventGroup>
    </section>
  );

  return (
    <div className="space-y-8">
      <div data-tour="tasks-head">
        <h1 className="text-2xl font-semibold tracking-tight">Actions</h1>
        {hasRsl && (
          <div className="mt-2">
            <ShowToggle value={show} community={shortName} />
          </div>
        )}
        {showLocal ? (
          <p className="mt-1 text-sm text-stone-500">
            {groups.reduce((n, g) => n + g.tasks.length, 0) === 0
              ? "Nothing left for the organisers. New actions appear here after each event."
              : `${groups.reduce((n, g) => n + g.tasks.length, 0)} for the organisers · about ${hoursMinutes(minutes)} in total`}
          </p>
        ) : (
          <p className="mt-1 text-sm text-stone-500">
            {regionTasks.open.length + checkIns.length === 0
              ? "All your Regional Support Lead actions are done."
              : `${regionTasks.open.length + checkIns.length} Regional Support Lead action${regionTasks.open.length + checkIns.length === 1 ? "" : "s"} to do`}
          </p>
        )}
        {showLocal && weekTotal > 0 && (
          <div className="mt-4" data-tour="week-progress">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium text-navy">
                {weekLeft === 0
                  ? "🎉 All done for this week"
                  : `This week: ${weekDone} of ${weekTotal} done`}
              </span>
              <span className="text-xs text-stone-500">
                {Math.round((weekDone / weekTotal) * 100)}%
              </span>
            </div>
            <div
              className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-stone-200"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={weekTotal}
              aria-valuenow={weekDone}
              aria-label="Actions done this week"
            >
              <div
                className="h-full rounded-full bg-pink transition-all"
                style={{ width: `${(weekDone / weekTotal) * 100}%` }}
              />
            </div>
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {showRsl && !organiser.viewingAs && organiser.leadRegionIds[0] && (
            <>
              <AddRegionAction regionId={organiser.leadRegionIds[0]} />
              <RegionPlanner regionId={organiser.leadRegionIds[0]} />
              <OrganiserChatsLink waiting={chats?.waiting ?? 0} />
            </>
          )}
          {showLocal && (
            <ChooseTasks
              setup={setup}
              communityName={organiser.team.name.replace(
                /, (Australia|New Zealand)$/,
                "",
              )}
            />
          )}
        </div>
      </div>

      {showRsl && (
        <RegionActions
          tasks={regionTasks.open}
          tz={common.tz}
          now={now}
          title="For you as Regional Support Lead"
        />
      )}

      {showRsl && checkIns.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold">Your communities</h2>
          <GroupedCheckIns
            now={now}
            items={checkIns.map((t) => ({
              task: t,
              community: rslTeamById[t.teamId]?.name.replace(/, .*$/, "") ?? "",
              tz: rslTeamById[t.teamId]?.timezone ?? common.tz,
              ctx: allConnect[t.teamId] ?? null,
              chat: chats?.byTeam[t.teamId] ?? null,
            }))}
          />
        </section>
      )}

      {showLocal && groups.length > 0 && (
        <div className="space-y-3 border-t border-black/10 pt-6">
          <h2 className="text-lg font-semibold tracking-tight">Your actions</h2>
          <ActionSearch />
        </div>
      )}

      {showLocal && focus && (
        <p className="flex items-center justify-between gap-3 rounded-xl bg-cyan/15 px-3 py-2 text-sm text-navy">
          <span>
            Showing the actions for <b>{focus.title}</b>
          </span>
          <Link href="/tasks" className="font-semibold text-pink-ink">
            Show all actions
          </Link>
        </p>
      )}
      {showLocal && (
        <>
          {shownGroups.map((g, n) => renderGroup(g, n))}
          <ShowMoreEvents
            items={laterGroups.map((g, n) =>
              renderGroup(g, shownGroups.length + n),
            )}
          />

          {/* What the Core Team and helpers have on: kept apart from your own. */}
          <CoreTeamTasks crew={crew} now={now} tz={common.tz} />
        </>
      )}

      {laterShown.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
            Moved for later
          </h2>
          <ul className="divide-y divide-black/5 overflow-hidden rounded-2xl bg-white text-sm shadow-sm ring-1 ring-black/5">
            {laterShown.map((t) => (
              <LaterRow
                key={t.id}
                label={`${t.title}${t.eventTitle ? ` · ${t.eventTitle}` : ""}`}
                when={formatEventDate(t.showFrom!, common.tz)}
                card={<TaskCard task={t} {...common} />}
              />
            ))}
          </ul>
        </section>
      )}

      {doneShown.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
            Done recently
          </h2>
          <ul className="space-y-3">
            {doneShown.map((t) => (
              <TaskCard key={t.id} task={t} {...common} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
