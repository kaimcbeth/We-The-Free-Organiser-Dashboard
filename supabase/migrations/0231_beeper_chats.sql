-- Organiser chats through Beeper (Kai, 13 Nov 2026: "responding to messages
-- as an RSL", "I can mark which chats are organisers and which are not").
--
-- Beeper Desktop's API only answers on the computer it runs on, so a small
-- helper on that computer (public/beeper/relay.js, installed from
-- /chats/setup) syncs with these functions every minute using a link token.
-- Privacy: for chats not marked as organiser chats we keep only the title,
-- network and times, never message text. Messages are kept only for
-- organiser chats (last 40 per chat).

create table if not exists public.beeper_links (
  user_id uuid primary key references auth.users on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  helper_version text
);
alter table public.beeper_links enable row level security;
drop policy if exists "own beeper link" on public.beeper_links;
create policy "own beeper link" on public.beeper_links
  for select to authenticated using (user_id = auth.uid());

create table if not exists public.beeper_chats (
  user_id uuid not null references auth.users on delete cascade,
  chat_id text not null,
  account_id text,
  network text,
  title text not null default '',
  chat_type text,
  last_activity timestamptz,
  unread int not null default 0,
  last_mine_at timestamptz,
  last_theirs_at timestamptz,
  preview text, -- organiser chats only
  preview_mine boolean,
  tag text check (tag in ('organiser', 'other')),
  team_id uuid references public.teams on delete set null,
  messages_synced_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, chat_id)
);
alter table public.beeper_chats enable row level security;
drop policy if exists "own beeper chats" on public.beeper_chats;
create policy "own beeper chats" on public.beeper_chats
  for select to authenticated using (user_id = auth.uid());

create table if not exists public.beeper_messages (
  user_id uuid not null references auth.users on delete cascade,
  chat_id text not null,
  message_id text not null,
  sender_name text,
  is_mine boolean not null default false,
  body text,
  has_attachment boolean not null default false,
  sent_at timestamptz not null,
  primary key (user_id, chat_id, message_id)
);
create index if not exists beeper_messages_chat_idx
  on public.beeper_messages (user_id, chat_id, sent_at desc);
alter table public.beeper_messages enable row level security;
drop policy if exists "own beeper messages" on public.beeper_messages;
create policy "own beeper messages" on public.beeper_messages
  for select to authenticated using (user_id = auth.uid());

create table if not exists public.beeper_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  chat_id text not null,
  body text not null check (length(body) between 1 and 8000),
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed')),
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
alter table public.beeper_outbox enable row level security;
drop policy if exists "own beeper outbox" on public.beeper_outbox;
create policy "own beeper outbox" on public.beeper_outbox
  for select to authenticated using (user_id = auth.uid());

-- Who can use it: Regional Support Leads and God.
create or replace function private.can_use_beeper()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from organisers o
    where o.id = auth.uid()
      and (o.access in ('god', 'regional_lead') or o.lead_region_id is not null)
  );
$$;

-- Make (or remake) the link token for the helper. Returns the token.
create or replace function public.beeper_new_link()
returns text language plpgsql security definer set search_path = public as $$
declare v text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  if not private.can_use_beeper() then raise exception 'not allowed'; end if;
  insert into beeper_links (user_id, token) values (auth.uid(), v)
  on conflict (user_id) do update set token = excluded.token, created_at = now(), last_seen_at = null;
  return v;
end $$;

-- Disconnect: forget the token and everything synced.
create or replace function public.beeper_unlink()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from beeper_outbox where user_id = auth.uid();
  delete from beeper_messages where user_id = auth.uid();
  delete from beeper_chats where user_id = auth.uid();
  delete from beeper_links where user_id = auth.uid();
end $$;

