-- RSL action planner (Kai, 6 Nov 2026: "similar action selector for RSL as
-- well based on hours going up to 50 hours", per week). Each region picks
-- which Regional Support Lead actions it gets, plus the hours a week its RSL
-- planned for.

create table if not exists region_task_kinds (
  region_id uuid not null references regions(id) on delete cascade,
  kind text not null references task_kinds(kind) on delete cascade,
  enabled boolean not null,
  primary key (region_id, kind)
);
alter table region_task_kinds enable row level security;
alter table regions add column if not exists rsl_week_minutes int;

-- Hangout promotion has always been made for every region; say so.
update task_kinds set default_enabled = true where kind = 'promote_hangout';

-- Who may plan a region: its RSL, or God.
create or replace function private.can_plan_region(p_region uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from organisers o
    where o.id = auth.uid()
      and (o.access = 'god'
           or (o.access = 'regional_lead' and o.region_id = p_region))
  );
$$;

create policy "rsl reads region plan" on region_task_kinds for select
  using (private.can_plan_region(region_id));

create or replace function public.region_action_plan(p_region uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not private.can_plan_region(p_region) then
    raise exception 'not allowed';
  end if;
  return jsonb_build_object(
    'minutes', (select rsl_week_minutes from regions where id = p_region),
    'communities', (select count(*) from teams t where t.region_id = p_region
                      and not coalesce(t.is_example, false)
                      and not coalesce(t.is_practice, false)),
    'enabled', coalesce((select jsonb_object_agg(kind, enabled)
                         from region_task_kinds where region_id = p_region), '{}'::jsonb)
  );
end $$;

create or replace function public.set_region_action_plan(
  p_region uuid, p_on text[], p_minutes int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not private.can_plan_region(p_region) then
    raise exception 'not allowed';
  end if;
  insert into region_task_kinds (region_id, kind, enabled)
  select p_region, k.kind, k.kind = any(p_on)
  from task_kinds k
  where k.audience = 'regional' and k.archived_at is null and k.team_id is null
  on conflict (region_id, kind) do update set enabled = excluded.enabled;
  update regions set rsl_week_minutes = p_minutes where id = p_region;
  -- Switched off: close what's still open for it.
  update tasks t set dismissed_at = now()
  from task_kinds k
  where k.kind = t.kind and k.audience = 'regional' and not (k.kind = any(p_on))
    and t.done_at is null and t.dismissed_at is null
    and (t.region_id = p_region
         or t.team_id in (select id from teams where region_id = p_region));
end $$;
grant execute on function public.region_action_plan(uuid) to authenticated;
grant execute on function public.set_region_action_plan(uuid, text[], int) to authenticated;

-- The generators respect it: monthly per-community RSL actions…
do $$
declare v text;
begin
  select pg_get_functiondef('private.create_monthly_tasks()'::regprocedure) into v;
  if position('rk.region_id' in v) = 0 then
    v := replace(v,
      'select id, coalesce(timezone, ''Australia/Sydney'') tz, connect_waiting_since,',
      'select id, region_id, coalesce(timezone, ''Australia/Sydney'') tz, connect_waiting_since,');
    v := replace(v,
      E'                             and k.schedule <> ''special''\n    where t.connect_waiting_since is null',
      E'                             and k.schedule <> ''special''\n    where t.connect_waiting_since is null\n      and coalesce((select rk.enabled from region_task_kinds rk where rk.region_id = t.region_id and rk.kind = k.kind), k.default_enabled)');
    if position('rk.region_id' in v) = 0 or position('select id, region_id,' in v) = 0 then
      raise exception 'create_monthly_tasks patch did not apply';
    end if;
    execute v;
  end if;
  -- …and hangout promotion.
  select pg_get_functiondef('private.create_hangout_tasks()'::regprocedure) into v;
  if position('region_task_kinds' in v) = 0 then
    v := replace(v,
      E'    where h.removed_at is null and h.starts_at > now()',
      E'    where h.removed_at is null and h.starts_at > now()\n      and coalesce((select rk.enabled from region_task_kinds rk where rk.region_id = r.rid and rk.kind = ''promote_hangout''), true)');
    if position('region_task_kinds' in v) = 0 then
      raise exception 'create_hangout_tasks patch did not apply';
    end if;
    execute v;
  end if;
end $$;
