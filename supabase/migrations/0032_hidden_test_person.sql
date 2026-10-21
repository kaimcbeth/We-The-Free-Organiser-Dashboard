-- One hidden "Test Person" in every community. Only God Mode can see them;
-- for everyone else they don't exist (lists, attendance, insights, roles).

create or replace function private.is_test_person(p_person_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_test from people where id = p_person_id), false);
$$;
revoke execute on function private.is_test_person(uuid) from public, anon;
grant execute on function private.is_test_person(uuid) to authenticated;

alter policy "organisers manage team people" on people
  using (private.is_team_organiser(team_id) and (not is_test or private.is_god()))
  with check (private.is_team_organiser(team_id));

alter policy "organisers manage team attendance" on attendance
  using (private.is_team_organiser(private.event_team(event_id)) and (private.is_god() or not private.is_test_person(person_id)))
  with check (private.is_team_organiser(private.event_team(event_id)));

-- Make the community's test person if it doesn't have one yet.
create or replace function private.ensure_test_person(p_team_id uuid)
returns uuid language plpgsql security definer set search_path = public, auth as $$
declare
  v_user uuid;
  v_email text;
  v_person uuid;
begin
  select id into v_person from people where team_id = p_team_id and is_test limit 1;
  if found then return v_person; end if;
  v_user := gen_random_uuid();
  v_email := 'wtf-test-' || substr(replace(v_user::text, '-', ''), 1, 10) || '@example.com';
  insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, created_at, updated_at,
                          raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous)
  values ('00000000-0000-0000-0000-000000000000', v_user, 'authenticated', 'authenticated', v_email, now(), now(), now(),
          '{"provider":"email","providers":["email"]}'::jsonb,
          '{"given_name":"Test","family_name":"Person","test_account":true}'::jsonb, false, false);
  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (v_user::text, v_user, jsonb_build_object('sub', v_user::text, 'email', v_email, 'email_verified', true),
          'email', now(), now(), now());
  insert into people (team_id, first_name, last_name, email, user_id, linked_at, linked_via, added_via, is_test)
  values (p_team_id, 'Test', 'Person', v_email, v_user, now(), 'self_signup', 'self_signup', true)
  returning id into v_person;
  return v_person;
end;
$$;
revoke execute on function private.ensure_test_person(uuid) from public, anon, authenticated;

create or replace function private.teams_get_test_person()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform private.ensure_test_person(new.id);
  return new;
end;
$$;
create trigger teams_test_person after insert on teams
  for each row execute function private.teams_get_test_person();

select private.ensure_test_person(id) from teams;

-- Hide test people from everyone but God Mode in the screens that bypass row rules.
create or replace function private.checkin_state(v_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_event events%rowtype;
begin
  select * into v_event from events where id = v_id;
  return jsonb_build_object(
    'status', 'ok',
    'timezone', private.team_tz(v_event.team_id),
    'event', jsonb_build_object(
      'id', v_event.id, 'title', v_event.title, 'starts_at', v_event.starts_at,
      'ends_at', v_event.ends_at, 'venue', coalesce(v_event.venue, v_event.address)),
    'people', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'first_name', p.first_name, 'last_name', p.last_name)
                       order by lower(p.first_name), lower(coalesce(p.last_name, '')))
      from people p where p.team_id = v_event.team_id and (not p.is_test or private.is_god())), '[]'::jsonb),
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

