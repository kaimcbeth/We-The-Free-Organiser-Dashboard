# We The Free Organiser Dashboard

An attendance app for We The Free (WTF) city teams, starting with Sydney.
Organisers tick off who turns up to each event, and see who has been to what.

## What's built (Phase 1)

- **Login:** organisers sign in with an emailed magic link (no passwords).
- **Events:** today's events up top, then upcoming and past. Add events by hand.
- **Check-in:** search, one tap to tick someone in or out, live headcount and
  first-timer count, and a quick "new person" form that adds and checks in at once.
- **People:** everyone in the team with their event count; add people with details.

Also built:
- **Attendee accounts:** 6-digit email code login, sign-up page, personal
  connect QR/links, and a "My profile" page. Organisers only enter names;
  members add their own details and photo.
- **Event import:** the `import-events` Supabase Edge Function reads each
  team's activism.wtf calendar feed (`/teams/<slug>/events.ics`) at 6am and
  2pm Sydney time, adding new events and updating changed ones.

- **Check-in helpers:** organisers share a no-login QR/link so anyone at the
  door can check people in for that one event (names only; expires after).
- **Insights:** this month at a glance, monthly totals, regulars, one-timers
  to follow up, people who've drifted off, and outreach milestones, each
  downloadable as CSV. Check-in celebrates every 10th outreach event.

- **Buddies:** organisers switch on "Approved buddy" for trusted members and
  pick a buddy for any newcomer from their profile; approved buddies can also
  claim newcomers (first event in the last 45 days) from their own page. A week
  after pairing the buddy is reminded to invite the newcomer to an upcoming
  event, with a ready-made message. The `buddy-reminders` Edge Function runs
  hourly: it always adds an in-app notification (the bell) and also sends an
  email or phone notification, whichever the buddy chose. Email needs the
  `SMTP_USER` / `SMTP_PASS` (Google Workspace app password) function secrets.

## How it fits together

- **Next.js** web app (`src/app`), mobile-first.
- **Supabase** for the database and logins. The database setup lives in
  `supabase/migrations` and has already been applied to the Sydney project.
- **Vercel** hosts the app.

Access rules in the database mean organisers only ever see their own team's data.

## Settings

The app needs two values, set in Vercel (and in `.env.local` for local work).
See `.env.example`. Both are safe to use in the browser.

## Adding an organiser

Organisers sign in once at the login page, then run this in Supabase's SQL Editor
(replace the email and name):

```sql
insert into organisers (id, team_id, name, email, role)
select u.id, t.id, 'Their Name', u.email, 'organiser'
from auth.users u, teams t
where u.email = 'their@email.com' and t.slug = 'sydney-au';
```

## Local development

```bash
npm install
npm run dev
```
