-- Trainings for members (How you can help → Training).
--
-- One recommended training at a time: the first one they've unlocked (by
-- events, like micro roles) and haven't done. "I've done this" moves on to
-- the next. Their Events page shows a one-line nudge for it; "Not now" hides
-- the nudge for 30 days, so it comes back about once a month.

create table trainings (
  key          text primary key,
  title        text not null,
  blurb        text not null,
  url          text not null,
  min_events   int not null,
  sort_order   int not null
);

insert into trainings (key, title, blurb, url, min_events, sort_order) values
  ('ibc_masterclass', 'IBC Masterclass',
   'How to stop debating and start coaching: the 15 questions, handling objections, role plays and an AI practice tool.',
   'https://activism.wtf/ibc/masterclass', 3, 1);

alter table trainings enable row level security;
create policy trainings_read on trainings for select to authenticated using (true);

create table member_trainings (
  person_id      uuid not null references people (id) on delete cascade,
  training_key   text not null references trainings (key) on delete cascade,
  done_at        timestamptz,
  snoozed_until  timestamptz,
  primary key (person_id, training_key)
);
alter table member_trainings enable row level security;

create or replace function public.my_trainings()
returns json language plpgsql stable security definer set search_path = public as $$
declare v_person uuid; v_events int;
begin
  select id into v_person from people where user_id = auth.uid() limit 1;
  if v_person is null then return null; end if;
  v_events := private.micro_role_events(v_person);
  return json_build_object(
    'events', v_events,
    'trainings', coalesce((
      select json_agg(json_build_object(
        'key', t.key, 'title', t.title, 'blurb', t.blurb, 'url', t.url,
        'min_events', t.min_events, 'done_at', m.done_at,
        'snoozed', coalesce(m.snoozed_until > now(), false)) order by t.sort_order)
      from trainings t
      left join member_trainings m on m.training_key = t.key and m.person_id = v_person
    ), '[]'::json));
end $$;

-- p_action: 'done', 'undo' (not done after all) or 'snooze' (30 days).
create or replace function public.set_my_training(p_key text, p_action text)
returns text language plpgsql security definer set search_path = public as $$
declare v_person uuid;
begin
  select id into v_person from people where user_id = auth.uid() limit 1;
  if v_person is null then return 'not_allowed'; end if;
  if not exists (select 1 from trainings where key = p_key) then return 'unknown'; end if;
  insert into member_trainings (person_id, training_key) values (v_person, p_key)
  on conflict do nothing;
  update member_trainings set
    done_at = case p_action when 'done' then now() when 'undo' then null else done_at end,
    snoozed_until = case when p_action = 'snooze' then now() + interval '30 days' else snoozed_until end
  where person_id = v_person and training_key = p_key;
  return 'ok';
end $$;

-- Organisers: who has done which training in their community.
create or replace function public.team_trainings(p_team_id uuid)
returns table (person_id uuid, training_key text, done_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.person_id, m.training_key, m.done_at
  from member_trainings m join people p on p.id = m.person_id
  where p.team_id = p_team_id and m.done_at is not null
    and private.is_team_organiser(p_team_id);
$$;

revoke execute on function public.my_trainings(), public.set_my_training(text, text),
  public.team_trainings(uuid) from public, anon;
grant execute on function public.my_trainings(), public.set_my_training(text, text),
  public.team_trainings(uuid) to authenticated;
