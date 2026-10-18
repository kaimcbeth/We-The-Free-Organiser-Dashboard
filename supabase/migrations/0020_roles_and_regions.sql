-- Roles, top to bottom:
--   god            God Mode: everything, everywhere; adds Regional Support Leads
--   regional_lead  Regional Support Lead: every team in one region; adds Organisers
--   organiser      Organiser: one team; adds Core Team
--   core_team      Core Team: takes attendance for one team (names only)
--   (member)       anyone with a profile and no role
-- Roles live in the existing "organisers" table (one row per login).

-- ---------------------------------------------------------------------------
-- Regions
-- ---------------------------------------------------------------------------
create table regions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  sort_order  int not null default 0
);

insert into regions (name, sort_order) values
  ('Oceania', 1), ('Asia', 2), ('UK', 3), ('Europe', 4), ('North America', 5), ('Latin America', 6);

alter table regions enable row level security;
create policy "anyone signed in reads regions" on regions for select to authenticated using (true);

alter table teams add column region_id uuid references regions (id) on delete set null;
update teams set region_id = (select id from regions where name = 'Oceania') where slug = 'sydney-au';

-- ---------------------------------------------------------------------------
-- Role column
-- ---------------------------------------------------------------------------
-- The new roles go in their own column ("role" keeps its old values and is no longer used).
alter table organisers alter column team_id drop not null;
alter table organisers add column region_id uuid references regions (id) on delete cascade;
alter table organisers add column access text not null default 'organiser'
  check (access in ('god', 'regional_lead', 'organiser', 'core_team'));

-- The first lead organiser becomes God Mode.
update organisers set access = 'god', team_id = null where role = 'admin';

alter table organisers add constraint organisers_access_scope check (
  (access = 'god' and team_id is null and region_id is null) or
  (access = 'regional_lead' and region_id is not null and team_id is null) or
  (access in ('organiser', 'core_team') and team_id is not null and region_id is null)
);

-- New role rows for people who aren't on a team yet get no automatic profile.
create or replace function private.ensure_organiser_member()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_first text := split_part(trim(new.name), ' ', 1);
  v_last text := nullif(trim(substr(trim(new.name), length(split_part(trim(new.name), ' ', 1)) + 1)), '');
begin
  if new.team_id is not null and not exists (select 1 from people where user_id = new.id) then
    insert into people (team_id, first_name, last_name, email, user_id, linked_at, linked_via, added_via)
    values (new.team_id, coalesce(nullif(v_first, ''), 'Organiser'), v_last, new.email, new.id, now(), 'self_signup', 'self_signup');
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permission checks (every existing access rule uses is_team_organiser,
-- so redefining it gives Regional Leads and God Mode access everywhere).
-- ---------------------------------------------------------------------------
create or replace function private.is_team_organiser(p_team_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from organisers o
    where o.id = auth.uid()
      and (
        o.access = 'god'
        or (o.access = 'organiser' and o.team_id = p_team_id)
        or (o.access = 'regional_lead' and o.region_id = (select t.region_id from teams t where t.id = p_team_id))
      )
  );
$$;

-- Can take attendance for this team (Core Team and up).
create or replace function private.is_team_core(p_team_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select private.is_team_organiser(p_team_id) or exists (
    select 1 from organisers o where o.id = auth.uid() and o.access = 'core_team' and o.team_id = p_team_id
  );
$$;

revoke execute on function private.is_team_core(uuid) from public, anon;
grant execute on function private.is_team_core(uuid) to authenticated;

-- Everyone can read their own role row (God Mode and Regional Leads have no team).
create policy "read own role" on organisers for select to authenticated using (id = auth.uid());

-- ---------------------------------------------------------------------------
-- Attendance screen data, shared by helper links and Core Team
-- ---------------------------------------------------------------------------
create or replace function private.checkin_state(v_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_event events%rowtype;
begin
  select * into v_event from events where id = v_id;
  return jsonb_build_object(
    'status', 'ok',
    'event', jsonb_build_object(
      'id', v_event.id, 'title', v_event.title, 'starts_at', v_event.starts_at,
      'ends_at', v_event.ends_at, 'venue', coalesce(v_event.venue, v_event.address)),
    'people', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'first_name', p.first_name, 'last_name', p.last_name)
                       order by lower(p.first_name), lower(coalesce(p.last_name, '')))
      from people p where p.team_id = v_event.team_id), '[]'::jsonb),
    'checked_in', coalesce((select jsonb_agg(a.person_id) from attendance a where a.event_id = v_id), '[]'::jsonb),
    'returning', coalesce((
      select jsonb_agg(distinct x.id) from (
        select a.person_id as id
        from attendance a join events e on e.id = a.event_id
        where e.team_id = v_event.team_id and e.starts_at < v_event.starts_at
        union
        select p.id from people p where p.team_id = v_event.team_id and p.attended_before_app
      ) x), '[]'::jsonb),
    'is_outreach', coalesce((select counts_as_outreach from event_types where id = v_event.event_type_id), false),
    'outreach_before', coalesce((
      select jsonb_object_agg(p.id, p.starting_outreach_count + (
        select count(*) from attendance a
        join events e on e.id = a.event_id
        join event_types t on t.id = e.event_type_id
        where a.person_id = p.id and t.counts_as_outreach and e.id <> v_id))
      from people p where p.team_id = v_event.team_id), '{}'::jsonb),
    'likely', private.likely_scores(v_id)
  );
