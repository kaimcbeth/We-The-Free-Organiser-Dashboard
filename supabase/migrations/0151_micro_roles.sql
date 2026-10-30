-- Micro roles for members (How you can help).
--
-- Six small roles that unlock one by one as a member comes to more events,
-- so nobody sees every job at once. Some need an organiser's OK first (they
-- need access set up: Core Team for attendance, the community's socials for
-- posting photos and Facebook events). The others start straight away and
-- the organisers are told.

create table micro_roles (
  key          text primary key,
  title        text not null,
  blurb        text not null,
  min_events   int not null,
  needs_ok     boolean not null default false,
  sort_order   int not null
);

insert into micro_roles (key, title, blurb, min_events, needs_ok, sort_order) values
  ('engage_posts', 'Engage with our posts',
   'Like, comment on and share the community''s event posts on social media, so more people see them.', 0, false, 0),
  ('photos', 'Take photos at events',
   'Snap a few photos of the team in action and add them to the Photo Hub.', 1, false, 1),
  ('attendance', 'Do event attendance',
   'Tick people in as they arrive, so everyone''s events and milestones are counted.', 3, true, 2),
  ('social_photos', 'Post event photos on social media',
   'Share the best photos from an event on the community''s Instagram or Facebook.', 5, true, 3),
  ('facebook_events', 'Create Facebook events',
   'Put upcoming events on the community''s Facebook page so more people find them.', 8, true, 4),
  ('plan_events', 'Plan community events',
   'Help plan socials, potlucks and other get-togethers that keep the community close.', 12, false, 5);

alter table micro_roles enable row level security;
create policy micro_roles_read on micro_roles for select to authenticated using (true);

create table member_micro_roles (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null references teams (id) on delete cascade,
  person_id    uuid not null references people (id) on delete cascade,
  role_key     text not null references micro_roles (key) on delete cascade,
  status       text not null check (status in ('pending', 'active')),
  created_at   timestamptz not null default now(),
  approved_at  timestamptz,
  approved_by  uuid references auth.users (id) on delete set null,
  unique (person_id, role_key)
);
create index member_micro_roles_team_idx on member_micro_roles (team_id);

-- Everything goes through the functions below.
alter table member_micro_roles enable row level security;

-- Events that count towards unlocking: events attended, plus 5 for people
-- who came before the app (their history isn't in it).
create or replace function private.micro_role_events(p_person_id uuid)
returns int language sql stable security definer set search_path = public as $$
  select (select count(*)::int from attendance a where a.person_id = p_person_id)
       + case when p.attended_before_app then 5 else 0 end
  from people p where p.id = p_person_id;
$$;

create or replace function private.notify_team_organisers(
  p_team_id uuid, p_kind text, p_title text, p_body text, p_url text)
returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, kind, title, body, url)
  select o.id, p_kind, p_title, p_body, p_url
  from organisers o
  where (o.access = 'organiser' and o.team_id = p_team_id)
     or (o.access = 'god' and o.organiser_team_id = p_team_id);
$$;

revoke execute on function private.micro_role_events(uuid), private.notify_team_organisers(uuid, text, text, text, text) from public, anon;

-- The member's own view: their event count and each role with its status.
create or replace function public.my_micro_roles()
returns json language plpgsql stable security definer set search_path = public as $$
declare v_person uuid;
begin
  select id into v_person from people where user_id = auth.uid() limit 1;
  if v_person is null then return null; end if;
  return json_build_object(
    'events', private.micro_role_events(v_person),
    'roles', coalesce((
      select json_agg(json_build_object(
        'key', r.key, 'title', r.title, 'blurb', r.blurb,
        'min_events', r.min_events, 'needs_ok', r.needs_ok,
        'status', m.status) order by r.sort_order)
      from micro_roles r
      left join member_micro_roles m on m.role_key = r.key and m.person_id = v_person
    ), '[]'::json));
end $$;