create or replace function public.my_buddy_dashboard()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_me people%rowtype;
begin
  select * into v_me from people where user_id = auth.uid() limit 1;
  if not found then return jsonb_build_object('status', 'no_profile'); end if;

  return jsonb_build_object(
    'status', 'ok',
    'is_buddy', v_me.is_buddy,
    'notify_channel', v_me.notify_channel,
    'pairs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'pairing_id', bp.id,
        'since', bp.created_at,
        'newcomer', jsonb_build_object('id', n.id, 'first_name', n.first_name, 'last_name', n.last_name),
        'events', (select count(*) from attendance a join events e on e.id = a.event_id
                   where a.person_id = n.id and e.starts_at <= now()),
        'last_seen', (select max(e.starts_at) from attendance a join events e on e.id = a.event_id
                      where a.person_id = n.id and e.starts_at <= now()),
        'prompts', coalesce((
          select jsonb_agg(jsonb_build_object('id', p.id, 'kind', p.kind, 'due_at', p.due_at, 'done_at', p.done_at)
                           order by p.due_at)
          from buddy_prompts p where p.pairing_id = bp.id), '[]'::jsonb)
      ) order by bp.created_at desc)
      from buddy_pairings bp join people n on n.id = bp.newcomer_id
      where bp.buddy_id = v_me.id and bp.ended_at is null), '[]'::jsonb),
    -- Newcomers (first event in the last 45 days) who don't have a buddy yet.
    'available', case when v_me.is_buddy then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', x.id, 'first_name', x.first_name, 'last_name', x.last_name,
        'first_event_title', x.title, 'first_event_at', x.starts_at) order by x.starts_at desc)
      from (
        select distinct on (p.id) p.id, p.first_name, p.last_name, e.title, e.starts_at
        from people p
        join attendance a on a.person_id = p.id
        join events e on e.id = a.event_id
        where p.team_id = v_me.team_id
          and p.id <> v_me.id
          and not p.attended_before_app
          and not p.is_buddy
          and (not p.is_test or private.is_god())
          and not exists (select 1 from buddy_pairings bp where bp.newcomer_id = p.id and bp.ended_at is null)
          and e.starts_at <= now()
        order by p.id, e.starts_at asc
      ) x
      where x.starts_at > now() - interval '45 days'), '[]'::jsonb) else '[]'::jsonb end,
    'upcoming_events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'title', e.title, 'starts_at', e.starts_at,
        'venue', coalesce(e.venue, e.address), 'url', e.source_url,
        'type', t.name) order by e.starts_at)
      from (select * from events where team_id = v_me.team_id and starts_at > now() order by starts_at limit 4) e
      left join event_types t on t.id = e.event_type_id), '[]'::jsonb)
  );
end;
$$;

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
    and (p.id is null or not p.is_test or private.is_god())
    and (
      private.is_team_organiser(o.team_id)
      or o.id = auth.uid()
      or (o.region_id is not null and exists (
            select 1 from organisers me where me.id = auth.uid()
              and (me.access = 'god' or me.region_id = o.region_id)))
      or (o.access = 'god' and exists (select 1 from organisers me where me.id = auth.uid() and me.access = 'god'))
    );
$$;

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
    and (not p.is_test or private.is_god())
    and p.user_id <> auth.uid()
    and private.can_manage_role(coalesce(o.access, 'core_team'), coalesce(o.team_id, p.team_id), o.region_id)
    and exists (select 1 from organisers me where me.id = auth.uid() and me.access <> 'core_team');
$$;

-- God Mode: the test person for a community, with their role.
create or replace function public.test_person(p_team_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('person_id', p.id, 'name', trim(p.first_name || ' ' || coalesce(p.last_name, '')),
                            'role', coalesce(o.access, 'member'))
  from people p left join organisers o on o.id = p.user_id
  where p.team_id = p_team_id and p.is_test and private.is_god()
  limit 1;
$$;
revoke execute on function public.test_person(uuid) from public, anon;
grant execute on function public.test_person(uuid) to authenticated;

-- God Mode: change a test person's role (member = no role). (Applied as set_test_role.)
create or replace function public.set_test_role(p_person_id uuid, p_role text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_p people%rowtype;
  v_email text;
begin
  if not private.is_god() then return 'not_allowed'; end if;
  select * into v_p from people where id = p_person_id and is_test;
  if not found or v_p.user_id is null then return 'not_found'; end if;
  select email into v_email from auth.users where id = v_p.user_id;
  if p_role = 'member' then
    delete from organisers where id = v_p.user_id;
  elsif p_role in ('core_team', 'organiser', 'regional_lead') then
    insert into organisers (id, team_id, region_id, name, email, access)
    values (v_p.user_id,
            case when p_role = 'regional_lead' then null else v_p.team_id end,
            case when p_role = 'regional_lead' then (select region_id from teams where id = v_p.team_id) end,
            'Test Person', coalesce(v_email, ''), p_role)
    on conflict (id) do update set team_id = excluded.team_id, region_id = excluded.region_id,
      access = excluded.access, tutorial_done_at = null;
  else
    return 'bad_role';
  end if;
  update people set tutorial_done_at = null where id = p_person_id;
  return 'ok';
end;
$$;
revoke execute on function public.set_test_role(uuid, text) from public, anon;
grant execute on function public.set_test_role(uuid, text) to authenticated;
