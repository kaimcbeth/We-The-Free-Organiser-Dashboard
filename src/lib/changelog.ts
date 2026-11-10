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
    title: "Fuller briefing and debrief guides",
    text: "Much more detailed guides for running the volunteer briefing before outreach and the debrief after.",
  },
  {
    title: "More in Resources & Training",
    text: "Our theory of change and a code of conduct.",
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
    title: "Equipment set-up and pack-down",
    text: "How to set up the Movie Challenge gear and pack it away (what to buy is in the Equipment guide now).",
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
    date: "2026-11-11",
    title: "Insights charts and tab introductions",
    changes: [
      {
        level: "organiser",
        text: "Insights now opens with charts: people at events each week or month (first-timers and people coming back), where everyone's at, how many newcomers come back, which kinds of events bring people in, and your biggest events. Who to reach out to sits below, and the per-person table is folded away at the bottom.",
      },
      {
        level: "organiser",
        text: "Every tab has a short introduction card at the top the first time you open it. Step through it or close it, and it's gone. The ? at the top brings it back.",
      },
      {
        level: "organiser",
        text: "The introduction for new organisers is much shorter: a quick look at each tab, then reminders and planning your actions.",
      },
      {
        level: "organiser",
        text: "Equipment guide: new upgrades: Sign carry bag (A2 and A1 sizes) a portable power station, and the media wall now has its details and price. Every upgrade also shows its price with the 2× local fundraising match, and headphone splitters are now an upgrade instead of base kit.",
      },
    ],
  },
  {
    date: "2026-11-05",
    title: "Birthdays",
    changes: [
      {
        level: "organiser",
        text: 'Member feedback: "Summarise" on the Responses tab groups the answers into what\'s working, what could be better and a few things to try.',
      },
      {
        level: "regional_lead",
        text: 'People with "All communities" now lists everyone across them, with each person\'s community, so you can search the lot.',
      },
      {
        level: "regional_lead",
        text: "Social media: three new RSL actions. \"What's on across the region\" every two weeks (Make the post has every community's events as an image and text), a monthly community spotlight (Pick a community suggests one and writes the caption), and regional milestones that pop up when something's worth celebrating.",
      },
      {
        level: "regional_lead",
        text: 'People: "Invite a new organiser" makes a one-use link. Whoever opens it makes an account, adds their name and becomes an organiser for that community.',
      },
      {
        level: "god",
        text: 'The header says "All communities" when that\'s picked, and leaving a region preview takes you back to your own community.',
      },
      {
        level: "regional_lead",
        text: "RSL Actions: a new Social media section for your regional Instagram and Facebook pages, with a new weekly action to repost the best post from the main We The Free page. The monthly regional recap and Meet the Organisers sit there too.",
      },
      {
        level: "regional_lead",
        text: "Plan RSL actions: the hours slider now goes from 2 hours up to the time every RSL action would take, like Plan actions for organisers.",
      },
      {
        level: "organiser",
        text: "Action cards fold up: tap the small arrow by the title (or double-click the title) to shrink a card to one line. The check-in cards fold their list of communities too. Your phone or computer remembers what you folded.",
      },
      {
        level: "god",
        text: "Previewing as a Regional Support Lead now has a Region menu instead of Community: pick Oceania + Japan, Asia, Europe, North America or the UK and see that RSL's whole view.",
      },
      {
        level: "regional_lead",
        text: "RSL Actions: check-ins and 1:1 calls are now one card each, with a row per community showing its last and next event. Tick a row off, or tap it for the details.",
      },
      {
        level: "regional_lead",
        text: 'New monthly RSL action: a recap for the regional socials. "Make the recap" shows last month\'s events, people and films across your communities, as text and a ready-to-post image.',
      },
      {
        level: "regional_lead",
        text: 'RSL Actions page: "+ Add an action" for a one-off with a due date, or one that repeats every week, month or 3 months, or for each community every month.',
      },
      {
        level: "regional_lead",
        text: "New RSL actions for the organiser group chat: share the incident report form, share the mental health resources and ask for feedback (each every 3 months), plus a monthly shout-out. Each has ready-made messages.",
      },
      {
        level: "regional_lead",
        text: "New monthly RSL action: a Meet the Organisers post. Send an organiser the questions, then make the carousel with the same maker as Meet the Members.",
      },
      {
        level: "regional_lead",
        text: "New monthly RSL action: read and reply to organiser feedback. Its time goes up with how much feedback came in (a 2-minute check when there's none), with a button straight to the feedback.",
      },
      {
        level: "regional_lead",
        text: "The weekly organiser group chat post has a Discussion questions button: pick one, tweak it and copy it.",
      },
      {
        level: "regional_lead",
        text: "New RSL action every 3 months: a 1:1 call with each community's organisers, with ideas for what to talk about.",
      },
      {
        level: "regional_lead",
        text: "New RSL action every week: a post in the organiser group chat, with ideas for what to share. Switch it off in Plan RSL actions if you don't want it.",
      },
      {
        level: "regional_lead",
        text: "Plan RSL actions: add your own actions, for each community every month, or once a week or once a month for your whole region. Remove them any time.",
      },
      {
        level: "regional_lead",
        text: "Your RSL actions now include a check-in with the organisers of every community you look after (Oceania now covers Japan too), named by community, soonest due first. One per community each month.",
      },
      {
        level: "regional_lead",
        text: "Plan RSL actions: a slider from 2 to 50 hours a week suggests which Regional Support Lead actions to take on, and you can switch each one on or off for your region.",
      },
      {
        level: "regional_lead",
        text: "If you're an RSL and also a community's organiser, Actions has a Both / RSL / organiser switch to show one side at a time. It's remembered on your device.",
      },
      {
        level: "organiser",
        text: "Graphic maker: style 6, a bold poster with the event name running up the side, rough diagonal stripes and your photo. Works with tall and wide photos, and has a new Black + white colour choice.",
      },
      {
        level: "organiser",
        text: 'Meet the Members: the first question slide now says "Answers in the caption" with an arrow pointing down.',
      },
      {
        level: "organiser",
        text: "Actions moved for later open when you double-click them (or tap the small arrow).",
      },
      {
        level: "organiser",
        text: "Make a post in the Social Media Hub now has Meet the Members, the monthly photo recap, the seasonal calendar and hosts wanted, as well as event posts.",
      },
      {
        level: "organiser",
        text: "Each ready-made post now ends with its own invitation to your events.",
      },
      {
        level: "organiser",
        text: '"Choose actions" is now called "Plan actions".',
      },
      {
        level: "organiser",
        text: "We say members now, not volunteers, everywhere in the Hub and in written posts.",
      },
      {
        level: "organiser",
        text: "Plan actions recommends 2 community events for every outreach event, and works out your weekly time with that mix.",
      },
      {
        level: "organiser",
        text: "The Rain backup plan is now a Weather backup plan: it also comes up when it'll be over 30°C during an outdoor event. The separate Weather checked action is gone.",
      },
      {
        level: "organiser",
        text: "Plan actions now counts your events in your weekly time (about 3 hours each) with a slider from 2 hours a week up to everything. Essential actions are always suggested. Actions you do during an event don't add extra time.",
      },
      {
        level: "god",
        text: "Action ranking is split into Essential, Good to do and Above and beyond. Drag or use the arrows to move actions between them.",
      },
      {
        level: "god",
        text: "Action ranking (God Mode bar): every action in order of importance, with a preview of what an organiser gets for 15 min, 30 min, 1 hour or 2+ hours a week. Choose actions now suggests from the top of this list.",
      },
      {
        level: "organiser",
        text: "New monthly action: Facebook invite list updated. It shows up on the 1st of each month so the list you invite to Facebook events stays current.",
      },
      {
        level: "organiser",
        text: "Rain backup plans now only come up when real rain is forecast (at least 1 mm while the event is on), not for light drizzle. The card shows how much rain, and the plan goes away if the forecast clears.",
      },
      {
        level: "organiser",
        text: "Tick boxes inside an action (like Instagram on Photos shared) have a small × to take that one off this action. Put it back from the Removed line underneath.",
      },
      {
        level: "organiser",
        text: "Co-working events no longer get a Rain backup plan action, since they're indoors.",
      },
      {
        level: "organiser",
        text: "Social Media Hub has a new Make a post tab: pick one of your events (or Something else) and make a graphic and write the words for it, then save them to the planner.",
      },
      {
        level: "organiser",
        text: 'Fewer actions: "Facebook event created" and "invites sent" are now one action, Facebook event set up. The three promo actions (WhatsApp, Facebook groups, Instagram) are now Event promoted, and the three photo ones are now Photos shared. Each has tick boxes inside for every place, and ticking them all finishes the action.',
      },
      {
        level: "god",
        text: "0191: task_kinds.checklist (jsonb [{key,label}]), tasks.checked text[], set_task_check(task, key, on) (all ticked = done, unticking undoes done). New kinds fb_event_setup / promote_event / photos_shared; the 8 old kinds archived, open ones dismissed and carried over (ticks kept), community on/off carried (on if any was on). TaskChecklist component on the card.",
      },
      {
        level: "organiser",
        text: '"Throwback photo posted" now comes every 2 weeks (on Thursdays) instead of every week. The next one shows up on 19 November.',
      },
      {
        level: "organiser",
        text: '"Event hosts asked for next season" now shows up on the 1st of the month before each season (1 November for summer), due about three weeks before the season starts.',
      },
      {
        level: "organiser",
        text: '"Event hosts asked for next season" has a Get graphic button: a "Host an event this summer" post or story with idea pills, every word editable.',
      },
      {
        level: "organiser",
        text: "Meet the Members posts can be saved to the planner too (slides and caption together).",
      },
      {
        level: "organiser",
        text: "Ready-made posts in the Social Media Hub have Save to planner too: all the slides (with your @username) and the caption go onto the day you pick.",
      },
      {
        level: "organiser",
        text: "Planner: drag an idea or post to another day to move it (on a computer), or use Move and Delete on it in the day's pop-up.",
      },
      {
        level: "organiser",
        text: "Social media planner: the Social Media Hub now opens on a calendar with your upcoming events and planned posts. Tap a day to jot a quick idea, then fill in the caption, platforms and images later. Write post and Get graphic in Actions have a new Save to planner button, and you can copy, share or mark each post as posted.",
      },
      {
        level: "organiser",
        text: "More suggested special events: 🌱 World Vegan Day Social (1 Nov), 🐁 World Day for Laboratory Animals (24 Apr), 🎂 your Community Anniversary (add your start date on its card), and for Australian communities 🐎 Melbourne Cup and 🍩 the 12/12 Krispy Kreme Movie Challenge.",
      },
      {
        level: "organiser",
        text: "New suggested special event: 💐 Mother's Day (2nd Sunday in May), outreach for every mother, with a focus on dairy cows and their calves. It shows up on your Events page about two months before.",
      },
      {
        level: "regional_lead",
        text: "Special events can now fall on the same weekday every year (like the 2nd Sunday of May), as well as a fixed date or moving with Easter.",
      },
      {
        level: "god",
        text: "0186: special_events.week_of_month (5 = last) + weekday (0 = Sun), private.nth_weekday; special_event_date handles it. Seeded Mother's Day (May, 2nd Sunday, lead 61).",
      },
      {
        level: "god",
        text: "0187: teams.founded_on + set_team_founded_on; special_events.anniversary + countries (matched to the country in the team name); private.team_special_date used by suggested_events, guess_special_event, plan_special_event_later; more generic words never auto-tag (world, vegan, animals, community, outreach, melbourne…).",
      },
      {
        level: "god",
        text: "0188: social_plan (team, day, note, caption, platforms, image_paths, event, posted_at; Core Team+ RLS) + private bucket social-plan (<team>/<uuid>.png). SocialPlanner (social-planner.tsx), SocialHubTabs (#planner / #posts), SaveToPlanner on CopyMaker options and GraphicMaker (planDay = the action's due date).",
      },
      {
        level: "organiser",
        text: "Write post now uses a few more emoji, placed naturally (beside the food, a wave, a heart), never one on every line.",
      },
      {
        level: "organiser",
        text: 'Write post sounds more like a person now: no more date, time and address listed on separate lines. It mentions when and where in a normal sentence ("this Sunday from 3 at Camperdown park") and leaves the rest to the event link.',
      },
      {
        level: "organiser",
        text: "Fixed: selecting text in a pop-up and letting go outside it no longer closes the pop-up.",
      },
      {
        level: "organiser",
        text: 'Make graphic: every word on the graphic can now be changed (empty a box to leave that line off; "Put the original words back" undoes it), in every style. Styles 3, 4 and 5 have more colours: Warm, Pink + yellow, Pink, Cyan, Yellow and Pink background.',
      },
      {
        level: "organiser",
        text: "Three new styles in Make graphic (styles are now numbered 1 to 5): 3 is a big save-the-date teaser, 4 puts your photo full page with a huge heading, 5 has the photo on top with the place and time below. Your community's @username goes on 4 and 5.",
      },
      {
        level: "organiser",
        text: 'New in the Social Media Hub: "We belong here, not here" (calves and their mothers in the dairy industry), "If the \'why\' is powerful, the \'how\' becomes easy" the Benjamin Hoff quote "Lots of people talk to animals" and "The first and probably the last time I feel the sunshine", each with your @username on it. The Hub is now a grid of covers: tap one to open it.',
      },
      {
        level: "organiser",
        text: "📲 Social Media Hub in Resources: posts from the We The Free main page with ready captions, to post on your own Instagram. Your community's @username goes on every slide automatically (add it once on the Hub page). Share to Instagram, Copy caption or Download all. First up: 5 animals you didn't know were exploited.",
      },
      {
        level: "organiser",
        text: '🗓️ Two new seasonal actions. "Event hosts asked for next season" (4 weeks before a season starts) has ready-made messages asking who\'d like to host an event. "Seasonal calendar posted" (a week before) has Make the calendar: one graphic with up to 8 of the season\'s events, special events first, then trainings, collabs and new events, with weekly regulars as one "Every Wednesday" line. Tick to swap events, then share or copy as text.',
      },
      {
        level: "organiser",
        text: "🐣 New suggested special event: Easter Movie Challenge, on Easter Saturday (27 March 2027), suggested 2 months before. Special events can now move with Easter, so it lands on the right weekend every year.",
      },
      {
        level: "organiser",
        text: "🌭 Sizzle for Change on Recommended prizes: Vegan Australia pays for the vegan sausages at a sausage sizzle (up to A$500 an event, once a year), with the steps and the application form.",
      },
      {
        level: "organiser",
        text: "Prize upgrades bar on Recommended prizes and Funding: your community's funding fills the bar, and each premium Movie Challenge treat unlocks once it covers the extra for the crowd you expect. Shows what's unlocked and how much more unlocks the next one.",
      },
      {
        level: "organiser",
        text: 'Special events: a new "After-party host asked for" action about 7 weeks before, due 5 weeks before, asking if someone can offer their place for an after party. It has Write post (WhatsApp and a story, written for you), Get graphic and three ready-made messages.',
      },
      {
        level: "organiser",
        text: '🙌 Engagement pod: members who join (a switch in Reminders, or "Engage with our posts" in How you can help) get an action to like and comment whenever you share a community member\'s Facebook post, like a newcomer\'s first post in a vegan group. Share posts from the weekly "Posts shared in the engagement pod" action or the Engagement pod card in Resources, see how many have done it, and add your pod\'s WhatsApp chat link.',
      },
      {
        level: "organiser",
        text: "💰 Team fundraising guide in Resources: WTF equipment grants, funding platforms, grant applications and crowdfunding tips.",
      },
      {
        level: "organiser",
        text: "Birthdays: members can add theirs (day and month) on their profile, and you can add anyone's on their People profile. On the day, your community gets a \"Birthday wished in the WhatsApp chat\" action. Switch it off in Choose actions if you'd rather not.",
      },
      {
        level: "organiser",
        text: "Special events now get an 8-week promo cycle instead of the same weekly reminder: save the date, big announcement, throwback, helpers wanted, spread the word, what to expect, who's coming, countdown, final details, live stories, then a thank-you recap. Each one's Write post already knows what that post is for.",
      },
      {
        level: "organiser",
        text: "New suggested special event: New Year's Eve.",
      },
      {
        level: "organiser",
        text: "New action every 3 months: share We The Free's mental health resources (activism.wtf/mental-health) in the WhatsApp chat, with ready-made caring messages to copy.",
      },
      {
        level: "organiser",
        text: "QR code for uploads: in the Photo Hub (or on an event page), make a QR code that lets anyone add their photos without logging in, for 2 hours up to a week. Stop it any time.",
      },
      {
        level: "organiser",
        text: "After uploading to the Photo Hub, a prompt offers to add details to just the new photos: event, date, type, tags and favourites, all at once. The select bar can now set a year and month too.",
      },
      {
        level: "organiser",
        text: "Drag and drop: drop photos anywhere on the Photo Hub (or an event page) to upload them. On the Photo Hub they get the event, date, type and tags picked in Add photos.",
      },
      {
        level: "organiser",
        text: "Photo Hub: tap a month's heading to fold it away (and again to open it), or Fold all. Your phone or computer remembers which months you folded.",
      },
      {
        level: "organiser",
        text: "Meet the Members: each question's emoji sits beside it on the slide, and a No logo button for photos that already have the WTF logo.",
      },
    ],
  },
  {
    date: "2026-11-04",
    title: "Sydney's history, back to January 2023",
    changes: [
      {
        level: "organiser",
        text: 'Meet the Members maker: on the "Meet the Members posted" action, tap Make the post. Add their name and 11 photos, paste their reply, and you get an Instagram carousel (a cover, then one question per photo) with each answer ready to copy as that slide\'s caption.',
      },
      {
        level: "organiser",
        text: "The WhatsApp join page is now two panels you click through: a welcome showing the smaller chats inside the community (join whichever you like), then the community guidelines.",
      },
      {
        level: "organiser",
        text: "Email reminders: tap Reminders at the top of the Events page and switch them on (everything) or off. Pick events you're going to and/or all upcoming events, and which kinds: Movie Challenges, other outreach, demos, socials, potlucks and dinners, co-working, workshops, sanctuary days, hikes and everything else. Potlucks and the rest are spotted from the event title.",
      },
      {
        level: "organiser",
        text: "Members who haven't joined the WhatsApp community see a green Join WhatsApp button in their top bar. It opens a page with the group's guidelines (based on the WTF Code of Conduct) with a tick box to agree before the Join the group button works.",
      },
      {
        level: "organiser",
        text: "Reminders can now come by text message. In Reminders, switch them on and choose Email or Text message under Send by. Texts go to the mobile on your profile.",
      },
      {
        level: "organiser",
        text: "The welcome tour is now the Introduction, for every role, and it includes setting up your email reminders as you go.",
      },
      {
        level: "organiser",
        text: "No more Maybe: people answer Going or Can't. The one Maybe answer so far was cleared, so that person will be asked again.",
      },
      {
        level: "organiser",
        text: 'Members\' Events page no longer has "Replay welcome tour" at the bottom.',
      },
      {
        level: "organiser",
        text: "Photo Hub: Shift-click two photos to select them and every photo in between. Shift-click a ticked photo to untick the run.",
      },
      {
        level: "organiser",
        text: "Everything from Kai's Facebook events list is in the Hub (349 events, back to January 2022), so old photos can go on the right event. They have a date but no time; the ones by other groups say who hosted them in the notes. Delete any you don't want.",
      },
      {
        level: "organiser",
        text: 'Events: "Show all past events" under the Past list, with the year on older ones. Events added by hand have a "Delete this event" link at the bottom of their page (their photos stay in the Photo Hub).',
      },
      {
        level: "organiser",
        text: "Show all past events → Select: tick as many events as you like and delete them in one go. Each row says who hosted it, for the ones from Facebook.",
      },
      {
        level: "organiser",
        text: "Event recap: after an event ends, a card at the top of Events shows how many came, the first-timers and (for outreach) how many watched the film, the average impact and tapouts. Close it with ×; it's also on the event's page.",
      },
      {
        level: "organiser",
        text: 'Newcomers: every Monday a card on Events lists last week\'s newcomers (Monday to Sunday) by event. "Make the image" gives a NEWCOMERS image with the week number, the dates (with the year) and their first names, to share with your regulars. Tap × on a name to leave them off; tap it under "Left off" to put them back.',
      },
      {
        level: "organiser",
        text: 'Check-in: "Add someone new" now also asks (all optional) how they found We The Free and the best way to reach them, with their number, email or handle. Profiles show and change the best contact too.',
      },
      {
        level: "organiser",
        text: "Recommended prizes: each prize has a photo square (Regional Support Leads add photos, like the equipment guide), pack sizes of the same product share one card (Oreo Mini), the green vegan labels are gone, and each list folds up from its heading.",
      },
    ],
  },
  {
    date: "2026-11-02",
    title: "Movie player understands the language files",
    changes: [
      {
        level: "organiser",
        text: "Photo Hub: Find duplicates (by Select) spots photos that were uploaded more than once, even at a different size, and ticks the extra copies so you can remove them in one go (they can be restored). Uploading a photo that's already there now tells you.",
      },
      {
        level: "god",
        text: "event_photos.phash (0163): 64-bit difference hash made in the browser (src/lib/photo-hash.ts), saved on upload and worked out for older photos the first time Find duplicates runs; cleared on crop. Look-alikes = 6 bits or fewer apart.",
      },
      {
        level: "organiser",
        text: "Sydney's past events from activism.wtf (back to May 2025) are now in the Hub, so you can attach old photos to them in the Photo Hub. The photo's event list now goes all the way back, with the year on older events.",
      },
      {
        level: "organiser",
        text: "Photo Hub: pick an event when you upload, and the photos go straight onto it (dated and typed by the event). Leave it blank for older photos, with a rough year and month as before.",
      },
      {
        level: "god",
        text: "import-events takes { teamId, backfill: true } to import a community's whole activism.wtf feed. Past events get no actions (create_event_tasks only looks 8 days back).",
      },
      {
        level: "organiser",
        text: 'Photo Hub: tap a photo to change which event it\'s from (or choose "Not attached to an event") and the month and year it was taken. Selecting photos and choosing "Attach to event…" now also has "Not attached to an event".',
      },
      {
        level: "organiser",
        text: "Monthly photo recap carousel: a big \"OCTOBER RECAP\" cover on your best photo, then one photo per slide with the event's name, date, place and type, and a last slide with next month's events. Pick the photos from the Photo Hub (select some, then Make a recap) or from the monthly recap action, which now shows up for every community 5 days before the month ends. Write caption is there too.",
      },
      {
        level: "organiser",
        text: '"Which laptop is this?" now has "Another name" under A–D, for a fifth laptop or a name of your own.',
      },
      {
        level: "organiser",
        text: 'Movie player: if someone taps a film and walks off at "How many people are watching?" or "Before you start", the laptop goes back to the start after a minute, ready for the next person.',
      },
      {
        level: "organiser",
        text: 'Movie player: films watched in setup mode are test plays and don\'t count in your results (the question says so). Press "Start the event" before viewers arrive. Event mode now survives a page reload.',
      },
      {
        level: "organiser",
        text: 'Movie player evens out the volume: louder films are turned down to match the quieter ones, so the slider sets one level for everything. It measures each film when you add it; laptops set up before today show an "Even out volume" link to measure them.',
      },
      {
        level: "organiser",
        text: "Movie player results show how many people skipped the question, per film and for each of your last few days, so you can see if fewer people are skipping.",
      },
      {
        level: "organiser",
        text: "Movie player: viewers can answer the question with the number keys (press 1 then 0 for 10).",
      },
      {
        level: "organiser",
        text: 'Movie player: every number on the question now has a label underneath (from "No impact" to "Most possible"), and the full wording, like "It made a strong impact", shows when someone points at a number. Translated for every language the player has screens for.',
      },
      {
        level: "organiser",
        text: 'Movie player: the "Before you start" screen now tells viewers they\'ll be asked one quick question after the film, the survey fades in over 3 seconds (was 5), and the Start here question sits on its own line.',
      },
      {
        level: "organiser",
        text: 'Movie player opens in setup mode (test, check films, answers waiting to send, laptop name, all the links). "Start the event" goes full screen and hides all of that, so viewers only see the films. Press and hold the heading for 2 seconds to get back to setup.',
      },
      {
        level: "organiser",
        text: "Live laptops: \"I've got it\" on laptops that need someone (finishing, answering, tapout, video not working). Everyone else sees who's on it, and the finished chime stays quiet for them.",
      },
      {
        level: "organiser",
        text: "Movie Challenge day summary on the Movie player page and on each Movie Challenge event: how many watched, average impact, languages, films and tapouts. Copy it as text, or make a We The Free post to share (tapouts aren't on the image).",
      },
      {
        level: "organiser",
        text: "Movie player updates itself less painfully: when a laptop is online, the player checks the Hub and says when a newer version is ready to download.",
      },
      {
        level: "organiser",
        text: 'Movie player: "Check films" at the bottom of the menu opens every film on the laptop and lists any that won\'t, so missing files show up at setup.',
      },
      {
        level: "organiser",
        text: 'Live laptops show each laptop\'s battery, with a red "Battery low" at 20% or less (Chrome and Edge share it; re-download the player first).',
      },
      {
        level: "organiser",
        text: "Movie player screens are now translated into Afrikaans, Arabic, Finnish, French, Hebrew, Hindi, Indonesian, Japanese, Lithuanian, Portuguese and Swedish (as well as Mandarin).",
      },
      {
        level: "organiser",
        text: 'Movie player: "Test video and sound" at the bottom of the menu plays 5 seconds of a film with sound, then asks whether you saw and heard it (with what to check if not). Nothing is recorded and the live screen isn\'t told.',
      },
      {
        level: "organiser",
        text: 'Movie player "Start here" screen: instead of picking a film, viewers read "The video you\'re about to watch explores the impact of food systems. Which of the following apply to you?" and tap I\'m under 15, I only eat halal, I\'m vegetarian or None of these; the matching film starts. "All films" at the bottom shows the usual tiles. Only answers whose film is on the laptop (in the chosen language) appear.',
      },
      {
        level: "organiser",
        text: 'The movie player now understands film names that start with the language, like "Afrikaans - WTF 3 min cut (with warning).mp4": each one goes into the Standard film under its own language button, instead of showing up as an odd extra film. Re-download the player on each laptop; films you\'ve already added are sorted out the next time it opens.',
      },
      {
        level: "god",
        text: 'movie-player.html: splitName reads a language before " - " too; canonLang ignores (brackets); tileFor (Standard / 3 min cut / A/B); one-off migration moves versions from the old odd tiles (oldTileFor) unless renamed by hand.',
      },
    ],
  },
  {
    date: "2026-11-01",
    title: "A new Poster style for event graphics, and rain backup plans",
    changes: [
      {
        level: "organiser",
        text: "Photos attached to an event now stay in the Photo Hub too (they used to disappear from it). They're dated by their event.",
      },
      {
        level: "organiser",
        text: "Make graphic from any photo: tap a photo in the Photo Hub, choose Make graphic, pick the event, and the graphic maker opens with that photo.",
      },
      {
        level: "organiser",
        text: "Poster graphics: change the bottom line to your own words, or remove it.",
      },
      {
        level: "organiser",
        text: 'Carousels: tick "No WTF logo" to leave the logo and website off the slides.',
      },
      {
        level: "organiser",
        text: 'Co-working events are now recognised from activism.wtf even when they\'re listed as just "Social": they\'re marked as Co-working and called "Vegan Co-Working Hang".',
      },
      {
        level: "organiser",
        text: "Rain on the way? When the forecast for an upcoming event (in the next week) is more than 30% chance of rain, you'll get an action to make a backup plan. The forecast is checked every 3 hours and shown on the action. You can switch it off in Choose actions.",
      },
      {
        level: "god",
        text: "rain-check Edge Function (cron :52 every 3 h) reads Open-Meteo hourly precipitation_probability at the team's lat/lng, max over the event's hours, → record_rain_forecast (events.rain_chance, rain_backup task, notifications). Migration 0158; task_kinds schedule 'weather'.",
      },
      {
        level: "organiser",
        text: "Make graphic now has a Poster style: a big bold heading, the day circled in pink, your photo, a tagline and the time and place. You can change the heading and tagline, and it works for posts, stories and Facebook covers.",
      },
      {
        level: "god",
        text: "graphic-poster.ts draws it (Archivo Black + Yellowtail in /public/fonts, loaded with FontFace); woff2 added to the proxy matcher's exclusions.",
      },
    ],
  },
  {
    date: "2026-10-31",
    title: "A simpler Events page for members",
    changes: [
      {
        level: "organiser",
        text: "Members' Events page is now just the essentials: live laptops (at Movie Challenges), the WhatsApp invite, what's coming up and their actions. The outreach card, welcome links, reminders and \"You're supporting a new member\" card are gone from it (the Outreach guide, Welcome and How you can help are still in their own tabs and Resources).",
      },
      {
        level: "organiser",
        text: "Members now choose how they get event reminders during their welcome tour, and can change it later in their profile.",
      },
      {
        level: "organiser",
        text: "Micro roles in members' How you can help: engage with our posts, take photos, do attendance, post event photos on socials, create Facebook events and plan community events. They open up one by one as members come to more events (0, 1, 3, 5, 8 and 12), so nobody sees them all at once. You get a notification when someone signs up.",
      },
      {
        level: "organiser",
        text: "Attendance, posting photos and Facebook events need your OK (they need access set up). Say Yes or Not right now at the top of People, where everyone helping out is also listed.",
      },
      {
        level: "organiser",
        text: "New in Resources for everyone (organisers, Core Team and members): the IBC Masterclass, the full Inspiring Behaviour Change training handout.",
      },
      {
        level: "organiser",
        text: 'Training for members: How you can help now suggests one training at a time (starting with the IBC Masterclass after 3 events). Members tap "I\'ve done this" to move on, and their Events page shows a one-line nudge that "Not now" hides for a month. See who\'s done what under Training done at the top of People.',
      },
      {
        level: "organiser",
        text: 'Movie player: if it\'s open twice on the same laptop, only the copy showing a film updates the live screen, so it no longer flicks to "Free". Download the player again to get this.',
      },
      {
        level: "organiser",
        text: "Movie player: if a video file stalls or pauses by itself in its last 10 seconds (some files claim to be a little longer than they are), the player now treats it as finished and goes to the question. Download the player again to get this.",
      },
      {
        level: "organiser",
        text: 'Live at the event: "Finished · ready to chat" is now pink too, so a laptop stays pink from the 10-second warning until someone goes over.',
      },
      {
        level: "organiser",
        text: 'Movie player: a small "Video not working?" link in the bottom-left corner (quieter than the tapout button), mentioned on the Before you start screen. Tapping it pauses the film, tells them someone\'s coming, and alerts your phone straight away (yellow card on the live screen). They can keep watching or start again. Download the player again to get it.',
      },
      {
        level: "organiser",
        text: 'Movie player: once the play controls fade away, the tapout and "Video not working?" buttons slide down to the very bottom of the screen, out of the way of subtitles. Download the player again to get this.',
      },
      {
        level: "organiser",
        text: "Movie player: after a film, the impact question fades in slowly over 5 seconds instead of appearing straight away. Download the player again to get this.",
      },
      {
        level: "organiser",
        text: 'Movie player: after the last person answers, "Thank you! Someone will be with you in a few seconds." now stays up for 10 seconds (was about 2) before going back to the films.',
      },
      {
        level: "organiser",
        text: "Movie player: the tapout button is now just a small red stop square in an outlined circle (no text), and the Before you start screen shows it the same way. There's also a volume control (slider and mute) on the play bar; up and down arrow keys work too, and each laptop remembers its volume. Download the player again to get these.",
      },
      {
        level: "organiser",
        text: 'Movie player: the impact question now fades in over 5 seconds, over the film\'s last frame (not the film menu). The thank-you screen reads "Thank you." (no exclamation mark). Download the player again to get these.',
      },
      {
        level: "organiser",
        text: "While Movie Challenge laptops are running, the full results (live watched today, and which film has the most impact, by language and A/B test) now show under the live laptops at the top of members' Events page, your Events tab, Core Team's Attendance page, and Movie Challenge event pages. They're also still in Resources → Movie player.",
      },
      {
        level: "organiser",
        text: "Notifications about an action now have a tick box, in the bell and on See all: tick it to mark the action done without opening it (tick again to undo). Done ones fade and get crossed out.",
      },
      {
        level: "organiser",
        text: "Movie player: if a film has more than one copy and one of them can't be found on the laptop, it now quietly plays a copy that works instead of showing \"Can't find\". Download the player again to get this.",
      },
      {
        level: "organiser",
        text: 'Movie player: ignores the hidden "._" files a Mac leaves on USB sticks (they were being added as broken copies of films), and removes any already in the menu. Download the player again to get this.',
      },
      {
        level: "organiser",
        text: 'On the day of an event, its card shows a live countdown: "Starts in 2h 15m", minutes and seconds in the last hour, then a pink "On now · 45m left". On your Today cards, Core Team\'s, and members\' Coming up.',
      },
      {
        level: "organiser",
        text: 'Movie player: "Choose a folder" (and "Add a folder") picks a whole folder of language folders at once, and each film gets its language from its folder. Now knows Afrikaans, Brazilian Portuguese, Croatian, Finnish, Hebrew, Lithuanian, Romanian, Swedish and Telugu too, and "Bahasa Indonesia" as Indonesian. Subtitle files are skipped. Download the player again to get this.',
      },
      {
        level: "organiser",
        text: 'Share our events: a public page listing your community\'s upcoming events that anyone can open, no account needed (with Details and RSVP links, Add to your calendar, and a nudge to create an account). Share it with "Share" next to Calendar on your Events tab; members have "Share our events" next to Coming up. It shows a link to copy, your phone\'s share sheet, and a QR code.',
      },
      {
        level: "organiser",
        text: 'Movie Challenge results: the section is now called "Average Impact Survey Responses", and tapouts show just how many (no average time).',
      },
      {
        level: "organiser",
        text: "Members' Photo Hub: a Share button on the big view of a photo, which sends the photo itself through the phone's share sheet (or downloads it on a computer). Photos marked not for promo can't be shared, only downloaded.",
      },
      {
        level: "organiser",
        text: "Members' Outreach tab: a link to the IBC Masterclass at the bottom of the questions.",
      },
      {
        level: "organiser",
        text: 'The Outreach guide\'s "Create your account" prompt now says what newcomers get: events and reminders, the Photo Hub, their impact, and a way to send feedback and ideas.',
      },
    ],
  },
  {
    date: "2026-10-30",
    title: "Movie player",
    changes: [
      {
        level: "organiser",
        text: "New in Resources: a movie player for Movie Challenge laptops. It works with no internet, shows a clean menu of your films, and asks viewers after each one how much it impacted them (0 to 10).",
      },
      {
        level: "organiser",
        text: "With the laptops online (a phone hotspot is fine), watch a live count of who's watched today. See which film has the most impact, and A/B test two versions of a film.",
      },
      {
        level: "organiser",
        text: "See every answer on the Movie player page, and delete any you made while testing.",
      },
      {
        level: "organiser",
        text: "Live at the event: see how far along each laptop's film is on your phone, with an alert 10 seconds before it ends so a volunteer can be there.",
      },
      {
        level: "organiser",
        text: 'A Stop button on the player ("I\'m not comfortable watching this anymore"): the film pauses, the live screen turns red with an alert so someone can go over, and each tapout is recorded with how far in. Before each film, viewers are encouraged to see it through and shown the button.',
      },
      {
        level: "organiser",
        text: "Members' Events page stops showing \"Welcome to We The Free\" once they've been through it (it's in their Resources to read again).",
      },
      {
        level: "organiser",
        text: "Photo Hub on phones: long-press a photo to start selecting, then tap more to add them. What to get next shows the dollar amounts in bold.",
      },
      {
        level: "organiser",
        text: "People on phones: names get their own line, with tags underneath. Set roles from each person's page.",
      },
      {
        level: "organiser",
        text: "Facebook groups moved from Actions to its own card in Resources, for all organisers.",
      },
      {
        level: "organiser",
        text: "Members' Events page is about events now: their photo, details and event history are on their profile (tap your photo in the top corner). The WhatsApp community card disappears once they've tapped it to join, or tapped \"Already joined? Hide this\".",
      },
      {
        level: "organiser",
        text: "Tidier on phones: event names get most of the row (two lines if needed), with a smaller date, just the number of actions, and a small ↗ for activism.wtf. The header keeps Movement Hub on one line with a smaller Alpha tag, and shows just your photo.",
      },
      {
        level: "organiser",
        text: "Event pages get you to check-in faster: actions fold into one line (tap to open), notes stay short, and event photos sit below the check-in list.",
      },
      {
        level: "organiser",
        text: "🍪 Recommended prizes in Resources: vegan Movie Challenge treats with the cost per prize against the US$0.50 reimbursement, where to buy, allergens, and how many packs for the crowd you expect. Premium prizes over the reimbursement are recommended when your community has funding banked.",
      },
      {
        level: "organiser",
        text: "Media wall added to the upgrades in the Equipment guide (details coming soon).",
      },
      {
        level: "organiser",
        text: "The bell is gone from the Equipment guide: the movie player's live screen tells you when someone's finishing.",
      },
      {
        level: "organiser",
        text: "The live screen also lets you know when a laptop's viewers have finished the question, with a chime and a light-blue card: ready for a chat.",
      },
      {
        level: "organiser",
        text: "Movie Challenge event pages show the live laptops too, from an hour before the event until an hour after.",
      },
      {
        level: "organiser",
        text: "Everyone in your community (Core Team and members too) sees the live laptops on their Events page while the player is running at an event.",
      },
      {
        level: "organiser",
        text: "The player asks which laptop it is (A, B, C or D) when you open it at each event, so you know which one to walk to. Change it any time from the corner of the menu.",
      },
      {
        level: "organiser",
        text: "The player asks how many people are watching, then asks each person the impact question. Language versions (like Mandarin) can be chosen on the menu, with the question in that language too.",
      },
      {
        level: "god",
        text: "Offline HTML player in public/resources/movie-player.html; /resources/movie-player/download injects the team's player_token. Answers go to film_survey_responses via submit_film_surveys (anon, token; client_id dedupes). Migration 0144.",
      },
    ],
  },
  {
    date: "2026-10-30",
    title: "Organiser hangouts",
    changes: [
      {
        level: "organiser",
        text: "Organiser hangouts from activism.wtf now show in your Upcoming events and on the calendar when they're for your community. They're just listed so you know they're on: tap one to RSVP on activism.wtf.",
      },
      {
        level: "organiser",
        text: "Photo Hub: new Reaction tag, for people's reactions to the footage.",
      },
      {
        level: "organiser",
        text: "Two feedback forms in Resources: 📢 Feedback for your Regional Support Lead (with your name or anonymously), and 📣 Member feedback form, a link to copy or share with members so they can give you feedback any time (one box, name optional). You get a notification for each one, and What they've said opens the Feedback page.",
      },
      {
        level: "regional_lead",
        text: "Organisers' feedback for you arrives as a notification; the Feedback page has a From organisers tab. With no Regional Support Lead for a region yet, God accounts get it.",
      },
      {
        level: "organiser",
        text: "Meet the Members: once a month (1st Monday, change the day on the action), Meet the Members: volunteer asked comes up with the questions to copy and send. Ticking it off brings up Meet the Members posted, due a week later. Change the questions for future months from the same place.",
      },
      {
        level: "organiser",
        text: "Members: the New members tab is now How you can help (more small roles to come), and there's a new Feedback tab: one box, any length, with your name or anonymously. It goes straight to the community's organisers (a notification, and a Feedback page with everything volunteers have sent).",
      },
      {
        level: "organiser",
        text: "Feedback Fridays: Volunteer feedback collected is now Feedback Friday: form shared, on by default on the 3rd Friday of each month (it was every 3 months). Change the week and day on the action itself.",
      },
      {
        level: "organiser",
        text: "Special events are now an event category: on an event's page, mark it as (say) 🎄 Christmas social. Events with Christmas, Halloween etc. in the title are marked automatically. Special events get a Special event promoted action every week from 8 weeks before, on top of the usual promote actions.",
      },
      {
        level: "organiser",
        text: "Graphic maker: Copy image, to paste straight into WhatsApp, Instagram or Facebook (as well as Download PNG).",
      },
      {
        level: "organiser",
        text: "Table banner in the sign splitter: print the 1830 × 750 mm banner design on 14 A3 sheets (or A4). The table banner's DIY option links straight to it.",
      },
      {
        level: "organiser",
        text: "Equipment Location: places you've typed before (like a storage unit) come up for every item, so you can pick them again.",
      },
      {
        level: "organiser",
        text: "New upgrade in the equipment guide: Sign clamps (Amazon, ~$15), good for attaching smaller signs to your tables.",
      },
      {
        level: "organiser",
        text: "What to get next shows each item's picture and a link to buy it. Things you can already afford aren't labelled; the rest say roughly when you'll have enough. Disinfectant spray and the hand trolley are left out (not every team needs them).",
      },
      {
        level: "organiser",
        text: "Equipment: double-click (or double-tap) a picture to see it large. Items ticked In community inventory now show who has them, with a Location button to change it, so the separate Your gear list is gone.",
      },
      {
        level: "organiser",
        text: "Equipment guide: prices added for the table banner (DIY ~$25, Best $50), viewing devices (<$150 each), headphones ($8.19), headphone splitters (~$4 each), disinfectant spray (~$4) and the hand trolley ($79). Signs now have a 🛠️ DIY option (8 portrait A3 sheets on thick cardboard, ~$5 each, printed with the sign splitter) next to ✨ Best (Easy Signs corrugated plastic).",
      },
      {
        level: "regional_lead",
        text: "New action when an organiser hangout is coming up in your region: Organiser hangout promoted, each week from 3 weeks before, with a link to the hangout page.",
      },
      {
        level: "god",
        text: "Hangouts import hourly from the activism.wtf sitemap (import-hangouts Edge Function); \"For organizers in Oceania + Japan\" matches region names and countries. Actions can now belong to a region rather than a community (tasks.region_id). A God account can also be a community's organiser and a region's RSL (organiser_team_id / lead_region_id).",
      },
    ],
  },
  {
    date: "2026-10-29",
    title: "Monthly recap carousel",
    changes: [
      {
        level: "organiser",
        text: "🖨️ Sign splitter in Resources (for members too): print the A1 Movie Challenge sign (or upload your own PDF or image) on A4 or A3 sheets at home. Choose exact size or fewer sheets slightly smaller; the PDF has a guide page and tick marks for lining the sheets up.",
      },
      {
        level: "organiser",
        text: "New weekly action for Throwback Thursday: Throwback photo posted. Find a throwback shows Photo Hub photos from this month 1, 2, 5... years ago (like Facebook memories), with a download button and a couple of captions.",
      },
      {
        level: "organiser",
        text: "What to get next (Funding page and the equipment guide): the gear your community doesn't have yet, base kit first, as the ✨ Best version, with Can get now or Enough in about N months from your banked funding (example numbers for now). Hand trolley, Video player box, Disinfectant spray and Spring clamps (for windy days) added to upgrades.",
      },
      {
        level: "organiser",
        text: "New action after each outreach event: Debrief video posted (due 2 days after). Switch it off in Choose actions if you don't do one.",
      },
      {
        level: "organiser",
        text: "💬 Group chat discussion prompts in Resources: 72 questions for your community chat. Pick one for me, Copy or Write post (ready-made or written in your community's voice), and tick Posted so you don't repeat them. The QR code for newcomers now sits inside the Outreach guide card.",
      },
      {
        level: "organiser",
        text: "New action every 3 months: Incident report form shared, with a Write message button (ready-made messages, or write new ones in your community's voice).",
      },
      {
        level: "god",
        text: "FB groups moved from its own tab into Resources (God Mode only).",
      },
      {
        level: "organiser",
        text: "📝 Incident report form added to Resources, for organisers and on members' Resources tab. Group chat discussion prompts are under Coming soon (organisers only). The Outreach guide card matches the other resources.",
      },
      {
        level: "organiser",
        text: "Members get the same top bar as the Hub, with their own tabs: Events, Outreach (the guide), Photo Hub, New members (who they're supporting) and Resources (starting with legal). Sign out is at the bottom of their Events page.",
      },
      {
        level: "organiser",
        text: "Members' Photo Hub no longer shows the Favourites filter (organisers still have it).",
      },
      {
        level: "organiser",
        text: "Funding tab: a first look, with example numbers (banked funds, monthly amount, last 4 months) until it's connected to the We The Free website.",
      },
      {
        level: "organiser",
        text: 'Equipment guide: Stand-up banner (✅ Budget Officeworks pull-up, ✨ Best Easy Signs fabric stand) Video station covers, Lanyards, VR headset and Lav mic (details to come) added to upgrades. The "Synced from activism.wtf" note on Events is now a quiet line (still a yellow box if the import fails).',
      },
      {
        level: "organiser",
        text: 'Suggested events come up 2 months before now, and have Plan later: pick tomorrow, next week or a few weeks away, and "Plan your …" turns up in Actions that morning.',
      },
      {
        level: "organiser",
        text: "Moving an action: two more choices, In 2 weeks and In a month.",
      },
      {
        level: "organiser",
        text: "Suggested events: a few weeks before special events like the Halloween Movie Challenge or a Christmas social, a faded card shows in Events with how many teams in your region and worldwide are on board. Plan it (opens activism.wtf to create it) or × to hide it until next year. Switch suggestions off on the Events page or in Get ready.",
      },
      {
        level: "regional_lead",
        text: "Special events (link on the Events page): add, edit or remove the special events suggested to teams in your region, and see which teams are on board.",
      },
      {
        level: "organiser",
        text: "New member support: the Call button is gone (WhatsApp and Save contact stay).",
      },
      {
        level: "god",
        text: "Usage page (God Mode, top bar): which parts of the app people open and how often, split by members, Core Team, organisers and RSLs. Counting starts today.",
      },
      {
        level: "organiser",
        text: "Members' page has a top bar like the organiser Hub: community name, version, the bell, and their name and photo (tap to jump to their details). The carousel maker shows one set of photos now: chosen first in order (drag to reorder, tap to take out), the rest faded below.",
      },
      {
        level: "organiser",
        text: "Carousel maker: Write caption writes Instagram and Facebook captions from what the photos show (event types, tags, notes, dates), in your community's voice, with an invite to your next events. Members' Photo Hub no longer shows the little tag labels.",
      },
      {
        level: "organiser",
        text: "Carousel maker: drag photos in the new Order row to rearrange the slides (the arrows still work); double-click a slide to zoom, crop and reposition it; pick the shape for every slide: Portrait 4:5, Square or Original (the first photo's own shape, as Instagram allows).",
      },
      {
        level: "organiser",
        text: "Photo Hub: select photos and Attach to event… to move them onto an event listing. Photos on an event (uploaded there or moved) are tagged automatically: the event type from the listing, plus Community event or Outreach.",
      },
      {
        level: "organiser",
        text: "Photo Hub: give photos an event type (Potluck, Social, Movie Challenge, Coworking and others from your event listings), when uploading, from a photo's menu or in bulk. Filter by it too. Fixed: Make carousel opened stuck at the bottom of the screen.",
      },
      {
        level: "organiser",
        text: "People: a Recently added filter shows everyone added in the last 30 days, newest first.",
      },
      {
        level: "organiser",
        text: "Members and Core Team can open the Photo Hub from their page: browse, filter and download your community's photos. Only organisers can add, tag, crop or remove them.",
      },
      {
        level: "organiser",
        text: "Volunteers' page: Your impact is gone, Coming up shows the next 3 events (Show more for the rest), and New member support has WhatsApp, Call and Save contact for the newcomer they're supporting.",
      },
      {
        level: "organiser",
        text: "Volunteers have a Feedback box on their own page: open feedback to their organisers, with their name or anonymously. It shows with the rest of your volunteer feedback.",
      },
      {
        level: "organiser",
        text: "Fixed: members' own page (and the Outreach guide) couldn't find their profile since 23 October, so it asked them to set one up. Their page works again.",
      },
      {
        level: "god",
        text: "people has two FKs to teams (team_id, pending_team_id since 23 Oct), so team:teams(...) embeds from people were ambiguous (PGRST201) and returned nothing. Now team:teams!people_team_id_fkey(...) in /me, /guide and the people export.",
      },
      {
        level: "organiser",
        text: "Logging in is now just a link: enter your email, tap the link in the email and you're in. It works on phones even when the email opens in a different browser. No more codes.",
      },
      {
        level: "organiser",
        text: "A small version tag (Alpha 0.29 to start with) sits next to Movement Hub at the top, and on What's new with the build number. It goes up by itself as changes ship.",
      },
      {
        level: "organiser",
        text: "Equipment guide: Viewing devices (laptops, with a purchasing guide), Table banner (DIY, or Best from your Regional Support Lead) and a Bell in Upgrades. Signs and A-frames have a purchasing guide (order vertical flute; cheaper past 4 signs). Budget and Best are now ticked separately in your inventory, with a dot on the ones you have.",
      },
      {
        level: "organiser",
        text: "Equipment: once an item is ticked In community inventory, pick its condition (Good, Fair or Needs replacing) and how many you have, right there. Quantity shows in Your gear too (×4). Gear uses the same three conditions now (New became Good, Worn became Fair, Needs repair and Broken became Needs replacing).",
      },
      {
        level: "organiser",
        text: "Photos: hold Cmd (Mac) or Ctrl (Windows) and click to select several at once for bulk changes; double-click a photo to see it full screen; tap the star in a photo's corner to favourite it, and filter by ⭐ Favourites; Make carousel from up to 20 selected photos; Removed photos (under Photo Hub) to restore anything removed. New tags: Community event, Holding sign and Training, and each photo shows its tags small in the corner. Not for promo is gone (any photos marked that way are back to normal).",
      },
      {
        level: "organiser",
        text: "Community photos in Resources & Training is now called Photo Hub.",
      },
      {
        level: "organiser",
        text: "Bulk changes for photos: tap Select on an event's photos or Community photos, tick the ones you want (or Select all), then tag, favourite or remove them all at once.",
      },
      {
        level: "organiser",
        text: "Equipment guide and inventory in Resources & Training: the recommended base kit (table, signs, headphones and splitters) and upgrades (A-frame sign), with Budget and Best options and where to buy each in Australia. Tick In community inventory to add an item to your gear, and Add your own for anything else your community owns. Gear (who has what) now lives on the same page, and Hide recommendations shows just your inventory. Regional Support Leads can add a photo to each recommended item, and anyone can add a photo to their own gear. Click a photo square to choose a file, right-click it for Paste photo, or hover and press Ctrl+V / ⌘V.",
      },
      {
        level: "organiser",
        text: "What's new has moved from the tabs to the sparkle button next to the bell (with a pink dot when there's something new), making room for a new Funding tab (coming soon). Hover over the sparkle to see what it is.",
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

// The version, worked out from this file so it moves on by itself: the minor
// number is how many releases there have been, the build is how many changes
// in total. Still alpha (see the stage below); bump STAGE when that changes.
export const STAGE = "Alpha";

// Colour of the version tag, kept washed out: yellow while in alpha, blue
// once in beta. STAGE_TAG sits on the navy header; STAGE_TAG_LIGHT on white.
export const STAGE_TAG: string =
  STAGE === "Alpha"
    ? "bg-yellow/15 text-yellow/70"
    : STAGE === "Beta"
      ? "bg-cyan/15 text-cyan/70"
      : "bg-white/10 text-white/60";
export const STAGE_TAG_LIGHT: string =
  STAGE === "Alpha"
    ? "bg-yellow/30 text-navy/60"
    : STAGE === "Beta"
      ? "bg-cyan/25 text-navy/60"
      : "bg-stone-100 text-stone-500";
export const VERSION = `0.${CHANGELOG.length}`;
export const BUILD = CHANGELOG.reduce((n, r) => n + r.changes.length, 0);

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
