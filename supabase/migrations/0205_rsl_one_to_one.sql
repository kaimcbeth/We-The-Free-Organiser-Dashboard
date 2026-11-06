-- Kai, 6 Nov 2026: "Add 1 to 1 call every 3 months". A built-in RSL action
-- made for each community a region's lead looks after (incl. extra countries,
-- e.g. Oceania + Japan), once a quarter (Jan/Apr/Jul/Oct), due 60 days into
-- the quarter (at least a week away).

insert into task_kinds (kind, title, blurb, description, estimate_minutes, estimate_max_minutes,
                        anchor, appear_hours, due_after_hours, sort_order, audience, schedule, default_enabled)
values ('rsl_one_to_one', '1:1 call with the organisers',
        'A call with each community''s organisers every 3 months',
        'Book a call with this community''s organisers. Ideas: how they''re going (and how they''re really going), what''s working, what''s hard, their goals for the next 3 months, who could step up to help, and anything they need from you or Global Support.',
        30, 60, 'start', 0, 0, 45, 'regional', 'quarterly', true)
on conflict (kind) do nothing;

-- Per-community quarterly RSL actions, for regions with a lead.
create or replace function private.create_region_quarterly_tasks()
returns int language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  with leads as (
    select g.id region_id from regions g
    where exists (select 1 from organisers o
                  where (o.access = 'regional_lead' and o.region_id = g.id)
                     or (o.access = 'god' and o.lead_region_id = g.id))
  ), t as (
    select l.region_id, tm.id team_id, coalesce(tm.timezone, 'Australia/Sydney') tz,
           (now() at time zone coalesce(tm.timezone, 'Australia/Sydney'))::date today
    from leads l join teams tm on private.team_in_region(tm.id, l.region_id)
    where not coalesce(tm.is_example, false) and not coalesce(tm.is_practice, false)
      and tm.connect_waiting_since is null
  ), due as (
    select t.region_id, t.team_id, k.kind,
           to_char(t.today, 'YYYY-"Q"Q') period,
           greatest(((date_trunc('quarter', t.today)::date + 60)::timestamp
                     + interval '23 hours 59 minutes') at time zone t.tz,
                    now() + interval '7 days') due_at
    from t join task_kinds k on k.audience = 'regional' and k.schedule = 'quarterly'
                             and k.archived_at is null and k.team_id is null
                             and (k.region_id is null or k.region_id = t.region_id)
    where coalesce((select rk.enabled from region_task_kinds rk
                    where rk.region_id = t.region_id and rk.kind = k.kind), k.default_enabled)
  ), made as (
    insert into tasks (team_id, kind, period, due_at)
    select team_id, kind, period, due_at from due
    on conflict do nothing
    returning id, team_id, kind
  ), notified as (
    -- One notification per lead and kind, not one per community.
    insert into notifications (user_id, kind, title, body, url)
    select o.id, 'task', k.title,
           case when count(*) = 1 then 'A new action for you.'
                else count(*) || ' new actions for you, one for each community.' end,
           '/tasks'
    from made m join task_kinds k on k.kind = m.kind
    join due d on d.team_id = m.team_id and d.kind = m.kind
    join organisers o on (o.access = 'regional_lead' and o.region_id = d.region_id)
                      or (o.access = 'god' and o.lead_region_id = d.region_id)
    group by o.id, k.kind, k.title
    returning 1
  )
  select count(*) into v_count from made;
  return v_count;
end $$;

select cron.schedule('region-quarterly-tasks', '29 * * * *', 'select private.create_region_quarterly_tasks()');

-- The monthly per-community RSL branch must leave quarterly kinds alone.
do $$
declare v text;
begin
  select pg_get_functiondef('private.create_monthly_tasks()'::regprocedure) into v;
  if position('''region_monthly'', ''quarterly''' in v) = 0 then
    v := replace(v,
      'k.schedule not in (''special'', ''region_weekly'', ''region_monthly'')',
      'k.schedule not in (''special'', ''region_weekly'', ''region_monthly'', ''quarterly'')');
    if position('''region_monthly'', ''quarterly''' in v) = 0 then
      raise exception 'create_monthly_tasks patch did not apply';
    end if;
    execute v;
  end if;
end $$;

select private.create_region_quarterly_tasks();

-- Tidy: the first run sent one notification per community; keep one.
delete from notifications where ctid in (
  select n.ctid from (
    select n.ctid, row_number() over (partition by n.user_id order by n.created_at) rn
    from notifications n join tasks t on t.id = n.task_id where t.kind = 'rsl_one_to_one'
  ) n where rn > 1);
update notifications n set body = '14 new actions for you, one for each community.', task_id = null
from tasks t where t.id = n.task_id and t.kind = 'rsl_one_to_one';
