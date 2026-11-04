-- Engagement pod (Kai, 5 Nov 2026).
--
-- Members who say yes to the "Engage with our posts" micro role are the
-- community's engagement pod. Organisers and Core Team share a Facebook post
-- (usually a newcomer's post in an outside vegan group; Facebook doesn't let
-- apps watch those groups, so a person shares the link) and every pod member
-- gets a "Post liked and commented on" action with the link. A weekly
-- "Posts shared in the engagement pod" action reminds organisers to look.
-- The community's pod WhatsApp chat link is optional (teams.pod_whatsapp_url).

alter table teams add column if not exists pod_whatsapp_url text;

create table pod_posts (
  id             uuid primary key default gen_random_uuid(),
  team_id        uuid not null references teams (id) on delete cascade,
  url            text not null,
  note           text,
  shared_by      uuid references auth.users (id) on delete set null,
  shared_by_name text,
  created_at     timestamptz not null default now()
);
create index pod_posts_team_idx on pod_posts (team_id, created_at desc);
alter table pod_posts enable row level security;
create policy "team reads pod posts" on pod_posts for select to authenticated
  using (private.is_team_member(team_id) or private.is_team_core(team_id));

alter table tasks add column if not exists pod_post_id uuid references pod_posts (id) on delete cascade;
create index if not exists tasks_pod_post_idx on tasks (pod_post_id) where pod_post_id is not null;

alter table task_kinds drop constraint task_kinds_schedule_check;
alter table task_kinds add constraint task_kinds_schedule_check check (schedule = any (array[
  'event', 'weekly', 'monthly', 'quarterly', 'newcomer', 'month_end', 'follow_up', 'special', 'weather', 'birthday', 'pod']));

-- Weekly for organisers (made by private.create_monthly_tasks like other
-- weekly actions, Monday, due Thursday). Off by default; switched on for a
-- community when its first pod member joins (trigger below), so communities
-- without a pod never see it. Organisers can switch it off in Choose actions.
insert into task_kinds (kind, title, description, blurb, estimate_minutes, estimate_max_minutes, due_after_hours, sort_order,
                        anchor, appear_hours, audience, schedule, schedule_weekday, core_role, default_enabled, late_ok)
values ('com_engagement_pod', 'Posts shared in the engagement pod',
        'Have a look through the vegan Facebook groups for posts by people from your community, especially newcomers (a first post, a question, a win), and share each one with the engagement pod so it gets likes and friendly comments.',
        'Share community members'' Facebook posts with the engagement pod',
        5, 15, 0, 46, 'end', 0, 'community', 'weekly', 1, 'community_lead', false, false),
       ('pod_boost', 'Post liked and commented on',
        'Someone from the community posted in a Facebook group. Give it a like and a friendly comment in your own words (not copy-paste) to cheer them on.',
        'Like and comment on a post shared with the engagement pod',
        2, null, 24, 47, 'end', 0, 'community', 'pod', null, null, true, true)
on conflict (kind) do nothing;

update micro_roles
set title = 'Engage with our posts',
    blurb = 'Join the engagement pod: like and comment on posts by people from the community, like a newcomer''s first post in a vegan Facebook group, so they feel welcome. You''ll get an action each time there''s one to cheer on.'
where key = 'engage_posts';

-- Joining the pod switches the weekly action on for the community (once:
-- an organiser who switched it off stays off). Leaving clears that person's
-- open pod actions.
create or replace function private.pod_member_changed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('INSERT', 'UPDATE') and new.role_key = 'engage_posts' and new.status = 'active' then
    insert into team_task_kinds (team_id, kind, enabled)
    values (new.team_id, 'com_engagement_pod', true)
    on conflict (team_id, kind) do nothing;
  end if;
  if tg_op = 'DELETE' and old.role_key = 'engage_posts' then
    update tasks set dismissed_at = now()
    where kind = 'pod_boost' and assigned_to = old.person_id
      and done_at is null and dismissed_at is null;
  end if;
  return null;
end $$;
create or replace trigger member_micro_roles_pod
  after insert or update or delete on member_micro_roles
  for each row execute function private.pod_member_changed();

-- Organisers and Core Team: share a post with the pod.
create or replace function public.share_pod_post(p_team_id uuid, p_url text, p_note text)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_url text := trim(coalesce(p_url, ''));
  v_note text := nullif(left(trim(coalesce(p_note, '')), 300), '');
  v_me uuid; v_name text; v_post uuid; v_sent int;