-- "I'd like to do this" / "Ask to do this".
create or replace function public.offer_micro_role(p_key text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_person uuid; v_team uuid; v_name text; r micro_roles; v_status text;
begin
  select id, team_id, trim(first_name || ' ' || coalesce(last_name, ''))
    into v_person, v_team, v_name
  from people where user_id = auth.uid() limit 1;
  if v_person is null or v_team is null then return 'not_allowed'; end if;
  select * into r from micro_roles where key = p_key;
  if r.key is null then return 'unknown'; end if;
  if private.micro_role_events(v_person) < r.min_events then return 'locked'; end if;
  v_status := case when r.needs_ok then 'pending' else 'active' end;
  insert into member_micro_roles (team_id, person_id, role_key, status, approved_at)
  values (v_team, v_person, r.key, v_status, case when r.needs_ok then null else now() end)
  on conflict (person_id, role_key) do nothing;
  if not found then return 'ok'; end if;
  perform private.notify_team_organisers(v_team, 'micro_role',
    case when r.needs_ok then v_name || ' would like to help: ' || lower(r.title)
         else v_name || ' is helping: ' || lower(r.title) end,
    case when r.needs_ok then 'Say yes or not right now on People.'
         else 'A quick thank-you goes a long way.' end,
    '/people#helping-out');
  return v_status;
end $$;

-- "Stop doing this" (or take back an ask).
create or replace function public.stop_micro_role(p_key text)
returns text language plpgsql security definer set search_path = public as $$
declare v_person uuid; v_team uuid; v_name text; v_title text; v_status text;
begin
  select id, team_id, trim(first_name || ' ' || coalesce(last_name, ''))
    into v_person, v_team, v_name
  from people where user_id = auth.uid() limit 1;
  if v_person is null then return 'not_allowed'; end if;
  delete from member_micro_roles m
  where m.person_id = v_person and m.role_key = p_key
  returning m.status into v_status;
  if v_status = 'active' then
    select title into v_title from micro_roles where key = p_key;
    perform private.notify_team_organisers(v_team, 'micro_role',
      v_name || ' stepped back from: ' || lower(v_title), null, '/people#helping-out');
  end if;
  return 'ok';
end $$;

-- Organisers: who's helping in their community (and who's asked).
create or replace function public.team_micro_roles(p_team_id uuid)
returns table (
  id uuid, person_id uuid, name text, role_key text, title text,
  needs_ok boolean, status text, created_at timestamptz, events int)
language sql stable security definer set search_path = public as $$
  select m.id, p.id, trim(p.first_name || ' ' || coalesce(p.last_name, '')),
         r.key, r.title, r.needs_ok, m.status, m.created_at,
         private.micro_role_events(p.id)
  from member_micro_roles m
  join people p on p.id = m.person_id
  join micro_roles r on r.key = m.role_key
  where m.team_id = p_team_id and private.is_team_organiser(p_team_id)
  order by m.status desc, r.sort_order, p.first_name;
$$;

-- Organisers: yes / not right now (to an ask), or remove someone from a role.
create or replace function public.decide_micro_role(p_id uuid, p_yes boolean)
returns text language plpgsql security definer set search_path = public as $$
declare m member_micro_roles; v_user uuid; v_title text;
begin
  select * into m from member_micro_roles where id = p_id;
  if m.id is null then return 'gone'; end if;
  if not private.is_team_organiser(m.team_id) then return 'not_allowed'; end if;
  select user_id into v_user from people where id = m.person_id;
  select title into v_title from micro_roles where key = m.role_key;
  if p_yes then
    update member_micro_roles
      set status = 'active', approved_at = now(), approved_by = auth.uid()
      where id = p_id and status = 'pending';
    if found and v_user is not null then
      insert into notifications (user_id, kind, title, body, url)
      values (v_user, 'micro_role', 'You''re in: ' || lower(v_title),
              'Thanks for helping out! An organiser will be in touch about getting set up.',
              '/me/support');
    end if;
  else
    delete from member_micro_roles where id = p_id;
    if m.status = 'pending' and v_user is not null then
      insert into notifications (user_id, kind, title, body, url)
      values (v_user, 'micro_role', 'Not just yet: ' || lower(v_title),
              'Thanks so much for offering. An organiser will chat with you about it.',
              '/me/support');
    end if;
  end if;
  return 'ok';
end $$;

revoke execute on function public.my_micro_roles(), public.offer_micro_role(text),
  public.stop_micro_role(text), public.team_micro_roles(uuid),
  public.decide_micro_role(uuid, boolean) from public, anon;
grant execute on function public.my_micro_roles(), public.offer_micro_role(text),
  public.stop_micro_role(text), public.team_micro_roles(uuid),
  public.decide_micro_role(uuid, boolean) to authenticated;