-- Mark a chat: 'organiser' (optionally with its community), 'other', or null.
create or replace function public.beeper_tag_chat(p_chat text, p_tag text, p_team uuid default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not private.can_use_beeper() then raise exception 'not allowed'; end if;
  if p_tag is not null and p_tag not in ('organiser', 'other') then raise exception 'bad tag'; end if;
  update beeper_chats
     set tag = p_tag,
         team_id = case when p_tag = 'organiser' then p_team else null end,
         messages_synced_at = case when p_tag = 'organiser' then messages_synced_at else null end,
         preview = case when p_tag = 'organiser' then preview else null end,
         preview_mine = case when p_tag = 'organiser' then preview_mine else null end
   where user_id = auth.uid() and chat_id = p_chat;
  if p_tag is distinct from 'organiser' then
    delete from beeper_messages where user_id = auth.uid() and chat_id = p_chat;
  end if;
end $$;

-- Queue a reply; the helper sends it within a minute.
create or replace function public.beeper_send(p_chat text, p_body text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if not private.can_use_beeper() then raise exception 'not allowed'; end if;
  if not exists (select 1 from beeper_chats where user_id = auth.uid() and chat_id = p_chat and tag = 'organiser') then
    raise exception 'only organiser chats';
  end if;
  insert into beeper_outbox (user_id, chat_id, body) values (auth.uid(), p_chat, trim(p_body)) returning id into v;
  return v;
end $$;

-- Tick the community's open "Organisers checked in with" action when the RSL
-- has messaged its organiser since the action appeared.
create or replace function private.beeper_tick_checkin(p_user uuid, p_team uuid, p_at timestamptz)
returns void language sql security definer set search_path = public as $$
  update tasks t
     set done_at = now(), done_by = p_user,
         note = coalesce(t.note || ' ', '') || 'Ticked when you messaged them through Organiser chats.'
   where t.team_id = p_team
     and t.kind = 'connect_organisers'
     and t.done_at is null and t.dismissed_at is null
     and p_at >= coalesce(t.show_from, t.created_at);
$$;

-- The helper's one call. p_chats: [{id, accountID, network, title, type,
-- lastActivity, unreadCount, preview: {text, isSender, timestamp}}].
-- p_messages: [{chatID, id, senderName, isSender, text, timestamp, hasAttachment}].
-- p_sent: [{id, ok, error}]. Returns {want: [chat ids to send messages for],
-- outbox: [{id, chat, body}]}.
create or replace function public.beeper_sync(
  p_token text, p_chats jsonb default '[]', p_messages jsonb default '[]',
  p_sent jsonb default '[]', p_version text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user uuid;
  c jsonb;
  m jsonb;
  s jsonb;
  v_last timestamptz;
  v_team uuid;
  v_tag text;
  v_out jsonb;
  v_want jsonb;
begin
  select user_id into v_user from beeper_links where token = p_token;
  if v_user is null then raise exception 'unknown link'; end if;
  update beeper_links set last_seen_at = now(), helper_version = coalesce(p_version, helper_version)
   where user_id = v_user;

  for c in select * from jsonb_array_elements(coalesce(p_chats, '[]')) loop
    select tag into v_tag from beeper_chats where user_id = v_user and chat_id = c->>'id';
    insert into beeper_chats (user_id, chat_id, account_id, network, title, chat_type,
                              last_activity, unread, updated_at)
    values (v_user, c->>'id', c->>'accountID', c->>'network', left(coalesce(c->>'title', ''), 200),
            c->>'type', (c->>'lastActivity')::timestamptz, coalesce((c->>'unreadCount')::int, 0), now())
    on conflict (user_id, chat_id) do update
      set account_id = excluded.account_id, network = excluded.network, title = excluded.title,
          chat_type = excluded.chat_type, last_activity = excluded.last_activity,
          unread = excluded.unread, updated_at = now();
    if c ? 'preview' and jsonb_typeof(c->'preview') = 'object' then
      v_last := (c->'preview'->>'timestamp')::timestamptz;
      update beeper_chats
         set last_mine_at = case when (c->'preview'->>'isSender')::boolean
                                 then greatest(coalesce(last_mine_at, v_last), v_last) else last_mine_at end,
             last_theirs_at = case when not coalesce((c->'preview'->>'isSender')::boolean, false)
                                   then greatest(coalesce(last_theirs_at, v_last), v_last) else last_theirs_at end,
             preview = case when v_tag = 'organiser' then left(c->'preview'->>'text', 300) else null end,
             preview_mine = case when v_tag = 'organiser' then (c->'preview'->>'isSender')::boolean else null end
       where user_id = v_user and chat_id = c->>'id';
    end if;
  end loop;

  for m in select * from jsonb_array_elements(coalesce(p_messages, '[]')) loop
    select tag, team_id into v_tag, v_team from beeper_chats where user_id = v_user and chat_id = m->>'chatID';
    continue when v_tag is distinct from 'organiser';
    insert into beeper_messages (user_id, chat_id, message_id, sender_name, is_mine, body, has_attachment, sent_at)
    values (v_user, m->>'chatID', m->>'id', left(m->>'senderName', 120),
            coalesce((m->>'isSender')::boolean, false), left(m->>'text', 8000),
            coalesce((m->>'hasAttachment')::boolean, false), (m->>'timestamp')::timestamptz)
    on conflict (user_id, chat_id, message_id) do update
      set body = excluded.body, sender_name = excluded.sender_name;
    v_last := (m->>'timestamp')::timestamptz;
    if coalesce((m->>'isSender')::boolean, false) then
      update beeper_chats set last_mine_at = greatest(coalesce(last_mine_at, v_last), v_last)
       where user_id = v_user and chat_id = m->>'chatID';
      if v_team is not null then perform private.beeper_tick_checkin(v_user, v_team, v_last); end if;
    else
      update beeper_chats set last_theirs_at = greatest(coalesce(last_theirs_at, v_last), v_last)
       where user_id = v_user and chat_id = m->>'chatID';
    end if;
  end loop;
  -- Chats whose messages were just sent count as synced; keep the newest 40.
  update beeper_chats set messages_synced_at = now()
   where user_id = v_user
     and chat_id in (select distinct x->>'chatID' from jsonb_array_elements(coalesce(p_messages, '[]')) x);
  delete from beeper_messages bm
   where bm.user_id = v_user
     and bm.message_id in (
       select message_id from (
         select message_id, row_number() over (partition by chat_id order by sent_at desc) rn
         from beeper_messages where user_id = v_user) r
       where r.rn > 40);

  for s in select * from jsonb_array_elements(coalesce(p_sent, '[]')) loop
    update beeper_outbox
       set status = case when (s->>'ok')::boolean then 'sent' else 'failed' end,
           error = left(s->>'error', 300),
           sent_at = case when (s->>'ok')::boolean then now() else null end
     where id = (s->>'id')::uuid and user_id = v_user;
    if (s->>'ok')::boolean then
      select bc.team_id into v_team from beeper_outbox o
        join beeper_chats bc on bc.user_id = o.user_id and bc.chat_id = o.chat_id
       where o.id = (s->>'id')::uuid;
      update beeper_chats bc set last_mine_at = now(), messages_synced_at = null
        from beeper_outbox o where o.id = (s->>'id')::uuid and bc.user_id = o.user_id and bc.chat_id = o.chat_id;
      if v_team is not null then perform private.beeper_tick_checkin(v_user, v_team, now()); end if;
    end if;
  end loop;

  -- Messages wanted: organiser chats with activity newer than the last sync.
  select coalesce(jsonb_agg(chat_id), '[]') into v_want from (
    select chat_id from beeper_chats
     where user_id = v_user and tag = 'organiser'
       and (messages_synced_at is null or last_activity > messages_synced_at)
     order by last_activity desc nulls last limit 15) w;

  -- Waiting messages (a 'sending' one older than 3 minutes is tried again).
  with picked as (
    update beeper_outbox set status = 'sending'
     where user_id = v_user
       and (status = 'queued' or (status = 'sending' and created_at < now() - interval '3 minutes'))
       and created_at > now() - interval '1 day'
    returning id, chat_id, body, created_at)
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'chat', chat_id, 'body', body) order by created_at), '[]')
    into v_out from picked;

  return jsonb_build_object('want', v_want, 'outbox', v_out);
