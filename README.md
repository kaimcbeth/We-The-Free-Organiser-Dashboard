# Movement Hub

The organiser app for [We The Free](https://activism.wtf), a grassroots animal
rights movement. Local organisers use it to run their community: events,
attendance, volunteers, the regular actions that keep a community growing, and
the paperwork around outreach.

It's open source so other movements and communities can learn from it, run
their own copy, or help make it better.

## What it does

- **Events:** imported automatically from each community's activism.wtf
  calendar, or added by hand. Add to your calendar, list or calendar view.
- **Attendance:** check people in on the day in seconds, or hand a QR code to a
  helper. First-timers, milestones and "new to activism" are picked up as you go.
- **People:** everyone in the community with their history, engagement and
  status (first-timer, newcomer, regular, occasional), message links, buddies for
  newcomers, and merging duplicates.
- **Actions:** the regular jobs that keep a community going (promoting events,
  welcoming newcomers, thanking people, re-engaging quiet volunteers, police
  notices), generated at the right time for each event and shared with a Core Team.
- **Helpers built in:** graphics and carousels for social media, a writing
  assistant for posts in your community's own voice, police notice forms filled
  and emailed in two taps, a volunteer feedback form, a gear tracker.
- **Roles:** God Mode, Regional Support Leads, Organisers, Core Team and
  volunteers, each seeing only what they should.

## How it's built

- **Next.js** (App Router, React, Tailwind) in `src/`, mobile first. Hosted on Vercel.
- **Supabase** (Postgres, Auth, Storage, Edge Functions) for everything else.
  - `supabase/migrations`: the whole database, in order. Row Level Security
    means people only ever see their own community's data; anything that needs
    more goes through `security definer` functions that check who's asking.
  - `supabase/functions`: Edge Functions for importing events, emails and
    notifications, police notices and the writing assistant.
  - Scheduled jobs (`pg_cron`) generate actions every 10 minutes.

## Running your own copy

1. Create a Supabase project and run the files in `supabase/migrations` in order.
2. Deploy the Edge Functions in `supabase/functions` and set their secrets as
   needed: `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (email), `ANTHROPIC_API_KEY`
   (writing assistant).
3. Copy `.env.example` to `.env.local` and fill in your Supabase URL and
   publishable key. Set the same two values in your host (e.g. Vercel).
4. `npm install`, then `npm run dev`.
5. Sign in once, then make yourself the first account in the `organisers` table
   with `access = 'god'`. Everyone else can be invited from inside the app.

Communities, event types and the actions list are all data, so you can shape
them to your own movement.

## Your data

No personal data lives in this repository. Volunteers' details, attendance and
everything else stay in your own Supabase database. Never commit `.env.local`
or any service-role key.

## Licence

[GNU Affero General Public License v3.0 or later](https://www.gnu.org/licenses/agpl-3.0.html).
You're free to use, change and share it. If you run a changed version for other
people, share your changes under the same licence, so improvements flow back to
the movement.
