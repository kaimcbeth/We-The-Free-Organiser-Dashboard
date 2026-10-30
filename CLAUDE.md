# Movement Hub: start here

The organiser app for We The Free (WTF), a grassroots animal rights movement. Built with Kai McBeth (community manager, WTF Sydney; God account kai@activism.wtf). Kai doesn't code: explain in plain words, do the work yourself, and ship it.

Also read AGENTS.md (this Next.js version differs from training data).

## Where things are

- Live: https://wtf-organiser.vercel.app (Vercel team `we-the-free`, project `wtf-organiser`). Pushing to `main` deploys automatically.
- Repo: github.com/kaimcbeth/We-The-Free-Organiser-Dashboard
- Supabase project: `jmslxbygvmjtwwxuzkrt` (use the Supabase MCP tools).
- `src/app/(app)`: organiser Hub tabs (Events, Actions, People, Insights, Resources, Funding [mock: $600 banked, $400/month, last 4 months, "What to get next"; mock numbers in `src/lib/funding.ts`]); What's new is the sparkle button by the bell. Resources has `/resources/equipment` (equipment guide + gear inventory), `/resources/prompts` (group chat discussion prompts, `src/lib/discussion-prompts.ts`), `/resources/signs` (sign splitter, `src/lib/sign-splitter.ts`; built-in signs in `public/resources/signs`) and Photo Hub (community photos). Special events (`/events/special`, God + RSLs; suggestions on Events page via `suggested_events`; `src/lib/special-events.ts`). God-only: `/usage` (page_views via log_page_view; section names in `src/lib/usage.ts`), `/test-accounts`. `src/app/attendance`: Core Team. `src/app/me`: members, with their own top bar + tabs in `me/member-nav.tsx` (Events `/me`, Outreach `/me/guide`, Photo Hub `/me/photos`, How you can help `/me/support`, Resources `/me/resources`, Feedback `/me/feedback`; `/me/welcome`). Member feedback (`send_my_feedback`, or the no-login link `/tell/<teams.feedback_token>` via `submit_open_feedback`) notifies the organisers; they read it at `/feedback-inbox`. Organisers' feedback for their RSL (`send_organiser_feedback` → `organiser_feedback`; God gets it when the region has no RSL) is at `/feedback-inbox?from=organisers`. Both forms are cards in Resources (`feedback-cards.tsx`). Public: `/guide` (Outreach guide questions; QR for newcomers), `/join`, `/invite`, `/checkin`, `/calendar`, `/feedback`, `/tell`.
- `src/app/actions.ts`: server actions. `src/lib/`: logic (tasks, invites, engagement, impact, outreach-guide, welcome, changelog, resources…).
- `supabase/migrations`: numbered SQL, one file per change (latest 0143). Apply with `apply_migration`/`execute_sql`, then save the same SQL as the next numbered file.
- `supabase/functions`: Edge Functions (import-events, import-hangouts, buddy-reminders, event-reminders, send-approval, write-copy, test-login). Deploy with the MCP tool.
- Secrets live only in Supabase (Edge Functions → Secrets): `ANTHROPIC_API_KEY` is set; `SMTP_USER`/`SMTP_PASS`/`SMTP_FROM` are not yet (email features say "not set up"). Never ask for or accept secrets in chat.

## Build, check, ship

