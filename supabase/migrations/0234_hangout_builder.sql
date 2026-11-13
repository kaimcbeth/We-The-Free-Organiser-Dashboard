-- Organiser hangout builder (Kai, 13 Nov 2026): RSLs plan monthly one-hour
-- organiser hangouts from modular blocks (welcome, icebreakers, exercises,
-- announcements, wrap-up) and export slides + speaker notes.

create table if not exists public.hangout_blocks (
  id uuid primary key default gen_random_uuid(),
  key text unique, -- built-in library blocks
  region_id uuid references public.regions(id) on delete cascade, -- null = shared library (God)
  section text not null check (section in ('welcome','icebreaker','exercise','announcements','closing')),
  title text not null,
  blurb text,
  minutes smallint not null default 5 check (minutes between 1 and 60),
  slides jsonb not null default '[]'::jsonb,
  sort_order int not null default 100,
  created_by uuid default auth.uid(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hangout_plans (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions(id) on delete cascade,
  hangout_id uuid references public.hangouts(id) on delete set null,
  title text not null default 'Organiser hangout',
  held_on date,
  items jsonb not null default '[]'::jsonb, -- [{block, minutes, slides?}]
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists hangout_plans_region on public.hangout_plans (region_id, held_on desc);

-- God or a Regional Support Lead.
create or replace function private.can_use_hangouts()
returns boolean language sql stable security definer set search_path = public as $f$
  select exists (select 1 from organisers o where o.id = auth.uid() and o.access in ('god','regional_lead'));
$f$;
create or replace function private.is_god()
returns boolean language sql stable security definer set search_path = public as $f$
  select exists (select 1 from organisers o where o.id = auth.uid() and o.access = 'god');
$f$;

alter table public.hangout_blocks enable row level security;
alter table public.hangout_plans enable row level security;

drop policy if exists "hangout blocks read" on public.hangout_blocks;
create policy "hangout blocks read" on public.hangout_blocks for select to authenticated
  using (private.can_use_hangouts() and (region_id is null or private.can_plan_region(region_id)));
drop policy if exists "hangout blocks write" on public.hangout_blocks;
create policy "hangout blocks write" on public.hangout_blocks for all to authenticated
  using (case when region_id is null then private.is_god() else private.can_plan_region(region_id) end)
  with check (case when region_id is null then private.is_god() else private.can_plan_region(region_id) end);

drop policy if exists "hangout plans" on public.hangout_plans;
create policy "hangout plans" on public.hangout_plans for all to authenticated
  using (private.can_plan_region(region_id)) with check (private.can_plan_region(region_id));

grant select, insert, update, delete on public.hangout_blocks, public.hangout_plans to authenticated;

-- Suggestions for the Announcements slide: special events in the next 10
-- weeks, last month across the region, and the region's next hangouts.
create or replace function public.hangout_suggestions(p_region uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $f$
declare
  v_month date := (date_trunc('month', current_date) - interval '1 month')::date;
  v jsonb;
begin
  if not private.can_plan_region(p_region) then raise exception 'not allowed'; end if;
  select jsonb_build_object(
    'specials', coalesce((
      select jsonb_agg(jsonb_build_object('emoji', s.emoji, 'name', replace(s.name, '{year}', extract(year from s.d)::int::text), 'date', s.d) order by s.d)
      from (
        select e.emoji, e.name, private.special_event_date(e, current_date) d
        from special_events e
        where coalesce(e.anniversary, false) = false
          and (e.region_ids is null or cardinality(e.region_ids) = 0 or p_region = any(e.region_ids))
          and (e.countries is null or cardinality(e.countries) = 0 or exists (
            select 1 from teams t where private.team_in_region(t.id, p_region)
              and private.team_country(t.name) = any(e.countries)))
      ) s
      where s.d between current_date and current_date + 70
    ), '[]'::jsonb),
    'month', v_month,
    'recap', public.region_month_recap(p_region, v_month),
    'hangouts', coalesce((
      select jsonb_agg(jsonb_build_object('id', h.id, 'title', h.title, 'starts_at', h.starts_at, 'url', h.source_url) order by h.starts_at)
      from (select * from hangouts h where h.removed_at is null and h.starts_at > now() and p_region = any(h.region_ids) order by h.starts_at limit 4) h
    ), '[]'::jsonb)
  ) into v;
  return v;
end $f$;
grant execute on function public.hangout_suggestions(uuid) to authenticated;

-- Hangouts for a region (to attach a plan to one), past 60 days and coming up.
create or replace function public.region_hangouts(p_region uuid)
returns table (id uuid, title text, starts_at timestamptz, url text)
language sql stable security definer set search_path = public as $f$
  select h.id, h.title, h.starts_at, h.source_url from hangouts h
  where private.can_plan_region(p_region) and h.removed_at is null
    and p_region = any(h.region_ids) and h.starts_at > now() - interval '60 days'
  order by h.starts_at limit 30;
$f$;
grant execute on function public.region_hangouts(uuid) to authenticated;

-- The starting library.
insert into public.hangout_blocks (key, section, title, blurb, minutes, slides, sort_order, created_by) values
($q$welcome$q$, $q$welcome$q$, $q$Welcome$q$, $q$Title slide, today's plan and how we run the call.$q$, 5, $q$[{"layout":"title","heading":"Organiser Hangout","body":"{month} · We The Free {region}","notes":"Welcome everyone as they join. Give people a minute or two to arrive, and say hi to each person by name as they come in. Thank them for making the time: organising is a lot, and showing up here is part of looking after it."},{"layout":"agenda","heading":"Today","notes":"Walk through the plan quickly so people know what's coming and that we'll finish on time."},{"layout":"points","heading":"How we run these","points":["Cameras on if you can","Mute when you're not talking","Raise your hand or pop it in the chat","What's shared here stays here"],"notes":"Keep this light. The last point matters most: people should feel safe bringing real problems from their community."}]$q$::jsonb, 10, null),
($q$welcome_new$q$, $q$welcome$q$, $q$Welcome new organisers$q$, $q$Introduce anyone who's new to organising this month.$q$, 5, $q$[{"layout":"points","heading":"New faces","body":"Say hello to the organisers joining us for the first time","points":["Your name and community","How long you've been involved","One thing you're excited to try"],"notes":"Ask each new organiser to introduce themselves. Afterwards, ask one experienced organiser to offer to be their go-to person this month. Follow up with the new organisers privately after the call."}]$q$::jsonb, 20, null),
($q$ice_highlight$q$, $q$icebreaker$q$, $q$Highlight of the month$q$, null, 5, $q$[{"layout":"question","heading":"What was the highlight of your month?","body":"In your community or in life","notes":"Go first to set the tone and keep it short: 30 seconds each. Name the community as people share so everyone learns who's who."}]$q$::jsonb, 30, null),
($q$ice_rose_thorn_bud$q$, $q$icebreaker$q$, $q$Rose, thorn, bud$q$, null, 8, $q$[{"layout":"points","heading":"Rose, thorn, bud","points":["🌹 Rose: something that went well","🌵 Thorn: something that was hard","🌱 Bud: something you're looking forward to"],"notes":"Takes longer than a single question, so give it 8 minutes. Jot down the thorns: they're often good topics for the exercise or for a 1:1 call later."}]$q$::jsonb, 40, null),
($q$ice_why$q$, $q$icebreaker$q$, $q$Your why in one sentence$q$, null, 5, $q$[{"layout":"question","heading":"Why do you do this?","body":"One sentence. No pressure to make it perfect.","notes":"A grounding question, good for months when people seem tired. Let it be quiet for a moment before the first person answers."}]$q$::jsonb, 50, null),
($q$ice_first_event$q$, $q$icebreaker$q$, $q$Your first event$q$, null, 5, $q$[{"layout":"question","heading":"What was the first activism event you ever went to?","body":"What made you come back?","notes":"The second part is the useful bit: what brought people back is exactly what we want newcomers to feel. Note any patterns."}]$q$::jsonb, 60, null),
($q$ice_meal$q$, $q$icebreaker$q$, $q$Best vegan meal this month$q$, null, 5, $q$[{"layout":"question","heading":"Best vegan thing you ate this month?","body":"Bonus points for where to get it","notes":"An easy, fun one for a lighter month. Great before a heavier exercise."}]$q$::jsonb, 70, null),
($q$ice_one_word$q$, $q$icebreaker$q$, $q$One word check-in$q$, null, 3, $q$[{"layout":"question","heading":"One word for how you're arriving today","notes":"Quick round, one word each. If someone says something like tired or overwhelmed, check in with them after the call (you could suggest a 1:1)."}]$q$::jsonb, 80, null),
($q$ice_superpower$q$, $q$icebreaker$q$, $q$Organiser superpower$q$, null, 5, $q$[{"layout":"question","heading":"What's your organiser superpower?","body":"And what's your kryptonite?","notes":"Helps people see who to ask for help with what. Point out when one person's kryptonite is someone else's superpower."}]$q$::jsonb, 90, null),
($q$ice_conversation$q$, $q$icebreaker$q$, $q$Most memorable conversation$q$, null, 6, $q$[{"layout":"question","heading":"What's the most memorable conversation you've had at outreach lately?","notes":"Keep each story under a minute. Good conversations are great material for training new members, so ask if people are happy for you to share them."}]$q$::jsonb, 100, null),
($q$ice_small_win$q$, $q$icebreaker$q$, $q$A win nobody saw$q$, null, 5, $q$[{"layout":"question","heading":"What's a small win from this month that nobody saw?","body":"A newcomer came back, a sign got fixed, a chat finally went well…","notes":"So much organising work is invisible. Celebrate each one out loud."}]$q$::jsonb, 110, null),
($q$ice_animal$q$, $q$icebreaker$q$, $q$The animal that changed you$q$, null, 5, $q$[{"layout":"question","heading":"Is there an animal who changed how you see things?","body":"A sanctuary resident, a pet, a story you heard","notes":"A warm, grounding question that reconnects people with why we're here."}]$q$::jsonb, 120, null),
($q$ice_fill_cup$q$, $q$icebreaker$q$, $q$What's filling your cup$q$, null, 5, $q$[{"layout":"question","heading":"What's filling your cup outside activism?","body":"Something you're watching, reading, playing or doing","notes":"A reminder that we're people first. Good in a month where burnout is on your mind."}]$q$::jsonb, 130, null),
($q$ice_dream_event$q$, $q$icebreaker$q$, $q$Dream event$q$, null, 5, $q$[{"layout":"question","heading":"Unlimited budget, no limits: what event would you run?","notes":"Often sparks real ideas. Write down any that could work at a smaller scale and come back to them."}]$q$::jsonb, 140, null),
($q$ice_shout_out$q$, $q$icebreaker$q$, $q$Shout-out round$q$, null, 5, $q$[{"layout":"question","heading":"Who in your community deserves a shout-out?","body":"Tell us what they did","notes":"Note the names: they're perfect for the regional shout-out post and for Meet the Members."}]$q$::jsonb, 150, null),
($q$ice_two_truths$q$, $q$icebreaker$q$, $q$Two truths and a lie$q$, null, 8, $q$[{"layout":"points","heading":"Two truths and a lie","points":["Share three things about yourself","Two are true, one isn't","Everyone guesses the lie"],"notes":"Best with a smaller group (under 8), or ask 3 or 4 people to go. Fun when the group is new to each other."}]$q$::jsonb, 160, null),
($q$ice_learned$q$, $q$icebreaker$q$, $q$Something you learned$q$, null, 5, $q$[{"layout":"question","heading":"What's one thing you learned about organising this month?","body":"Could be from a mistake","notes":"Normalises mistakes. Share one of your own first."}]$q$::jsonb, 170, null),
($q$ex_newcomer_journey$q$, $q$exercise$q$, $q$Newcomer journey$q$, $q$Map what happens from someone's first event to their third, and where people drop off.$q$, 15, $q$[{"layout":"title","heading":"Newcomer journey","body":"From first event to feeling at home","notes":"This exercise works best when people are specific about what actually happens in their community, not what should happen."},{"layout":"points","heading":"Walk it through","points":["Before: how do they find us?","At their first event: who talks to them?","After: what happens in the next 48 hours?","Second event: what's different?","Where do we lose people?"],"notes":"Spend about 8 minutes going through each stage. Ask two or three communities to share what they do. Write the drop-off points down as people mention them."},{"layout":"question","heading":"What's one thing you'll change this month?","notes":"Go round and get one change from each community. Remind them the Hub's Newcomers card and new member actions can help with the follow-up."}]$q$::jsonb, 180, null),
($q$ex_bottleneck$q$, $q$exercise$q$, $q$Fix the bottleneck$q$, $q$Each organiser names what's stalling them; the group brainstorms fixes.$q$, 15, $q$[{"layout":"question","heading":"What's one thing slowing your community down right now?","body":"One sentence each","notes":"Go round quickly (about 4 minutes). Write each bottleneck down."},{"layout":"points","heading":"Pick one, solve it together","points":["Choose the bottleneck most people share","Everyone suggests one fix","No idea is too small"],"notes":"Vote on the most common bottleneck, then brainstorm for about 8 minutes. Finish by asking the organiser who raised it what they'll try first."}]$q$::jsonb, 190, null),
($q$ex_event_swap$q$, $q$exercise$q$, $q$Event idea swap$q$, $q$Share events that worked and steal the best ideas.$q$, 15, $q$[{"layout":"points","heading":"Event idea swap","body":"Share one event that worked really well","points":["What was it?","Why did people love it?","What would you do differently?"],"notes":"Remind people of the 2:1 mix: two community events for every outreach event. Community events are what keep people coming back to outreach."},{"layout":"question","heading":"Which idea will you steal?","notes":"Each organiser names one idea from someone else they'll try. Suggest they talk directly after the call to share details."}]$q$::jsonb, 200, null),
($q$ex_core_team$q$, $q$exercise$q$, $q$Growing your Core Team$q$, $q$How to share the load with micro roles and a Core Team.$q$, 15, $q$[{"layout":"points","heading":"Sharing the load","points":["Who's already helping without a title?","What could you hand over this month?","Micro roles: photos, attendance, socials, events"],"notes":"Many organisers do everything themselves. Point them to How you can help on the Hub, where members unlock micro roles as they come to more events."},{"layout":"question","heading":"Who's one person you'll ask to help, and with what?","notes":"Get a name and a task from each organiser. Follow up on this at their next 1:1."}]$q$::jsonb, 210, null),
($q$ex_promo$q$, $q$exercise$q$, $q$Promo that works$q$, $q$Swap what's actually getting people to events.$q$, 15, $q$[{"layout":"points","heading":"What's getting people through the door?","points":["Your best post this month and why it worked","Which channel brings the most newcomers?","What did you stop doing?"],"notes":"Ask people to share their screen or drop a link to a post if they can. Look at what the good ones have in common."},{"layout":"points","heading":"Try this month","points":["Post a real photo from your last event","Ask members to share the event in their stories","Use the Hub's Make a post for graphics and captions"],"notes":"Keep it practical. Ask each community to pick one thing to try before the next hangout."}]$q$::jsonb, 220, null),
($q$ex_fundraising$q$, $q$exercise$q$, $q$Fundraising brainstorm$q$, $q$Local sponsors, the 2× match and small ways to raise money.$q$, 15, $q$[{"layout":"points","heading":"Funding your community","points":["We The Free matches local recurring sponsorship 2 for 1","Every community gets an equipment grant","Local businesses, members, events"],"notes":"Start with the basics so new organisers know what's on offer. The team fundraising guide is in Resources on the Hub."},{"layout":"question","heading":"Who could you ask for support this month?","body":"Name one person or business","notes":"Brainstorm for 8 minutes, then get one name from each community. Vegan cafés and local businesses that come to events are often the easiest start."}]$q$::jsonb, 230, null),
($q$ex_burnout$q$, $q$exercise$q$, $q$Avoiding burnout$q$, $q$Sustainable organising and looking after each other.$q$, 15, $q$[{"layout":"points","heading":"Organising for the long run","points":["What are your early signs of burnout?","What helps you recharge?","What could you say no to this month?"],"notes":"Make it OK to be honest. Share your own signs first. Don't push anyone to share more than they want to."},{"layout":"points","heading":"Support is there","points":["24/7 activist support line","Free burnout course (code WTF)","activism.wtf/mental-health"],"notes":"Remind everyone these resources are for organisers too, not just members. Offer a 1:1 to anyone who wants one."}]$q$::jsonb, 240, null),
($q$ex_roleplay$q$, $q$exercise$q$, $q$Tricky conversation practice$q$, $q$Practise a hard question from outreach in pairs or as a group.$q$, 15, $q$[{"layout":"question","heading":"What's the hardest thing someone's said to you at outreach lately?","notes":"Collect three or four examples (about 4 minutes). Pick one that comes up a lot."},{"layout":"points","heading":"Let's practise","points":["One person plays the passer-by","One person responds","Everyone else: what worked?"],"notes":"Run the roleplay two or three times with different people. Focus on asking questions and listening, not winning the argument. Point to the IBC Masterclass for more."}]$q$::jsonb, 250, null),
($q$ex_special_event$q$, $q$exercise$q$, $q$Plan a special event together$q$, $q$Plan an upcoming special event across the region.$q$, 20, $q$[{"layout":"title","heading":"Coming up: {special}","body":"Let's plan it together","notes":"Pick the special event that's coming up next (the Hub suggests them on the Events tab). Replace the heading if it doesn't fill in."},{"layout":"points","heading":"Who's doing what?","points":["Which communities are running one?","Could any communities team up?","What do you need: gear, people, promo?"],"notes":"Go round the communities. Note any that want to team up and connect them after the call."}]$q$::jsonb, 260, null),
($q$ex_quiet_members$q$, $q$exercise$q$, $q$Bringing people back$q$, $q$Reconnecting with members who've gone quiet.$q$, 15, $q$[{"layout":"points","heading":"Members who've gone quiet","points":["Who do you miss seeing?","Why do you think they stopped coming?","What's a friendly way to reach out?"],"notes":"The Hub's Insights tab lists who's gone quiet, and the reconnect action suggests one person at a time. Encourage a simple, no-pressure message."},{"layout":"question","heading":"Who's one person you'll message this week?","notes":"First names only is fine. Keep it light."}]$q$::jsonb, 270, null),
($q$ex_conflict$q$, $q$exercise$q$, $q$Handling conflict$q$, $q$Talk through how to handle disagreements in a community.$q$, 15, $q$[{"layout":"points","heading":"When things get tense","points":["Talk to people early, and privately","Listen to every side before deciding","Follow the conflict resolution process","Ask your RSL for help: you're not alone"],"notes":"Keep examples anonymous. The Code of Conduct and conflict resolution process are on the wiki. Anything serious (harassment, safety) goes through the incident report form."},{"layout":"question","heading":"What's helped you handle a disagreement well?","notes":"Collect a few real examples. Thank people for sharing: this one can be hard."}]$q$::jsonb, 280, null),
($q$ex_start_stop$q$, $q$exercise$q$, $q$Start, stop, continue$q$, $q$Quick feedback on how the region and the hangouts are going.$q$, 10, $q$[{"layout":"points","heading":"Start, stop, continue","points":["Start: what should we try?","Stop: what isn't working?","Continue: what should we keep?"],"notes":"Use this every few months. Write everything down without arguing with it, and share what you'll change at the next hangout."}]$q$::jsonb, 290, null),
($q$announcements$q$, $q$announcements$q$, $q$Announcements$q$, $q$What's coming up. Add the Hub's suggestions or type your own.$q$, 5, $q$[{"layout":"points","heading":"Announcements","points":[],"notes":"Keep each one to a sentence or two. Drop links in the chat as you go."}]$q$::jsonb, 300, null),
($q$hub_tip$q$, $q$announcements$q$, $q$Hub tip of the month$q$, $q$Show one Movement Hub feature.$q$, 3, $q$[{"layout":"question","heading":"Hub tip of the month","body":"One Movement Hub feature worth trying","notes":"Pick one feature from What's new on the Hub and share your screen to show it. Change the body text to name it."}]$q$::jsonb, 310, null),
($q$wrap_up$q$, $q$closing$q$, $q$Wrap-up$q$, $q$One action each, the next hangout and a thank you.$q$, 3, $q$[{"layout":"points","heading":"Before you go","points":["One thing you'll do this month","Next hangout: {next_hangout}","Thank you for everything you do"],"notes":"Go round quickly for one action each, or ask people to type it in the chat. End on time."}]$q$::jsonb, 320, null)
on conflict (key) do nothing;

-- Which region a hangout link should open: the first of its regions the
-- caller can plan for.
create or replace function public.hangout_region_for(p_hangout uuid)
returns uuid language sql stable security definer set search_path = public as $f$
  select r from hangouts h, unnest(h.region_ids) r
  where h.id = p_hangout and private.can_plan_region(r)
  order by (r = (select coalesce(o.region_id, o.lead_region_id) from organisers o where o.id = auth.uid())) desc
  limit 1;
$f$;
grant execute on function public.hangout_region_for(uuid) to authenticated;
