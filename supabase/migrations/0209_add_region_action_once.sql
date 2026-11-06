-- Kai, 6 Nov 2026: "Want add action in the main view not the action planner".
-- add_region_task gains 'once' (a single region-wide action, due p_due) and
-- 'quarterly' (region-wide every 3 months). One-offs use a kind with schedule
-- 'special' so no generator repeats them; the planner hides them.
drop function if exists public.add_region_task(uuid, text, int, text);
create or replace function public.add_region_task(
  p_region uuid, p_title text, p_minutes int, p_how text, p_due timestamptz default null)
returns text language plpgsql security definer set search_path = public as $$
declare v_kind text := 'rsl_' || replace(gen_random_uuid()::text, '-', '');
begin
  if not private.can_plan_region(p_region) then return null; end if;
  if coalesce(trim(p_title), '') = ''
     or p_how not in ('once', 'community', 'weekly', 'monthly', 'quarterly') then
    return null;
  end if;
  insert into task_kinds (kind, title, estimate_minutes, anchor, appear_hours, due_after_hours,
                          sort_order, audience, schedule, default_enabled, region_id, created_by)
  values (v_kind, left(trim(p_title), 80), greatest(1, least(coalesce(p_minutes, 10), 600)),
          'start', 0, 0, 50, 'regional',
          case p_how when 'once' then 'special' when 'community' then 'monthly'
                     when 'weekly' then 'region_weekly' when 'quarterly' then 'region_quarterly'
                     else 'region_monthly' end,
          true, p_region, auth.uid());
  if p_how = 'once' then
    insert into tasks (region_id, kind, period, due_at)
    values (p_region, v_kind, 'once',
            greatest(coalesce(p_due, now() + interval '7 days'), now() + interval '1 hour'));
  else
    insert into region_task_kinds (region_id, kind, enabled) values (p_region, v_kind, true);
    perform private.create_region_tasks();
    perform private.create_monthly_tasks();
  end if;
  return v_kind;
end $$;
grant execute on function public.add_region_task(uuid, text, int, text, timestamptz) to authenticated;