begin
  if p_team_id is null or not private.is_team_core(p_team_id) then
    return json_build_object('error', 'not_allowed');
  end if;
  if v_url !~* '^https?://([a-z0-9-]+\.)*(facebook\.com|fb\.com|fb\.watch|fb\.me)(/|$)' then
    return json_build_object('error', 'not_facebook');
  end if;
  select id, first_name into v_me, v_name from people where user_id = auth.uid() limit 1;
  if v_name is null then
    select split_part(name, ' ', 1) into v_name from organisers where id = auth.uid();
  end if;

  insert into pod_posts (team_id, url, note, shared_by, shared_by_name)
  values (p_team_id, v_url, v_note, auth.uid(), v_name)
  returning id into v_post;

  with pod as (
    select p.id, p.user_id
    from member_micro_roles m
    join people p on p.id = m.person_id
    where m.team_id = p_team_id and m.role_key = 'engage_posts' and m.status = 'active'
      and p.user_id is not null and not p.is_test
      and p.id is distinct from v_me
  ), made as (
    insert into tasks (team_id, kind, period, due_at, assigned_to, pod_post_id)
    select p_team_id, 'pod_boost', 'pod:' || v_post || ':' || pod.id, now() + interval '24 hours', pod.id, v_post
    from pod
    returning id, assigned_to
  ), notified as (
    insert into notifications (user_id, kind, title, body, url, task_id)
    select pod.user_id, 'task', 'A post to cheer on',
           coalesce(v_note, 'Give it a like and a friendly comment.'), '/me#tasks', made.id
    from made join pod on pod.id = made.assigned_to
    returning 1
  )
  select count(*) into v_sent from notified;

  -- Sharing a post ticks off this week's "Posts shared in the engagement pod".
  update tasks set done_at = now(), done_by = auth.uid()
  where team_id = p_team_id and kind = 'com_engagement_pod'
    and done_at is null and dismissed_at is null
    and (show_from is null or show_from <= now());

  return json_build_object('id', v_post, 'sent', v_sent);
end $$;

-- Organisers and Core Team: the pod and the last fortnight's posts, with how
-- many pod members have done each one.
create or replace function public.pod_overview(p_team_id uuid)
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if p_team_id is null or not private.is_team_core(p_team_id) then return null; end if;
  return json_build_object(
    'chat', (select pod_whatsapp_url from teams where id = p_team_id),
    'members', coalesce((
      select json_agg(trim(p.first_name || ' ' || coalesce(left(p.last_name, 1), '')) order by p.first_name)
      from member_micro_roles m join people p on p.id = m.person_id
      where m.team_id = p_team_id and m.role_key = 'engage_posts' and m.status = 'active'
        and not p.is_test), '[]'::json),
    'posts', coalesce((
      select json_agg(json_build_object(
        'id', x.id, 'url', x.url, 'note', x.note, 'by', x.shared_by_name,
        'at', x.created_at, 'sent', x.sent, 'done', x.done) order by x.created_at desc)
      from (
        select pp.*, count(t.id) sent, count(t.done_at) done
        from pod_posts pp left join tasks t on t.pod_post_id = pp.id
        where pp.team_id = p_team_id and pp.created_at > now() - interval '14 days'
        group by pp.id
        order by pp.created_at desc limit 20
      ) x), '[]'::json));
end $$;

-- Organisers: the pod's WhatsApp chat invite link (blank clears it).
create or replace function public.set_pod_chat(p_team_id uuid, p_url text)
returns text language plpgsql security definer set search_path = public as $$
declare v text := nullif(trim(coalesce(p_url, '')), '');
begin
  if p_team_id is null or not private.is_team_organiser(p_team_id) then return 'not_allowed'; end if;
  if v is not null and v !~* '^https://(chat\.whatsapp\.com|wa\.me|whatsapp\.com)/' then
    return 'not_whatsapp';
  end if;
  update teams set pod_whatsapp_url = v where id = p_team_id;
  return 'ok';
end $$;

-- Undone pod actions go away after 3 days (the moment has passed).
create or replace function private.tidy_pod_tasks()
returns int language sql security definer set search_path = public as $$
  with d as (
    update tasks set dismissed_at = now()
    where kind = 'pod_boost' and done_at is null and dismissed_at is null
      and created_at < now() - interval '3 days'
    returning 1)
  select count(*)::int from d;
$$;
select cron.schedule('pod-tidy', '23 * * * *', $$select private.tidy_pod_tasks()$$);

revoke all on function public.share_pod_post(uuid, text, text), public.pod_overview(uuid),
  public.set_pod_chat(uuid, text) from public, anon;
grant execute on function public.share_pod_post(uuid, text, text), public.pod_overview(uuid),
  public.set_pod_chat(uuid, text) to authenticated;
revoke all on function private.pod_member_changed(), private.tidy_pod_tasks() from public, anon;
