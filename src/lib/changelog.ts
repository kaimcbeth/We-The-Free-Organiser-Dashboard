// What's new in the Movement Hub. Each change says who it's for:
//   organiser      – shown to Organisers and up (plain language)
//   regional_lead  – Regional Support Leads and God Mode
//   god            – God Mode only (the technical detail)
// Newest first. Add to this whenever something ships.

export type ChangeLevel = "organiser" | "regional_lead" | "god";
export type Change = { level: ChangeLevel; text: string };
export type Release = { date: string; title: string; changes: Change[] };

// What's being worked on next (shown at the top of What's new).
export const COMING_SOON: { title: string; text: string }[] = [
  {
    title: "Dealing with trolls and harassment at events",
    text: "A guide for handling hecklers, trolls and harassment at events: how to stay calm, keep volunteers and the public safe, when to step in or walk away, and when to call for help.",
  },
  {
    title: "Fuller volunteer feedback form",
    text: "More questions for volunteers (training, events, how supported they feel), with results you can compare over time.",
  },
  {
    title: "Better insights",
    text: "Clearer trends for your community: how newcomers become regulars, who's drifting, turnout over time and what's working.",
  },
  {
    title: "Fuller briefing and debrief guides",
    text: "Much more detailed guides for running the volunteer briefing before outreach and the debrief after.",
  },
  {
    title: "More in Resources & Training",
    text: "Our theory of change, a code of conduct, an incident report form and a fundraising guide.",
  },
  {
    title: "Nearby communities: shared volunteers",
    text: "Link communities that share volunteers (like Sydney and Parramatta) so the same person can be checked in at either, with one history across both and no duplicates.",
  },
  {
    title: "Outreach training framework",
    text: "A step-by-step training path for new outreach volunteers, in Resources & Training.",
  },
  {
    title: "3MMC equipment guide",
    text: "What gear you need, how to set it up and how to pack it away.",
  },
  {
    title: "Recommended Movie Challenge prizes",
    text: "A list of prizes that work well for the Movie Challenge, with rough costs and where to get them.",
  },
  {
    title: "Planning guides for community events",
    text: "Step-by-step guides for running socials, dinners, co-working and other community events.",
  },
  {
    title: "Volunteer accounts",
    text: "Volunteers log in to see their own events and history, say which events they're coming to, and choose how they hear from you.",
  },
  {
    title: "Text message reminders",
    text: "Day-before reminders by text message too (email, phone notifications and the in-app bell already work).",
  },
  {
    title: "Write post: social media copy",
    text: "Posts written in your community's voice for Instagram, Facebook groups, WhatsApp and stories. The button's there already; it switches on once the writing assistant is connected.",
  },
];

