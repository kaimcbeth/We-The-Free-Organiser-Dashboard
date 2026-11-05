-- Throwback photos every 2 weeks (Kai, 5 Nov 2026). New schedule 'fortnightly':
-- fortnights counted from Monday 16 Nov 2026 (so this week's weekly throwback,
-- 2026-W45, isn't doubled up); made on the kind's weekday (Thu for the
-- throwback) and due 3 days later, like weekly ones. Period 'F<n>'.

alter table task_kinds drop constraint if exists task_kinds_schedule_check;
alter table task_kinds add constraint task_kinds_schedule_check
  check (schedule = any (array['event','weekly','fortnightly','monthly','quarterly','newcomer','month_end',
                               'follow_up','special','weather','birthday','pod','season']));

update task_kinds set schedule = 'fortnightly' where kind = 'promo_throwback';

-- Add the fortnightly branch to create_monthly_tasks (before the monthly one).
do $$
declare
  v_def text := pg_get_functiondef('private.create_monthly_tasks'::regproc);
  v_marker text := E'    union all\n    select t.id, k.kind, to_char(t.today, ''YYYY-MM''),\n           case when';
  v_new text := E'    union all\n'
    || E'    select t.id, k.kind, ''F'' || ((t.today - date ''2026-11-16'') / 14)::text,\n'
    || E'           greatest(((date ''2026-11-16'' + ((t.today - date ''2026-11-16'') / 14) * 14 + coalesce(k.schedule_weekday, 1) - 1 + 3)::timestamp\n'
    || E'             + interval ''23 hours 59 minutes'') at time zone t.tz, now() + interval ''2 days''),\n'
    || E'           null,\n'
    || E'           private.task_assignee(t.id, k.kind, null, t.today)\n'
    || E'    from t join task_kinds k on k.schedule = ''fortnightly'' and k.audience = ''community'' and k.archived_at is null\n'
    || E'                             and (k.team_id is null or k.team_id = t.id)\n'
    || E'    left join team_task_kinds s on s.team_id = t.id and s.kind = k.kind\n'
    || E'    where t.today >= date ''2026-11-16''\n'
    || E'      and (t.today - date ''2026-11-16'') % 14 >= coalesce(k.schedule_weekday, 1) - 1\n'
    || E'      and (coalesce(s.enabled, k.default_enabled) or private.has_owner(t.id, k.kind))\n';
begin
  if position('''fortnightly''' in v_def) > 0 then return; end if;
  if position(v_marker in v_def) = 0 then raise exception 'marker not found'; end if;
  execute replace(v_def, v_marker, v_new || v_marker);
end $$;