end $$;

revoke all on function public.beeper_sync(text, jsonb, jsonb, jsonb, text) from public;
grant execute on function public.beeper_sync(text, jsonb, jsonb, jsonb, text) to anon, authenticated;
revoke all on function public.beeper_new_link() from public, anon;
grant execute on function public.beeper_new_link() to authenticated;
revoke all on function public.beeper_unlink() from public, anon;
grant execute on function public.beeper_unlink() to authenticated;
revoke all on function public.beeper_tag_chat(text, text, uuid) from public, anon;
grant execute on function public.beeper_tag_chat(text, text, uuid) to authenticated;
revoke all on function public.beeper_send(text, text) from public, anon;
grant execute on function public.beeper_send(text, text) to authenticated;
revoke all on function private.beeper_tick_checkin(uuid, uuid, timestamptz) from public, anon, authenticated;

-- Whether Beeper itself answered on the helper's last run (the helper keeps
-- checking in while Beeper is closed or its token is wrong).
alter table public.beeper_links add column if not exists beeper_ok boolean;
alter table public.beeper_links add column if not exists beeper_error text;
create or replace function public.beeper_status(p_token text, p_ok boolean, p_error text default null)
returns void language sql security definer set search_path = public as $$
  update beeper_links set beeper_ok = p_ok, beeper_error = left(p_error, 300), last_seen_at = now()
   where token = p_token;
$$;
revoke all on function public.beeper_status(text, boolean, text) from public;
grant execute on function public.beeper_status(text, boolean, text) to anon, authenticated;
