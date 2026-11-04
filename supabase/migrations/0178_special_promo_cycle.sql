-- Special event promo cycle (Kai, 5 Nov 2026): instead of the same
-- "Special event promoted" action every week, an 8-week cycle where each
-- post has its own job. One action per step per special event, shown from
-- its start until it's due; steps whose window has already passed when an
-- event becomes special are skipped. Replaces promote_special (archived).

insert into task_kinds (kind, title, description, blurb, estimate_minutes, due_after_hours, sort_order,
                        anchor, appear_hours, audience, schedule, core_role, default_enabled, late_ok)
values
  ('special_save_date', 'Save the date posted',
   'First word out, 8 weeks before: just the name, the date and one line on why it''s special. Post it on Instagram and in the WhatsApp community, and create the Facebook event.',
   'Save the date (8 weeks before)', 10, 0, 2, 'start', 0, 'community', 'special', 'promo_lead', true, false),
  ('special_announce', 'Big announcement posted',
   'The full announcement with a graphic: what''s happening, who it''s for and how to come. Instagram, Facebook and WhatsApp.',
   'Big announcement (6 weeks before)', 15, 0, 2, 'start', 0, 'community', 'special', 'promo_lead', true, false),
  ('special_throwback', 'Throwback posted',
   'Photos from last time (or a similar event) from the Photo Hub, to get people excited. Instagram and Facebook.',
   'Throwback photos (4 weeks before)', 10, 0, 2, 'start', 0, 'community', 'special', 'promo_lead', true, false),
  ('special_helpers', 'Helpers asked for',
   'Ask in the WhatsApp community for the helpers you need on the day: setting up, welcoming people, photos, packing down.',
   'Helpers wanted (3 weeks before)', 5, 0, 2, 'start', 0, 'community', 'special', 'community_lead', true, false),
  ('special_spread', 'Word spread on Facebook',
   'Invite people to the Facebook event, share it in local Facebook groups, and personally invite a few people.',
   'Spread the word (2 weeks before)', 15, 0, 2, 'start', 0, 'community', 'special', 'promo_lead', true, false),
  ('special_expect', 'What to expect posted',
   'What to bring, where to meet, how long it runs, and that first-timers are welcome. Instagram and WhatsApp.',
   'What to expect (10 days before)', 10, 0, 2, 'start', 0, 'community', 'special', 'promo_lead', true, false),
  ('special_signup', 'Sign-up list posted',
   'One week to go: ask who''s coming in the WhatsApp community and post the sign-up list.',
   'Who''s coming? (1 week before)', 5, 0, 2, 'start', 0, 'community', 'special', 'community_lead', true, false),
  ('special_countdown', 'Countdown posted',
   'Three days to go: a countdown story and a short reminder in the WhatsApp community.',
   'Countdown (3 days before)', 5, 0, 2, 'start', 0, 'community', 'special', 'promo_lead', true, false),
  ('special_final', 'Final details shared',
   'The day before: meeting point, time, weather and what to wear, in the WhatsApp community.',
   'Final details (day before)', 5, 0, 2, 'start', 0, 'community', 'special', 'community_lead', true, false),
  ('special_live', 'Live stories posted',
   'On the day: post stories while it''s happening.',
   'Live stories (on the day)', 10, 0, 2, 'start', 0, 'community', 'special', 'promo_lead', true, false),
  ('special_thanks', 'Thank-you and recap posted',
   'Thank everyone, share the best photos and a number or two (how many came, how many watched). Instagram, Facebook and WhatsApp.',
   'Thank you + recap (after)', 15, 0, 2, 'end', 0, 'community', 'special', 'promo_lead', true, false)
on conflict (kind) do nothing;

-- The weekly one is replaced; its open actions go.
update task_kinds set archived_at = now() where kind = 'promote_special' and archived_at is null;
update tasks set dismissed_at = now()
 where kind = 'promote_special' and done_at is null and dismissed_at is null;

create or replace function private.create_special_promo_tasks()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_count int;
begin
  with steps(kind, anchor, show_h, due_h) as (
    values ('special_save_date', 'start', -1344, -1176),
           ('special_announce',  'start', -1008,  -864),
           ('special_throwback', 'start',  -672,  -528),
           ('special_helpers',   'start',  -504,  -384),
           ('special_spread',    'start',  -336,  -240),
           ('special_expect',    'start',  -240,  -168),
           ('special_signup',    'start',  -168,  -120),
           ('special_countdown', 'start',   -72,   -48),
           ('special_final',     'start',   -36,   -12),
           ('special_live',      'start',     0,    12),
           ('special_thanks',    'end',       0,    48)
  ), slots as (
    select e.id event_id, e.team_id, e.event_type_id, s.kind,
           b.base + make_interval(hours => s.show_h) show_from,
           b.base + make_interval(hours => s.due_h) due_at,
           (now() at time zone coalesce(t.timezone, 'Australia/Sydney'))::date today
    from events e
    join teams t on t.id = e.team_id
    cross join steps s
    cross join lateral (select case when s.anchor = 'end'
                                    then coalesce(e.ends_at, e.starts_at + interval '3 hours')
                                    else e.starts_at end base) b
    join task_kinds k on k.kind = s.kind and k.archived_at is null
    left join team_task_kinds tk on tk.team_id = e.team_id and tk.kind = s.kind
    where e.special_event_id is not null
      and e.starts_at > now() - interval '7 days'
      and not t.is_example and not t.is_practice
      and coalesce(tk.enabled, k.default_enabled)
      and b.base + make_interval(hours => s.show_h) <= now()
      and b.base + make_interval(hours => s.due_h) > now()
  ), made as (
    insert into tasks (team_id, event_id, kind, period, show_from, due_at, assigned_to)
    select team_id, event_id, kind, 'special:' || event_id || ':' || kind, show_from, due_at,
           private.task_assignee(team_id, kind, event_type_id, today)
    from slots
    on conflict (team_id, kind, period) where period is not null do nothing
    returning id, kind, assigned_to
  ), notified as (
    insert into notifications (user_id, kind, title, body, url, task_id)
    select p.user_id, 'task', k.title, 'A new action for you.', '/me#tasks', m.id
    from made m
    join task_kinds k on k.kind = m.kind
    join people p on p.id = m.assigned_to and p.user_id is not null
    returning 1
  )
  select count(*) into v_count from made;
  return v_count;
end $function$;

-- Suggested special event (Kai, 5 Nov 2026): New Year's Eve.
insert into special_events (name, blurb, emoji, month, day, lead_days)
select 'New Year''s Eve', 'See the year out together: a picnic, potluck or viewing spot for the fireworks, or a Movie Challenge in the crowds earlier in the day. A chance to thank everyone and set goals for next year.', '🎆', 12, 31, 61
where not exists (select 1 from special_events where name = 'New Year''s Eve');
