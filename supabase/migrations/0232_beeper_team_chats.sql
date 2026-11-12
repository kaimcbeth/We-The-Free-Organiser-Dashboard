-- Organiser chats: a third kind, "WTF team" (Kai, 13 Nov 2026: "Need another
-- category for WTF team members"). Like organiser chats (messages kept, replies
-- from the Hub) but no community and no check-in ticking.

alter table public.beeper_chats drop constraint if exists beeper_chats_tag_check;
alter table public.beeper_chats add constraint beeper_chats_tag_check
  check (tag in ('organiser', 'team', 'other'));

create or replace function public.beeper_tag_chat(p_chat text, p_tag text, p_team uuid default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not private.can_use_beeper() then raise exception 'not allowed'; end if;
  if p_tag is not null and p_tag not in ('organiser', 'team', 'other') then raise exception 'bad tag'; end if;
  update beeper_chats
     set tag = p_tag,
         team_id = case when p_tag = 'organiser' then p_team else null end,
         messages_synced_at = case when p_tag in ('organiser', 'team') then messages_synced_at else null end,
         preview = case when p_tag in ('organiser', 'team') then preview else null end,
         preview_mine = case when p_tag in ('organiser', 'team') then preview_mine else null end
   where user_id = auth.uid() and chat_id = p_chat;
  if p_tag is null or p_tag not in ('organiser', 'team') then
    delete from beeper_messages where user_id = auth.uid() and chat_id = p_chat;
  end if;
end $$;

create or replace function public.beeper_send(p_chat text, p_body text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if not private.can_use_beeper() then raise exception 'not allowed'; end if;
  if not exists (select 1 from beeper_chats where user_id = auth.uid() and chat_id = p_chat and tag in ('organiser', 'team')) then
    raise exception 'only organiser or WTF team chats';
  end if;
  insert into beeper_outbox (user_id, chat_id, body) values (auth.uid(), p_chat, trim(p_body)) returning id into v;
  return v;
end $$;

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
             preview = case when v_tag in ('organiser', 'team') then left(c->'preview'->>'text', 300) else null end,
             preview_mine = case when v_tag in ('organiser', 'team') then (c->'preview'->>'isSender')::boolean else null end
       where user_id = v_user and chat_id = c->>'id';
    end if;
  end loop;

  for m in select * from jsonb_array_elements(coalesce(p_messages, '[]')) loop
    select tag, team_id into v_tag, v_team from beeper_chats where user_id = v_user and chat_id = m->>'chatID';
    continue when v_tag is null or v_tag not in ('organiser', 'team');
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
     where user_id = v_user and tag in ('organiser', 'team')
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
