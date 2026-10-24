-- (Applied as practice_community.) God Mode "View as New organiser": after
-- the tour you set up a pretend, empty "Practice Community" for real. It's
-- wiped whenever the View as changes, so every run starts fresh.
alter table teams add column is_practice boolean not null default false;

insert into teams (name, slug, timezone, is_practice)
values ('Practice Community', 'practice-community', 'Australia/Sydney', true);

create function private.reset_practice_team()
returns void language plpgsql security definer set search_path = public as $$
declare v_team uuid; r record;
begin
  select id into v_team from teams where is_practice limit 1;
  if v_team is null then return; end if;
  -- People first (their check-ins, roles and messages go with them), then
  -- everything else that belongs to the community.
  delete from people where team_id = v_team or pending_team_id = v_team;
  for r in
    select c.table_name from information_schema.columns c
    join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public' and c.column_name = 'team_id' and t.table_type = 'BASE TABLE'
      and c.table_name not in ('teams', 'people', 'organisers')
  loop
    execute format('delete from public.%I where team_id = $1', r.table_name) using v_team;
  end loop;
  update teams set whatsapp_url = null, setup_dismissed_at = null where id = v_team;
end $$;

create function public.reset_practice_team()
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not private.is_god() then return false; end if;
  perform private.reset_practice_team();
  return true;
end $$;
grant execute on function public.reset_practice_team() to authenticated;