export const CHANGELOG: Release[] = [
  {
    date: "2026-10-29",
    title: "Monthly recap carousel",
    changes: [
      {
        level: "organiser",
        text: "What's new has moved from the tabs to the sparkle button next to the bell (with a pink dot when there's something new), making room for a Funding section.",
      },
      {
        level: "organiser",
        text: "The Outreach guide is now just the conversation questions, and anyone can open it without logging in. In Resources & Training, Show QR code for newcomers gives a code they scan to open it on their phone. If they don't have an account, a small prompt above the questions invites them to create one (it never blocks the questions). Members can show the QR from the bottom of the guide too.",
      },
      {
        level: "organiser",
        text: "Monthly recap posted now has Make carousel: it gathers the month's event photos in event order, with your starred favourites already picked. Tap others to add them, drag to adjust, then share or download.",
      },
    ],
  },
  {
    date: "2026-10-28",
    title: "Welcome to We The Free",
    changes: [
      {
        level: "organiser",
        text: "New members get a short welcome when they connect: our mission, why we do it, our values, how we show up, and what to expect at a first event. It's also in Resources & Training to share.",
      },
      {
        level: "organiser",
        text: "Fixed: the Outreach guide link in Resources & Training.",
      },
      {
        level: "organiser",
        text: "WhatsApp posts for upcoming outreach now ask people to lock in, and end with a numbered sign-up list: everyone who's said Going so far, then empty lines up to the number you need (20 to start with, change it in Write post).",
      },
      {
        level: "organiser",
        text: "Crop photos: tap a photo, then Crop. Drag the box or its corners, or pick a shape (Square, Portrait 4:5, Story 9:16, Wide 16:9). The original is kept, so Reset to original undoes it.",
      },
      {
        level: "organiser",
        text: "Photo tags: Outreach, Group photo, Volunteers and Watching. Tap any photo to tag it, pick tags for a batch when uploading Community photos, and filter by tag in Community photos and when choosing a photo for a graphic.",
      },
      {
        level: "organiser",
        text: "Gear: optional model, where it's from (a link or a shop) and condition. Tap Handed to… then Edit details to add them to gear you've already listed. Anything that needs repair or is broken shows in red.",
      },
      {
        level: "organiser",
        text: "Community photos in Resources & Training: upload good photos that aren't from an event in the app (like older ones) with a rough date, a year and month if you know them. They're used on your promo graphics too.",
      },
      {
        level: "organiser",
        text: "Movie Challenge graphics now say 3 Minute Movie Challenge above Vegan Outreach, instead of the calendar title.",
      },
      {
        level: "god",
        text: "write-copy v7: sign-up list built in the function from event_rsvps (going, by updated_at, first names plus last initial for repeats); the AI never sees names. Outreach events and WhatsApp only.",
      },
    ],
  },
  {
    date: "2026-10-25",
    title: "Volunteers: who's coming, reminders and impact",
    changes: [
      {
        level: "organiser",
        text: "Volunteers can say Going, Maybe or Can't for upcoming events on their own page. You see who's coming at the top of each event page.",
      },
      {
        level: "organiser",
        text: "Everyone who says Going gets a reminder the day before: in the app, plus email or a phone notification if they chose one.",
      },
      {
        level: "organiser",
        text: "Volunteers' pages now show their impact: events, outreach, hours at outreach, their next milestone, months in a row and when they started.",
      },
      {
        level: "organiser",
        text: "Outreach guide, for between street conversations: a 10-second reflection (how it went, where it got stuck), the bit of the IBC method that helps, one thing to focus on next, plus a cheat sheet and objections. Volunteers see it on their page on outreach days; it's also in Resources & Training.",
      },
    ],
  },
  {
    date: "2026-10-25",
    title: "Suggest a feature, and more events on Actions",
    changes: [
      {
        level: "organiser",
        text: "Suggest something: send ideas for the Hub from this page.",
      },
      {
        level: "organiser",
        text: "When someone started with We The Free, and how they found us (a person, outreach, Instagram…). Add it on their profile, or members add their own on their page.",
      },
      {
        level: "organiser",
        text: "Organisers can add or fix anyone's phone number, email or Facebook link, from their profile or straight from the message lists. Members can still add their own.",
      },
      {
        level: "organiser",
        text: "Get your community ready: a short checklist on the Events page for new communities (community chat link, events, actions, Core Team). It ticks itself off.",
      },
      {
        level: "organiser",
        text: "Same person? Merge: on a profile, fold a duplicate into one record. Check-ins, messages and roles all come across.",
      },
      {
        level: "organiser",
        text: "Thank everyone: on Thank-you messages sent, a list of everyone who came with message links, first-timers first.",
      },
      {
        level: "organiser",
        text: "Feedback reviewed: a week after you tick off Volunteer feedback collected, if anyone answered, with a button to read the responses.",
      },
      {
        level: "organiser",
        text: "Resources & Training has a search box, and a list of what's coming.",
      },
      {
        level: "organiser",
        text: "Gear: in Resources & Training, list your community's kit and tap Handed to… to keep track of who has each thing.",
      },
      {
        level: "god",
        text: 'View as New organiser: after the tour you carry on in a fresh, empty Practice Community and can set it up for real (checklist, events, actions, people). It\'s wiped every time View as changes. teams.is_practice; private.reset_practice_team(); cookie "practice".',
      },
      {
        level: "organiser",
        text: "New to activism: a tag for newcomers who've never done any activism before. Tick it when adding someone at check-in, or on their profile.",
      },
      {
        level: "organiser",
        text: "Actions lists all your upcoming events now, 3 more at a time with Show more.",
      },
      {
        level: "organiser",
        text: "Quiet volunteers re-engaged only comes up when someone has actually gone quiet. Regulars list checked and Community social planned are gone for now.",
      },
      {
        level: "organiser",
        text: "Volunteer feedback (every 3 months): Ask for feedback gives you a ready message with a link to a short form for volunteers, to send in WhatsApp. See responses shows what they said.",
      },
    ],
  },
  {
    date: "2026-10-25",
    title: "Add events to your calendar",
    changes: [
      {
        level: "organiser",
        text: "Add to your calendar on each event (Google Calendar, or Apple and Outlook). On the Events page, Add all to your calendar subscribes Google Calendar to all your community's events, and it keeps up as events change.",
      },
      {
        level: "organiser",
        text: "Actions: collapse an event's actions with the arrow by its name; every action still to come shows under coming up; Guides on equipment set-up, tech check and pack-down; Message them on Quiet volunteers re-engaged.",
      },
    ],
  },
  {
    date: "2026-10-25",
    title: "Newcomer-based actions",
    changes: [
      {
        level: "organiser",
        text: "New volunteers reminded only comes up when you have newcomers, and names them, with Message newcomers. Photo consent checked is now per newcomer. Volunteers debriefed and Pack-down and gear check are for outreach events only.",
      },
    ],
  },
  {
    date: "2026-10-25",
    title: "Facebook event links, Co-working, and pop-up lists",
    changes: [
      {
        level: "organiser",
        text: "Paste the Facebook event link once (on the Facebook event actions) and every Facebook action gets Open Facebook event and Copy link. It shows on the event page too.",
      },
      {
        level: "organiser",
        text: "Co-working is its own event type under Community events. Event types are now grouped: Outreach events, Community events, Training.",
      },
      {
        level: "organiser",
        text: "Each event on the Actions page has its own progress bar. Message regulars and Open invite list now open as pop-ups. Questions answered is due the day before the event.",
      },
    ],
  },
  {
    date: "2026-10-24",
    title: "Resources & Training, and smarter role actions",
    changes: [
      {
        level: "organiser",
        text: "New Resources tab (for the Core Team too). First up: the NSW Notice of legal protections to show police at outreach events.",
      },
      {
        level: "organiser",
        text: "Onboarding sent and Paired with a regular now come up for each newcomer when they first check in, with their name and profile; pairing ticks itself off once a supporter is connected. Monthly recap shows in the last 3 days of the month. Briefing and debrief actions have a script. Set-up team organised has Message regulars. Chat moderation has gone.",
      },
    ],
  },
  {
    date: "2026-10-24",
    title: "Write post: social media copy in your voice",
    changes: [
      {
        level: "organiser",
        text: "Write post, on each event and on promo and photo actions, writes 3 options each for Instagram, Facebook groups, WhatsApp or stories. Add an optional line (\u201cbest moment from the day?\u201d) and it builds around it. After an event it shares how it went and invites people to your next one. You pick, tweak and post it yourself: nothing is posted for you.",
      },
      {
        level: "organiser",
        text: "Optional: paste up to 10 of your community's past posts and it'll sound like you.",
      },
    ],
  },
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
