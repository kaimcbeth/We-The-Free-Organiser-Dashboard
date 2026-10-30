-- Two feedback forms in Resources:
-- 1. Organisers -> their Regional Support Lead (organiser_feedback). With no
--    RSL for the region yet, God accounts get it.
-- 2. Members -> their organisers, by a shareable link (/tell/<feedback_token>,
--    no login): one box, name optional. Lands with the rest of the volunteer
--    feedback and notifies the organisers.

create table if not exists public.organiser_feedback (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete set null,
  region_id uuid references regions(id) on delete set null,
  name text check (char_length(name) <= 100), -- null: anonymous
  message text not null check (char_length(message) between 2 and 20000),
  created_at timestamptz not null default now()
);
alter table public.organiser_feedback enable row level security;
create policy "leads read their region's organiser feedback" on public.organiser_feedback for select
  to authenticated using (
    private.is_god() or (region_id is not null and private.is_region_lead(region_id)));

create or replace function public.send_organiser_feedback(p_message text, p_anonymous boolean)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_msg text := left(trim(coalesce(p_message, '')), 20000);
  v_team uuid;
  v_region uuid;
  v_name text;
  v_pname text;
  v_where text;
begin
  if char_length(v_msg) < 2 then return 'empty'; end if;
  select coalesce(o.organiser_team_id, o.team_id), coalesce(o.lead_region_id, o.region_id), o.name
    into v_team, v_region, v_name
  from organisers o where o.id = auth.uid();
  if not found then return 'not_allowed'; end if;
  select trim(p.first_name || ' ' || coalesce(p.last_name, '')) into v_pname
  from people p where p.user_id = auth.uid() limit 1;
  v_name := coalesce(v_pname, v_name);
  if v_team is not null then
    select t.region_id, regexp_replace(t.name, ', (Australia|New Zealand)$', '') into v_region, v_where
    from teams t where t.id = v_team;
  end if;
  insert into organiser_feedback (team_id, region_id, name, message)
  values (v_team, v_region, case when p_anonymous then null else trim(v_name) end, v_msg);
  insert into notifications (user_id, kind, title, body, url)
  select o.id, 'feedback',
         case when p_anonymous then 'Anonymous organiser feedback' else 'Organiser feedback from ' || trim(v_name) end
           || coalesce(' (' || v_where || ')', ''),
         left(v_msg, 300) || case when char_length(v_msg) > 300 then '…' else '' end,
         '/feedback-inbox?from=organisers'
  from organisers o
  where (o.access = 'regional_lead' and o.region_id = v_region)
     or (o.access = 'god' and (o.lead_region_id = v_region
         or not exists (select 1 from organisers x where x.access = 'regional_lead' and x.region_id = v_region)));
  return 'ok';
end $$;
revoke execute on function public.send_organiser_feedback(text, boolean) from public, anon;
grant execute on function public.send_organiser_feedback(text, boolean) to authenticated;

-- Members' open feedback by link (no login).
create or replace function public.submit_open_feedback(p_token text, p_message text, p_name text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  tid uuid;
  v_msg text := left(trim(coalesce(p_message, '')), 20000);
  v_name text := nullif(left(trim(coalesce(p_name, '')), 100), '');
begin
  select id into tid from teams where feedback_token = p_token and length(p_token) >= 20;
  if tid is null or char_length(v_msg) < 2 then return false; end if;
  -- Light flood guard: 200 a day per community.
  if (select count(*) from volunteer_feedback where team_id = tid and created_at > now() - interval '1 day') >= 200 then
    return false;
  end if;
  insert into volunteer_feedback (team_id, message, name) values (tid, v_msg, v_name);
  insert into notifications (user_id, kind, title, body, url)
  select o.id, 'feedback',
         case when v_name is null then 'Anonymous feedback' else 'Feedback from ' || v_name end,
         left(v_msg, 300) || case when char_length(v_msg) > 300 then '…' else '' end,
         '/feedback-inbox'
  from organisers o
  where (o.access = 'organiser' and o.team_id = tid)
     or (o.access = 'god' and o.organiser_team_id = tid);
  return true;
end $$;
grant execute on function public.submit_open_feedback(text, text, text) to anon, authenticated;

-- The community's share link token (organisers).
create or replace function public.team_feedback_token(p_team_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select feedback_token from teams where id = p_team_id and private.is_team_organiser(p_team_id);
$$;
revoke execute on function public.team_feedback_token(uuid) from public, anon;
grant execute on function public.team_feedback_token(uuid) to authenticated;
