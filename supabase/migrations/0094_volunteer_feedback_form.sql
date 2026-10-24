-- (Applied as volunteer_feedback_form.)
-- "Community social planned": removed for now.
update task_kinds set archived_at = now() where kind = 'com_community_event';
update tasks set dismissed_at = now() where kind = 'com_community_event' and done_at is null and dismissed_at is null;
update task_owners set ended_at = now() where kind = 'com_community_event' and ended_at is null;

-- A basic feedback form for volunteers: one secret link per community, no login.
alter table teams add column feedback_token text unique default encode(gen_random_bytes(12), 'hex');
update teams set feedback_token = encode(gen_random_bytes(12), 'hex') where feedback_token is null;

create table volunteer_feedback (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  rating smallint check (rating between 1 and 5),
  going_well text check (char_length(going_well) <= 2000),
  better text check (char_length(better) <= 2000),
  name text check (char_length(name) <= 100),
  created_at timestamptz not null default now()
);
alter table volunteer_feedback enable row level security;
create policy "core team read feedback" on volunteer_feedback for select to authenticated
  using (private.is_team_core(team_id));
create policy "core team remove feedback" on volunteer_feedback for delete to authenticated
  using (private.is_team_core(team_id));

create function public.feedback_form(p_token text)
returns table (team_name text) language sql stable security definer set search_path = public as $$
  select t.name from teams t where t.feedback_token = p_token and length(p_token) >= 20;
$$;
create function public.submit_feedback(p_token text, p_rating int, p_going_well text, p_better text, p_name text)
returns boolean language plpgsql security definer set search_path = public as $$
declare tid uuid;
begin
  select id into tid from teams where feedback_token = p_token and length(p_token) >= 20;
  if tid is null then return false; end if;
  if p_rating is null and coalesce(trim(p_going_well),'') = '' and coalesce(trim(p_better),'') = '' then return false; end if;
  if (select count(*) from volunteer_feedback where team_id = tid and created_at > now() - interval '1 day') >= 200 then return false; end if;
  insert into volunteer_feedback (team_id, rating, going_well, better, name)
  values (tid, case when p_rating between 1 and 5 then p_rating end,
          nullif(left(trim(p_going_well), 2000), ''), nullif(left(trim(p_better), 2000), ''), nullif(left(trim(p_name), 100), ''));
  return true;
end $$;
grant execute on function public.feedback_form(text) to anon, authenticated;
grant execute on function public.submit_feedback(text, int, text, text, text) to anon, authenticated;