end;
$$;

revoke execute on function private.checkin_state(uuid) from public, anon, authenticated;

create or replace function public.helper_checkin_state(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_id uuid := private.active_link_event(p_token);
  v_link checkin_links%rowtype;
begin
  if v_id is null then
    select * into v_link from checkin_links
    where token = p_token and revoked_at is null and expires_at > now() and team_id is not null;
    if found then
      return jsonb_build_object('status', 'no_event', 'next_event', (
        select jsonb_build_object('title', e.title, 'starts_at', e.starts_at)
        from events e where e.team_id = v_link.team_id and e.starts_at > now()
        order by e.starts_at limit 1));
    end if;
    return jsonb_build_object('status', 'inactive');
  end if;
  return private.checkin_state(v_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Core Team: take attendance while logged in (names only, no other access)
-- ---------------------------------------------------------------------------

-- Recent and upcoming events for a team: today first.
create or replace function public.core_events(p_team_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not private.is_team_core(p_team_id) then return null; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', e.id, 'title', e.title, 'starts_at', e.starts_at, 'ends_at', e.ends_at,
      'venue', coalesce(e.venue, e.address),
      'here', (select count(*) from attendance a where a.event_id = e.id)) order by e.starts_at)
    from events e
    where e.team_id = p_team_id
      and e.starts_at > now() - interval '14 days'
      and e.starts_at < now() + interval '28 days'), '[]'::jsonb);
end;
$$;