```
export npm_config_noproxy=localhost,127.0.0.1 NO_PROXY=localhost,127.0.0.1 no_proxy=localhost,127.0.0.1
npx prettier --write src; npx tsc --noEmit; npx eslint src; npm run build
git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit -m "…"
git push origin main
```
- After adding a route: `npx next typegen`.
- Visual check: temporary page under `src/app/checkin/zz-*`, `npx next dev -p 31xx`, Python Playwright with `executable_path="/opt/pw-browsers/chromium"`. Kill the server, delete the zz folder and `.next/dev` afterwards.
- React 19 lint: no `Date.now()` in render (eslint-disable comment in server components), no setState in effects, no components defined inside components.
- Add a line to `src/lib/changelog.ts` (What's new) for anything users will notice; `COMING_SOON` there for planned items.
- The version tag (header, What's new) comes from the changelog: `0.<releases>`, build = total changes. Adding entries moves it on; change `STAGE` there when it leaves alpha.

## Kai's preferences

- Australian spelling. Say "actions", not "tasks". Keep questions short; go section by section.
- No pre-filled personal DMs (message links open an empty chat). Subtle UI for secondary links. No emoji on buttons (Kai's own exceptions: ✅ Budget / ✨ Best / 🛠️ DIY on the equipment toggle; emoji on Resources cards).
- Max 6 nav tabs (FB groups is a God-only card in Resources).
- Ask in one line whether a new feature should go in the tutorial (organiser tour: `src/app/(app)/organiser-tour.tsx`).
- Privacy: profile photos are member-only; home address/signature visible only to the owner; only God sees the God role and test people. Organisers can edit anyone's contact details in their community.

## How the app works (key ideas)

- Roles: God, Regional Support Lead, Organiser, Core Team, member. One role per account, except a God account can also be a community's organiser and a region's RSL (`organisers.organiser_team_id` / `lead_region_id`; Kai: Sydney + Oceania). God can "View as" any role, including "New Organiser (existing/new community)"; the new-community view uses a Practice Community that resets on every view change.
- Actions (`task_kinds` → `tasks`): generated by pg_cron every 10 min around events (anchor/appear/due hours), weekly/monthly/quarterly, per newcomer, month end, follow-ups. Teams switch kinds on/off (`team_task_kinds`).
- Events import hourly from each team's activism.wtf calendar. Organiser Hangouts (activism.wtf/hangouts/…) import hourly from the site's sitemap (no list page or feed) into `hangouts`; "For organizers in Oceania + Japan" is matched to regions and countries (trigger). Shown as listings only (Events Upcoming + calendar, via `team_hangouts`), never in `events`. Region-wide actions use `tasks.region_id` (team_id null), shown by `RegionActions` on Actions. RLS everywhere; anything cross-cutting goes through `security definer` functions that check the caller.
- The organiser's community setup checklist pops up after the tour. Volunteers RSVP (Going/Maybe/Can't), get a day-before reminder, see their impact, and use the Outreach guide (questions only now) between street conversations.

## Recent features (29 Oct 2026)

- Members: own top bar + tabs. Special events (God anywhere, RSLs in their region): faded "Suggested" card on Events ~2 months before with Plan it / Plan later / ×; seeded 🎃 Halloween Movie Challenge (31 Oct), 🎄 Christmas social (13 Dec). Funding → gear "What to get next". Actions: Incident report form shared, Debrief video posted, Throwback photo posted. Resources: incident form, discussion prompts, sign splitter, Outreach guide card, FB groups (God-only). God `/usage`.

## Recent features (30 Oct 2026)

- Organiser hangouts: import-hangouts Edge Function (cron :37) reads the activism.wtf sitemap; listed (not in `events`) for the communities they're for. RSLs of those regions (and God with `lead_region_id`) get "Organiser hangout promoted" weekly from 3 weeks before (`private.create_hangout_tasks`, cron :42). Japan teams are in Asia, so Asia's RSL also gets the Oceania + Japan one.
- Kai's account: God + Sydney organiser + Oceania RSL (`organiser_team_id` / `lead_region_id`).
- Special events as a category: `events.special_event_id` (picker on the event page; trigger tags new events whose title has the special event's word within 21 days). `promote_special` weekly from 8 weeks before (`private.create_special_promo_tasks`, cron :47; schedule `special`, so not in Choose actions; has Write post + Get graphic).
- Monthly actions on the nth weekday: `task_kinds.schedule_week` (5 = last) + `schedule_weekday`, per-community override in `team_task_kinds` (`set_task_schedule`, `ScheduleChanger` on the card). Feedback Fridays = `com_feedback` (now monthly, on by default, 3rd Friday; first 20 Nov). Made on the day (skipped if over a week past), due 2 days later.
- Meet the Members: `meet_members_ask` (monthly, 1st Monday, changeable; first 2 Nov) → ticking it off makes `meet_members_post` (trigger, due a week later). Questions: `teams.meet_members_questions` (null = `MEET_MEMBERS_DEFAULT` in `src/lib/meet-members.ts`), copied/edited from the action.
- Feedback: members' Feedback tab (`/me/feedback`, up to 20k chars, anonymous option) and a no-login member link `/tell/<feedback_token>` (Resources card 📣 Member feedback form: Copy link / Share / What they've said). Each notifies the organisers; `/feedback-inbox` lists it. Organisers → RSL: Resources card 📢 Feedback for your Regional Support Lead (`organiser_feedback`; God gets it when the region has no RSL), read at `/feedback-inbox?from=organisers`. Member tab "New members" renamed "How you can help" (more micro roles to come).
- Equipment: prices (table banner DIY ~$25 / Best $50, viewing devices <$150 each, headphones $8.19, splitters ~$4 each, hand trolley $79, disinfectant ~$4, stand-up banner Best $197.67, sign clamps ~$15 new upgrade from Amazon). Signs have DIY (8 A3 sheets on cardboard, ~$5 each) / Best. A-frame Best has a carry handle. Location (who/where) on inventory rows with earlier places offered; Your gear removed. Double-click photos to enlarge. Each item opens on the version the community has (no dot). What to get next: photos + buy links, only "Enough in about N months" labels, `noSuggest` (hand trolley, disinfectant).
- Sign splitter: table banner built in (1830 × 750 mm, 14 A3 sheets; `?sign=table-banner`, linked from the banner's DIY option); tiles embed the design once (small PDFs).
- Graphic maker: Copy image (clipboard). Photo Hub: Reaction tag.
- Fixed: two helpers' search_path (security advisor).

## Open threads

- Townsville's activism.wtf calendar returns 404 every hour (team moved or closed?): ask Kai.
- No real RSL accounts yet; leaked-password protection needs Supabase Pro (org is on Free).
- Supabase approval prompts often time out here; `execute_sql` usually goes through without one (avoid `drop trigger`, use `create or replace trigger`). Otherwise send Kai the migration file for the SQL Editor.
- Local dev server can't reach Supabase server-side (pages that load data on the server 404 locally); check those on the live site (fetch via `net.http_get` from SQL).
- Not yet tried on a real device: Copy image in the graphic maker, Share on the member feedback link, double-tap photos on phones, Location picker; Write new options for prompt/incident, Find a throwback, Plan later; a real print of the sign splitter/table banner.
- Ask Kai: should Asia's RSL get the Oceania + Japan hangout action; Core Team's "Print it with the sign splitter" links go to the organiser page (redirects them); tutorial steps for today's features (hangouts, special-event promotion, Feedback Fridays, Meet the Members, feedback forms); an "Add something else" for gear not in the kit.
- Funding is a mock until it's integrated from the main WTF website.
- Equipment (`src/lib/resources.ts`): details still to come for Video station covers, Lanyards (no photo/price, shows in What to get next), VR headset, Lav mic, Video player box, Disinfectant spray; the large Kings table price; sign-pole assembly steps.
- Throwback suggestions need photos with a month and year set (none of Sydney's 48 photos has one yet).
- Never answered by Kai: whether sharing the buddy's phone number is OK; the A-frame notes.
- Leftover empty table `conversation_logs` (plus its log_conversation/undo_conversation functions) can be dropped; needs Kai's approval.
- `GearTracker` in `gear-tracker.tsx` is no longer shown (only `LocationSheet` is used); can be deleted.
- Welcome cards use activism.wtf photos; Kai may send Sydney photos to swap in (`src/lib/welcome.ts`).
- Ideas not built: duplicate warning at check-in, weather heads-up, cancel event, upcoming milestones, away mode, on-the-day screen, roster, "N going" on the Events list, Japanese translation (start with volunteer screens), nearby communities sharing volunteers, more micro roles in How you can help.
