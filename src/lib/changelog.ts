// What's new in the Movement Hub. Each change says who it's for:
//   organiser      – shown to Organisers and up (plain language)
//   regional_lead  – Regional Support Leads and God Mode
//   god            – God Mode only (the technical detail)
// Newest first. Add to this whenever something ships.

export type ChangeLevel = "organiser" | "regional_lead" | "god";
export type Change = { level: ChangeLevel; text: string };
export type Release = { date: string; title: string; changes: Change[] };

export const CHANGELOG: Release[] = [
  {
    date: "2026-10-23",
    title: "No repeat nudges, and moving tasks",
    changes: [
      {
        level: "organiser",
        text: "“Move” on any task puts it out of the way until a better day (tomorrow, next week, the day before the event, or a day you pick). It shows up in Tasks that morning.",
      },
      {
        level: "regional_lead",
        text: "Check-ins have a small “No reply yet” option. Use it and that community gets no more monthly check-ins until they reply; it sits in “Waiting to hear back”, where you can mark that they replied or try again when it feels right.",
      },
      {
        level: "god",
        text: "teams.connect_waiting_since, tasks.outcome ('replied' | 'no_reply'); complete_check_in and resolve_check_in_wait RPCs; create_monthly_tasks skips regional check-ins for waiting teams.",
      },
    ],
  },
  {
    date: "2026-10-22",
    title: "Core Team lead roles",
    changes: [
      {
        level: "regional_lead",
        text: "Insights with “All communities” compares every community: check-ins and the trend, first-timers, events with attendance taken, organisers, Core Team and accounts, and whether each has started using the Movement Hub.",
      },
      {
        level: "organiser",
        text: "Core Team members now take ownership of an area: Community Lead, Events Lead or Promo Lead (or more than one). Pick it when you give someone the Core Team role, or tap their role chip to change it.",
      },
      {
        level: "organiser",
        text: "Core Team members choose the tasks they'll look after under My tasks. Those come to them every time, and anything nobody picks stays with you.",
      },
      {
        level: "organiser",
        text: "They can hand a task to a helper, or say they're away until a date (their tasks come back to you until then).",
      },
      {
        level: "organiser",
        text: "Tasks now has a “Core Team and helpers” overview, so you can see what everyone's looking after. The main list is just what's left for the organisers.",
      },
      {
        level: "organiser",
        text: "The People list shows lead roles, e.g. “Core Team · Promo Lead”.",
      },
      {
        level: "god",
        text: "person_core_roles, task_owners (owner + helper), task_kinds.core_role / schedule (event | weekly | monthly), people.away_until, private.task_assignee() priority: per-event-type delegate > helper > owner (not away) > organisers. Ending a role or task sets ended_at (no deletes). View as → New Core Team member previews the setup.",
      },
    ],
  },
  {
    date: "2026-10-22",
    title: "Roles before people connect",
    changes: [
      {
        level: "organiser",
        text: "The Calendar is now part of Events: switch between List and Calendar at the top. It remembers which one you used last.",
      },
      {
        level: "organiser",
        text: "What's new: this page, with the latest changes to the Movement Hub.",
      },
      {
        level: "organiser",
        text: "You can give someone a role before they've connected their account. It shows as “pending” and starts as soon as they connect.",
      },
      {
        level: "organiser",
        text: "People with a role have a WhatsApp number on their profile that you can add or change.",
      },
      {
        level: "regional_lead",
        text: "Your Tasks page now only shows your own tasks: a monthly “Organisers checked in with” task for each community, with the organisers' WhatsApp and email, recent and upcoming events, and a heads-up when a community has gone quiet.",
      },
      {
        level: "regional_lead",
        text: "“All communities” in the Community menu shows every community's events, and your check-ins for all of them, in one place.",
      },
      {
        level: "god",
        text: "people.pending_role / pending_region_id; grant_role stores a pending role when there's no account; trigger people_apply_pending_role turns it into an organisers row on link (ensure_organiser_member skips via wtf.linking_user so no duplicate person). clear_pending_role RPC.",
      },
      {
        level: "god",
        text: "task_kinds.audience ('community' | 'regional'), tasks.period with a unique (team, kind, period) index; private.create_monthly_tasks() on cron 'monthly-tasks' (hourly at :20), due the 15th. Tasks policy hides regional tasks from community organisers. community_organisers() RPC for contact details.",
      },
      {
        level: "god",
        text: "“All communities” uses the all_communities cookie; active_team keeps the last single community for pages that need one. Previewing as RSL limits the list to that region.",
      },
    ],
  },
  {
    date: "2026-10-21",
    title: "Facebook events, new tasks and the Movement Hub",
    changes: [
      {
        level: "organiser",
        text: "The app is now called the Movement Hub.",
      },
      {
        level: "organiser",
        text: "“Make Facebook event” on upcoming events: copy the name, place and details, then open Facebook to paste them in.",
      },
      {
        level: "organiser",
        text: "New tasks you can turn on: Facebook event created, Event photos taken, and Prizes purchased (Movie Challenges only).",
      },
      {
        level: "organiser",
        text: "Photos posted to Facebook and Instagram can now wait up to a week after the event.",
      },
      {
        level: "organiser",
        text: "Tap the bell for a quick look at your latest notifications.",
      },
      {
        level: "organiser",
        text: "“Buddy” is now called New member support.",
      },
      {
        level: "god",
        text: "Facebook groups directory (FB groups tab, God only): facebook_groups table with RLS on private.is_god(). Names are guessed from the link because Facebook serves its login page to servers (checked with pg_net).",
      },
      {
        level: "god",
        text: "View as → Fergus signs in as the community's test account. Fixed “Couldn't sign in”: test users had NULL token columns in auth.users, which GoTrue can't read; now ''.",
      },
      {
        level: "god",
        text: "task_kinds.event_type_id limits a task to one event type; create_event_tasks respects it. New kinds start off for communities that already chose their tasks.",
      },
    ],
  },
  {
    date: "2026-10-15",
    title: "Tasks, calendar and insights",
    changes: [
      {
        level: "organiser",
        text: "Tasks: before, during and after each event, with time estimates, red/orange/yellow lights, delegating (just this once or every time), and your own custom tasks.",
      },
      {
        level: "organiser",
        text: "Choose which tasks are made automatically based on how much time you have each week.",
      },
      {
        level: "organiser",
        text: "Calendar, with a distance slider to see nearby communities' events.",
      },
      {
        level: "organiser",
        text: "Insights: tap a month for the detail; a colourful Everyone table.",
      },
      {
        level: "organiser",
        text: "Taking attendance: regulars show first, and Enter ticks or adds a name.",
      },
      {
        level: "organiser",
        text: "The Helper QR code opens whatever event is on that day.",
      },
      {
        level: "regional_lead",
        text: "Calendar shows every community in your region; tap a community to show just theirs.",
      },
      {
        level: "god",
        text: "Roles: God, Regional Support Lead, Organiser, Core Team (organisers.access), regions, team time zones, hidden test person per community, task_kinds / tasks / team_task_kinds / task_delegates with private.create_event_tasks() hourly at :15.",
      },
    ],
  },
];

export const LATEST_CHANGE = CHANGELOG[0]
  ? `${CHANGELOG[0].date}-${CHANGELOG.length}`
  : "";

const RANK: Record<ChangeLevel, number> = {
  organiser: 0,
  regional_lead: 1,
  god: 2,
};

// The releases (and changes in them) someone at this level should see.
export function changelogFor(level: ChangeLevel): Release[] {
  return CHANGELOG.map((r) => ({
    ...r,
    changes: r.changes.filter((c) => RANK[c.level] <= RANK[level]),
  })).filter((r) => r.changes.length > 0);
}