create or replace function public.core_checkin_state(p_event_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not private.is_team_core(private.event_team(p_event_id)) then
    return jsonb_build_object('status', 'inactive');
  end if;
  return private.checkin_state(p_event_id);
end;
$$;

create or replace function public.core_set_checkin(p_event_id uuid, p_person_id uuid, p_here boolean)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not private.is_team_core(private.event_team(p_event_id)) then return false; end if;
  if not exists (
    select 1 from people p join events e on e.team_id = p.team_id where p.id = p_person_id and e.id = p_event_id
  ) then return false; end if;
  if p_here then
    insert into attendance (event_id, person_id, checked_in_by)
    values (p_event_id, p_person_id, auth.uid())
    on conflict (event_id, person_id) do nothing;
  else
    delete from attendance where event_id = p_event_id and person_id = p_person_id;
  end if;
  return true;
end;
$$;

create or replace function public.core_add_person(p_event_id uuid, p_first text, p_last text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_team uuid := private.event_team(p_event_id);
  v_person uuid;
begin
  if not private.is_team_core(v_team) or coalesce(trim(p_first), '') = '' then return null; end if;
  insert into people (team_id, first_name, last_name, added_via)
  values (v_team, trim(p_first), nullif(trim(p_last), ''), 'host')
  returning id into v_person;
  insert into attendance (event_id, person_id, checked_in_by) values (p_event_id, v_person, auth.uid());
  return jsonb_build_object('id', v_person, 'first_name', trim(p_first), 'last_name', nullif(trim(p_last), ''));
end;
$$;

create or replace function public.core_set_attended_before(p_event_id uuid, p_person_id uuid, p_value boolean)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not private.is_team_core(private.event_team(p_event_id)) then return false; end if;
  update people p set attended_before_app = p_value
  from events e
  where e.id = p_event_id and p.id = p_person_id and p.team_id = e.team_id;
  return found;
end;
$$;

revoke execute on function public.core_events(uuid), public.core_checkin_state(uuid),
  public.core_set_checkin(uuid, uuid, boolean), public.core_add_person(uuid, text, text),
  public.core_set_attended_before(uuid, uuid, boolean) from public, anon;
grant execute on function public.core_events(uuid), public.core_checkin_state(uuid),
  public.core_set_checkin(uuid, uuid, boolean), public.core_add_person(uuid, text, text),
  public.core_set_attended_before(uuid, uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Giving and removing roles
-- ---------------------------------------------------------------------------

-- Can the signed-in user give or remove this role, for this team or region?
create or replace function private.can_manage_role(p_role text, p_team_id uuid, p_region_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from organisers me where me.id = auth.uid() and (
      (me.access = 'god' and p_role in ('regional_lead', 'organiser', 'core_team'))
      or (me.access = 'regional_lead' and p_role in ('organiser', 'core_team')
          and (select t.region_id from teams t where t.id = p_team_id) = me.region_id)
      or (me.access = 'organiser' and p_role = 'core_team' and p_team_id = me.team_id)
    )
  );
$$;

revoke execute on function private.can_manage_role(text, uuid, uuid) from public, anon;
grant execute on function private.can_manage_role(text, uuid, uuid) to authenticated;

-- Give someone (a member with a login) a role. Organiser and Core Team roles
-- are for the team they're a member of; Regional Leads need a region.
create or replace function public.grant_role(p_person_id uuid, p_role text, p_region_id uuid default null)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_person people%rowtype;
  v_existing organisers%rowtype;
  v_team uuid;
  v_region uuid;
  v_email text;
begin
  select * into v_person from people where id = p_person_id;
  if not found then return 'not_found'; end if;
  if v_person.user_id is null then return 'no_account'; end if;
  if v_person.user_id = auth.uid() then return 'self'; end if;

  if p_role = 'regional_lead' then
    v_region := p_region_id;
    if v_region is null then return 'need_region'; end if;
  elsif p_role in ('organiser', 'core_team') then
    v_team := v_person.team_id;
  else
    return 'bad_role';
  end if;

  if not private.can_manage_role(p_role, v_team, v_region) then return 'not_allowed'; end if;

  -- Changing someone's existing role: must be allowed to manage that one too.
  select * into v_existing from organisers where id = v_person.user_id;
  if found and not private.can_manage_role(v_existing.access, v_existing.team_id, v_existing.region_id) then
    return 'not_allowed';
  end if;

  select email into v_email from auth.users where id = v_person.user_id;
  insert into organisers (id, team_id, region_id, name, email, access)
  values (v_person.user_id, v_team, v_region,
          trim(v_person.first_name || ' ' || coalesce(v_person.last_name, '')),
          coalesce(v_email, v_person.email, ''), p_role)
  on conflict (id) do update
    set team_id = excluded.team_id, region_id = excluded.region_id, access = excluded.access;
  return 'ok';
end;
$$;

-- Back to plain member.
create or replace function public.remove_role(p_user_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_existing organisers%rowtype;
begin
  select * into v_existing from organisers where id = p_user_id;
  if not found then return 'not_found'; end if;
  if p_user_id = auth.uid() then return 'self'; end if;
  if not private.can_manage_role(v_existing.access, v_existing.team_id, v_existing.region_id) then
    return 'not_allowed';
  end if;
  delete from organisers where id = p_user_id;
  return 'ok';
end;
$$;

-- Everyone with a role that the signed-in user can see (their scope),
-- plus whether they may remove it.
create or replace function public.list_roles()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id', o.id,
    'person_id', p.id,
    'name', coalesce(nullif(trim(p.first_name || ' ' || coalesce(p.last_name, '')), ''), o.name),
    'role', o.access,
    'team', t.name,
    'region', coalesce(r.name, tr.name),
    'can_manage', private.can_manage_role(o.access, o.team_id, o.region_id)
  ) order by case o.access when 'god' then 0 when 'regional_lead' then 1 when 'organiser' then 2 else 3 end, o.name), '[]'::jsonb)
  from organisers o
  left join people p on p.user_id = o.id
  left join teams t on t.id = o.team_id
  left join regions r on r.id = o.region_id
  left join regions tr on tr.id = t.region_id
  where exists (select 1 from organisers me where me.id = auth.uid() and me.access <> 'core_team')
    and (
      private.is_team_organiser(o.team_id)
      or o.id = auth.uid()
      or (o.region_id is not null and exists (
            select 1 from organisers me where me.id = auth.uid()
              and (me.access = 'god' or me.region_id = o.region_id)))
      or (o.access = 'god' and exists (select 1 from organisers me where me.id = auth.uid() and me.access = 'god'))
    );
$$;

-- Members with a login who could be given a role by the signed-in user.
create or replace function public.role_candidates()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'person_id', p.id,
    'name', trim(p.first_name || ' ' || coalesce(p.last_name, '')),
    'team', t.name,
    'role', o.access) order by p.first_name, p.last_name), '[]'::jsonb)
  from people p
  join teams t on t.id = p.team_id
  left join organisers o on o.id = p.user_id
  where p.user_id is not null
    and p.user_id <> auth.uid()
    and private.can_manage_role(coalesce(o.access, 'core_team'), coalesce(o.team_id, p.team_id), o.region_id)
    and exists (select 1 from organisers me where me.id = auth.uid() and me.access <> 'core_team');
$$;

revoke execute on function public.grant_role(uuid, text, uuid), public.remove_role(uuid),
  public.list_roles(), public.role_candidates() from public, anon;
grant execute on function public.grant_role(uuid, text, uuid), public.remove_role(uuid),
  public.list_roles(), public.role_candidates() to authenticated;

-- WhatsApp link for whichever team an organiser is looking at.
create or replace function public.set_team_whatsapp(p_url text, p_team_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_url text := substring(nullif(trim(p_url), '') from '^(https://chat\.whatsapp\.com/[A-Za-z0-9]+)');
begin
  if not private.is_team_organiser(p_team_id) then return 'not_organiser'; end if;
  if p_url is not null and trim(p_url) <> '' and v_url is null then return 'invalid'; end if;
  update teams set whatsapp_url = v_url where id = p_team_id;
  return 'ok';
end;
$$;

revoke execute on function public.set_team_whatsapp(text, uuid) from public, anon;
grant execute on function public.set_team_whatsapp(text, uuid) to authenticated;
