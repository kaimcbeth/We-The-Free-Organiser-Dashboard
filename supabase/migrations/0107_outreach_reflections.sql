-- (Applied as outreach_reflections.) The Outreach guide: a 10-second
-- reflection after each street conversation (how it went, where it got
-- stuck, which objection), for the volunteer's own shift summary and impact,
-- and their organisers' insights.
create table outreach_reflections (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  event_id uuid references events(id) on delete set null,
  outcome text not null check (outcome in ('committed', 'good', 'tough')),
  stuck text check (stuck in ('awareness', 'accountability', 'action', 'objection', 'none')),
  objection text check (char_length(objection) <= 40),
  created_at timestamptz not null default now()
);
create index outreach_reflections_person_idx on outreach_reflections (person_id, created_at desc);
create index outreach_reflections_team_idx on outreach_reflections (team_id, created_at desc);
alter table outreach_reflections enable row level security;
create policy "members add own reflections" on outreach_reflections for insert to authenticated
  with check (private.is_my_person(person_id)
              and team_id = (select team_id from people where id = person_id));
create policy "members read own reflections" on outreach_reflections for select to authenticated
  using (private.is_my_person(person_id));
create policy "members remove own reflections" on outreach_reflections for delete to authenticated
  using (private.is_my_person(person_id));
create policy "core team read reflections" on outreach_reflections for select to authenticated
  using (private.is_team_core(team_id));

-- Today's outreach event in my community (to file reflections against).
create function public.my_outreach_today()
returns uuid language sql stable security definer set search_path = public as $$
  select e.id from people me
  join events e on e.team_id = me.team_id
  join event_types et on et.id = e.event_type_id and et.counts_as_outreach
  where me.user_id = auth.uid()
    and e.starts_at between now() - interval '12 hours' and now() + interval '12 hours'
  order by abs(extract(epoch from (e.starts_at - now())))
  limit 1;
$$;
revoke execute on function public.my_outreach_today() from public, anon;
grant execute on function public.my_outreach_today() to authenticated;
