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
    date: "2026-10-24",
    title: "Search your actions",
    changes: [
      {
        level: "organiser",
        text: "A search box on the Actions page: type an action or event name to find it, including actions for later events and ones still coming up.",
      },
      {
        level: "organiser",
        text: "Police approval: once your details are saved, it opens straight on Ready to send, so it's one tap. Late notices still come up, right up until the event.",
      },
    ],
  },
  {
    date: "2026-10-24",
    title: "Police approval, filled in and sent for you",
    changes: [
      {
        level: "organiser",
        text: "New action for outreach events: Police approval sent (shows 3 weeks before, due 8 days before). Fill in & send fills in the police form from the event and your saved details (name, address, signature: only you can see them), shows you a preview, and emails it as a PDF to the police with you CC'd. Send yourself a test first if you like.",
      },
      {
        level: "god",
        text: "approval_authorities per community (Sydney: sydcityevents@police.nsw.gov.au, NSW Form 1, 7 days), person_private, approval_submissions + approvals bucket, send-approval Edge Function (SMTP secrets). Forms live in src/lib/approval-forms.ts.",
      },
    ],
  },
  {
    date: "2026-10-24",
    title: "Tidier role actions",
    changes: [
      {
        level: "organiser",
        text: "Tech check and Volunteers briefed only come up for outreach events, not socials. New volunteers welcomed only comes up when someone new checks in. Checked in with everyone who came has gone.",
      },
      {
        level: "organiser",
        text: "Actions that are coming up now have a Remove button, for when one isn't needed for that event.",
      },
    ],
  },
  {
    date: "2026-10-24",
    title: "Personal invites before events",
    changes: [
      {
        level: "organiser",
        text: "New action: Personal invites sent (shows 5 days before, due 3 days before). “Open invite list” opens a window with who to message and why: first-timers, newcomers, people drifting off and occasionals first, then regulars, with WhatsApp and Messenger buttons. Tick people off as you go. It spaces messages out so nobody's pestered, and every few messages to a regular is an ask (help set up, bring a friend).",
      },
      {
        level: "organiser",
        text: "Profiles show when someone was last personally messaged, and a switch for people who'd rather not get messages.",
      },
    ],
  },
  {
    date: "2026-10-24",
    title: "Carousels",
    changes: [
      {
        level: "organiser",
        text: "Make graphics → Carousel: pick up to 20 of the event's photos, put them in order, and get them as 4:5 slides with the logo top-right and www.activism.wtf bottom-left. On your phone, Share sends them straight to Instagram or Facebook.",
      },
    ],
  },
  {
    date: "2026-10-24",
    title: "Our logo, everywhere",
    changes: [
      {
        level: "organiser",
        text: "The We The Free logo is now in the header, on the login and join pages, as the app icon on your phone, and on every graphic you make.",
      },
    ],
  },
  {
    date: "2026-10-24",
    title: "The full Core Team role lists",
    changes: [
      {
        level: "organiser",
        text: "22 new actions from the Events, Promo and Community Lead role lists (set-up team, weather check, briefing, pack-down, photo consent, monthly recap, thank-you messages, buddies, re-engaging quiet volunteers and more). They start switched off: turn on the ones you want, or a Core Team member can take them on. Anything switched on with no Core Team member looking after it comes to the organisers.",
      },
      {
        level: "organiser",
        text: "Each Core Team role now lists its as-needed duties too (like storing equipment or milestone posts), so people know what's theirs without getting reminders.",
      },
      {
        level: "god",
        text: "task_kinds.default_enabled (new kinds false) and a 'quarterly' schedule; Photos posted to WhatsApp moved to the Promo Lead.",
      },
    ],
  },
  {
    date: "2026-10-24",
    title: "Every action on the event page",
    changes: [
      {
        level: "organiser",
        text: "Each event page now lists all its actions — to do, done, and still to come, however far ahead. You can start any of them early or mark them done.",
      },
    ],
  },
  {
    date: "2026-10-24",
    title: "Event photos in your graphics",
    changes: [
      {
        level: "organiser",
        text: "Add photos to any event (event page, or “Upload photos” on the Event photos taken action, which ticks it off). Star favourites, or mark one “Not for promo”.",
      },
      {
        level: "organiser",
        text: "Graphics now use your community's photos: “Promote it” puts your best recent photo behind the event details, and “Thanks for coming” makes a photo collage after an event. Photo-posting actions get a Get graphic button too.",
      },
    ],
  },
  {
    date: "2026-10-24",
    title: "Event graphics, notes and quicker links",
    changes: [
      {
        level: "organiser",
        text: "“Make graphics” on each event page (and “Get graphic” on promo actions) makes a ready-to-post image for Instagram, stories or a Facebook event cover, from the event's details.",
      },
      {
        level: "organiser",
        text: "Each event has a Notes box, and a “3 actions →” link that shows just that event's actions.",
      },
      {
        level: "organiser",
        text: "New Core Team members get a short welcome tour that ends in picking their actions.",
      },
    ],
  },
  {
    date: "2026-10-24",
    title: "Statuses and engagement",
    changes: [
      {
        level: "organiser",
        text: "Everyone gets a status: First-timer, Newcomer (their first 3 months), Regular (5+ events in the last 3 months) or Occasional (been around a while, comes now and then), plus “Not seen in a while” when they're slower than their own usual rhythm.",
      },
      {
        level: "organiser",
        text: "A little engagement bar (0–10, red to green) shows how many of the community's recent events someone came to, with recent weeks counting most, and an arrow when it's going up or down.",
      },
      {
        level: "god",
        text: "src/lib/engagement.ts: engagementStatus (first match: first_timer, newcomer, regular, occasional; lapsed after 365 days), engagementScore (weights 3/2/1 by 30-day bands, community events since their first), trend vs 60 days ago. The supporter's congratulations fires when a newcomer reaches 5 events in 90 days.",
      },
    ],
  },
  {
    date: "2026-10-24",
    title: "Newcomers and first-timers",
    changes: [
      {
        level: "organiser",
        text: "People stay newcomers until their 5th event. The People list shows “First-timer” (first event) or “Newcomer”, with a × to clear it. Profiles show a First-timer banner, how far along a newcomer is, and a clear place to connect a regular volunteer to support them.",
      },
      {
        level: "organiser",
        text: "When a newcomer comes to their 5th event, the person supporting them gets a congratulations notification.",
      },
      {
        level: "god",
        text: "NEWCOMER_EVENTS = 5 in src/lib/newcomer.ts; trigger attendance_newcomer_graduated notifies the supporter (kind newcomer_graduated) and ends the pairing on the 5th check-in.",
      },
    ],
  },
  {
    date: "2026-10-24",
    title: "A guided tour of the app",
    changes: [
      {
        level: "organiser",
        text: "The welcome tour now walks new organisers through the real pages (Events, an event's check-in list, Insights, People and Actions), highlighting each part, using an example community with John, Paul, George and Ringo.",
      },
      {
        level: "god",
        text: "teams.is_example (Example Community) is readable by any staff during the tour, never writable; private.example_events re-dates its events (and their actions) hourly so the next event is always 4 days away. Organiser.exampleMode swaps team_id while showTour; homeTeamId keeps action choices on their real community.",
      },
    ],
  },
  {
    date: "2026-10-23",
    title: "Hundreds of Facebook groups added",
    changes: [
      {
        level: "organiser",
        text: "Your community's Facebook groups list now comes pre-filled with local vegan and animal rights groups from our worldwide list. Check it over and remove any that don't fit.",
      },
      {
        level: "organiser",
        text: "A group can be shared with nearby communities too (e.g. London groups show for Central and West London). Use “Also share with” when editing a group.",
      },
      {
        level: "god",
        text: "Imported 628 groups from the English-speaking groups sheet: 295 attached to 96 communities (by city, or nearby/region-wide), 333 with no community nearby kept God-only with the sheet section in notes. New facebook_groups.also_team_ids for shared groups; RLS covers them.",
      },
    ],
  },
  {
    date: "2026-10-23",
    title: "Local Facebook groups",
    changes: [
      {
        level: "organiser",
        text: "Keep a list of your local vegan and community Facebook groups (Actions → Facebook groups). The “Promoted in local Facebook groups” action for each event then has an “Open all” button that opens every group in its own tab. It appears a week before the event and is due the day before.",
      },
      {
        level: "god",
        text: "facebook_groups: organisers/RSLs manage their own communities' rows, Core Team can read them; groups with no community stay God-only.",
      },
    ],
  },
  {
    date: "2026-10-23",
    title: "No repeat nudges, and moving actions",
    changes: [
      {
        level: "organiser",
        text: "A blue Messenger button opens a Facebook chat with someone, once their Facebook profile link is added to their contact details.",
      },
      {
        level: "regional_lead",
        text: "When adding a person you can include their phone, email and Facebook link straight away, and edit anyone's contact details on their profile.",
      },
      {
        level: "regional_lead",
        text: "When you make someone an Organiser you can choose which community they'll run, and add their phone and email in the same pop-up (handy before they've connected).",
      },
      {
        level: "organiser",
        text: "“Move” on any action puts it out of the way until a better day (tomorrow, next week, the day before the event, or a day you pick). It shows up in Actions that morning.",
      },
      {
        level: "regional_lead",
        text: "Check-ins have a small “No reply yet” option. Use it and that community gets no more monthly check-ins until they reply; it sits in “Waiting to hear back”, where you can mark that they replied or try again when it feels right.",
      },
      {
        level: "god",
        text: "Actions with “All communities” in God Mode is now a compact overview by region: each region's Regional Support Lead, how many communities they've checked in with this month, who's waiting to hear back, and a one-line status per community.",
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
        text: "Core Team members choose the actions they'll look after under My actions. Those come to them every time, and anything nobody picks stays with you.",
      },
      {
        level: "organiser",
        text: "They can hand an action to a helper, or say they're away until a date (their actions come back to you until then).",
      },
      {
        level: "organiser",
        text: "Actions now has a “Core Team and helpers” overview, so you can see what everyone's looking after. The main list is just what's left for the organisers.",
      },
      {
        level: "organiser",
        text: "The People list shows lead roles, e.g. “Core Team · Promo Lead”.",
      },
      {
        level: "god",
        text: "person_core_roles, task_owners (owner + helper), task_kinds.core_role / schedule (event | weekly | monthly), people.away_until, private.task_assignee() priority: per-event-type delegate > helper > owner (not away) > organisers. Ending a role or action sets ended_at (no deletes). View as → New Core Team member previews the setup.",
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
        text: "Your Actions page now only shows your own actions: a monthly “Organisers checked in with” action for each community, with the organisers' WhatsApp and email, recent and upcoming events, and a heads-up when a community has gone quiet.",
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
        text: "task_kinds.audience ('community' | 'regional'), tasks.period with a unique (team, kind, period) index; private.create_monthly_tasks() on cron 'monthly-tasks' (hourly at :20), due the 15th. Actions policy hides regional actions from community organisers. community_organisers() RPC for contact details.",
      },
      {
        level: "god",
        text: "“All communities” uses the all_communities cookie; active_team keeps the last single community for pages that need one. Previewing as RSL limits the list to that region.",
      },
    ],
  },
  {
    date: "2026-10-21",
    title: "Facebook events, new actions and the Movement Hub",
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
        text: "New actions you can turn on: Facebook event created, Event photos taken, and Prizes purchased (Movie Challenges only).",
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
        text: "task_kinds.event_type_id limits an action to one event type; create_event_tasks respects it. New kinds start off for communities that already chose their actions.",
      },
    ],
  },
  {
    date: "2026-10-15",
    title: "Actions, calendar and insights",
    changes: [
      {
        level: "organiser",
        text: "Actions: before, during and after each event, with time estimates, red/orange/yellow lights, delegating (just this once or every time), and your own custom actions.",
      },
      {
        level: "organiser",
        text: "Choose which actions are made automatically based on how much time you have each week.",
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
        text: "Roles: God, Regional Support Lead, Organiser, Core Team (organisers.access), regions, team time zones, hidden test person per community, task_kinds / actions / team_task_kinds / task_delegates with private.create_event_tasks() hourly at :15.",
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
