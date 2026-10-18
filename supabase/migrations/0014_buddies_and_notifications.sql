-- Buddy system and notifications.
--
-- Organisers switch on "Buddy" for trusted members (who have an account).
-- A newcomer gets a buddy either from an organiser, or by a buddy tapping
-- "I'll be their buddy" on the list of newcomers without one.
-- A week after pairing, the buddy is prompted to invite the newcomer to an
-- upcoming event: in the app always, plus email or phone push if they chose.

-- ---------------------------------------------------------------------------
-- People: buddy role and how they want reminders
-- ---------------------------------------------------------------------------
alter table people
  add column is_buddy boolean not null default false,
  add column notify_channel text not null default 'none' check (notify_channel in ('none', 'email', 'push'));

grant update (is_buddy) on people to authenticated;

-- ---------------------------------------------------------------------------
-- Pairings and prompts
-- ---------------------------------------------------------------------------
create table buddy_pairings (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null references teams (id) on delete cascade,
  newcomer_id  uuid not null references people (id) on delete cascade,
  buddy_id     uuid not null references people (id) on delete cascade,
  via          text not null check (via in ('organiser', 'claimed')),
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  ended_at     timestamptz,
  check (newcomer_id <> buddy_id)
);

-- One current buddy per newcomer.
create unique index buddy_pairings_one_active on buddy_pairings (newcomer_id) where ended_at is null;
create index buddy_pairings_buddy_idx on buddy_pairings (buddy_id) where ended_at is null;

create table buddy_prompts (
  id           uuid primary key default gen_random_uuid(),
  pairing_id   uuid not null references buddy_pairings (id) on delete cascade,
  kind         text not null check (kind in ('invite_event')),
  due_at       timestamptz not null,
  done_at      timestamptz,
  notified_at  timestamptz,
  created_at   timestamptz not null default now()
);

create index buddy_prompts_due_idx on buddy_prompts (due_at) where done_at is null and notified_at is null;
create index buddy_prompts_pairing_idx on buddy_prompts (pairing_id);

-- A week after pairing: "Invite them to an upcoming event".
create or replace function private.create_buddy_prompts()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into buddy_prompts (pairing_id, kind, due_at)
  values (new.id, 'invite_event', new.created_at + interval '7 days');
  return new;
end;
$$;

create trigger buddy_pairings_prompts after insert on buddy_pairings
  for each row execute function private.create_buddy_prompts();

-- ---------------------------------------------------------------------------
-- Notifications (the bell) and phone push subscriptions
-- ---------------------------------------------------------------------------
create table notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  kind        text not null,
  title       text not null,
  body        text,
  url         text,
  created_at  timestamptz not null default now(),
  read_at     timestamptz
);

create index notifications_user_idx on notifications (user_id, created_at desc);

create table push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);

-- Server-only settings (e.g. the web push keys). No policies: only the
-- database owner and the server's service role can read it.
create table app_settings (
  name   text primary key,
  value  text not null
);

-- ---------------------------------------------------------------------------
-- Access rules
-- ---------------------------------------------------------------------------
create or replace function private.my_person_in_team(p_team_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select id from people where user_id = auth.uid() and team_id = p_team_id limit 1;
$$;

create or replace function private.can_see_pairing(p_pairing_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from buddy_pairings bp
    where bp.id = p_pairing_id
      and (private.is_team_organiser(bp.team_id) or private.is_my_person(bp.buddy_id))
  );
$$;

revoke execute on function private.my_person_in_team(uuid), private.can_see_pairing(uuid) from public, anon;
grant execute on function private.my_person_in_team(uuid), private.can_see_pairing(uuid) to authenticated;

alter table buddy_pairings enable row level security;
alter table buddy_prompts enable row level security;
alter table notifications enable row level security;
alter table push_subscriptions enable row level security;
alter table app_settings enable row level security;

create policy "organisers manage team pairings" on buddy_pairings
  for all to authenticated
  using (private.is_team_organiser(team_id))
  with check (private.is_team_organiser(team_id));

create policy "buddies read own pairings" on buddy_pairings
  for select to authenticated using (private.is_my_person(buddy_id));

create policy "see prompts for visible pairings" on buddy_prompts
  for select to authenticated using (private.can_see_pairing(pairing_id));

create policy "users read own notifications" on notifications
  for select to authenticated using (user_id = auth.uid());
create policy "users mark own notifications read" on notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "users manage own push subscriptions" on push_subscriptions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Buddy actions
-- ---------------------------------------------------------------------------

-- Everything the "Your buddies" section needs, in one call.
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

-- A buddy says "I'll be their buddy".
create or replace function public.claim_newcomer(p_newcomer_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_me people%rowtype;
  v_new people%rowtype;
begin
  select * into v_me from people where user_id = auth.uid() limit 1;
  if not found or not v_me.is_buddy then return 'not_a_buddy'; end if;
  select * into v_new from people where id = p_newcomer_id;
  if not found or v_new.team_id <> v_me.team_id or v_new.id = v_me.id then return 'not_found'; end if;
  if exists (select 1 from buddy_pairings where newcomer_id = p_newcomer_id and ended_at is null) then
    return 'taken';
  end if;
  insert into buddy_pairings (team_id, newcomer_id, buddy_id, via, created_by)
  values (v_me.team_id, p_newcomer_id, v_me.id, 'claimed', auth.uid());
  return 'ok';
end;
$$;

-- Tick off a prompt ("Invited them").
create or replace function public.complete_buddy_prompt(p_prompt_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update buddy_prompts set done_at = coalesce(done_at, now())
  where id = p_prompt_id and private.can_see_pairing(pairing_id);
  return found;
end;
$$;

-- Choose how to get reminders on top of the in-app bell.
create or replace function public.set_my_notify_channel(p_channel text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_channel not in ('none', 'email', 'push') then return false; end if;
  update people set notify_channel = p_channel where user_id = auth.uid();
  return found;
end;
$$;

-- The public half of the web push key pair (safe to share with browsers).
create or replace function public.get_vapid_public_key()
returns text language sql stable security definer set search_path = public as $$
  select value from app_settings where name = 'vapid_public_key';
$$;

revoke execute on function public.my_buddy_dashboard(), public.claim_newcomer(uuid),
  public.complete_buddy_prompt(uuid), public.set_my_notify_channel(text) from public, anon;
grant execute on function public.my_buddy_dashboard(), public.claim_newcomer(uuid),
  public.complete_buddy_prompt(uuid), public.set_my_notify_channel(text), public.get_vapid_public_key() to authenticated;
