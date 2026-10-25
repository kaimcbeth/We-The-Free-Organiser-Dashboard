-- (Applied as how_they_found_us.) When someone started with We The Free and
-- how they found out about it (a person, Instagram, an outreach event…).
-- Organisers fill it in, or members add their own.
alter table people
  add column started_on date, -- first of the month they started
  add column found_via text check (found_via in
    ('person', 'outreach', 'instagram', 'facebook', 'tiktok', 'youtube', 'website', 'event_listing', 'other')),
  add column found_via_person_id uuid references people(id) on delete set null,
  add column found_via_note text check (char_length(found_via_note) <= 100);

create function public.set_person_origin(p_person_id uuid, p_started date, p_via text, p_via_person uuid, p_note text)
returns text language plpgsql security definer set search_path = public as $$
declare v_team uuid;
begin
  select team_id into v_team from people where id = p_person_id;
  if v_team is null then return 'not_found'; end if;
  if not (private.is_team_organiser(v_team) or private.is_my_person(p_person_id)) then return 'not_allowed'; end if;
  if p_via_person is not null and (p_via_person = p_person_id
     or not exists (select 1 from people where id = p_via_person and team_id = v_team)) then
    return 'bad_person';
  end if;
  update people set
    started_on = case when p_started is null then null else date_trunc('month', p_started)::date end,
    found_via = nullif(p_via, ''),
    found_via_person_id = case when p_via = 'person' then p_via_person end,
    found_via_note = nullif(left(trim(coalesce(p_note, '')), 100), '')
  where id = p_person_id;
  return 'ok';
end $$;
revoke execute on function public.set_person_origin(uuid, date, text, uuid, text) from public, anon;
grant execute on function public.set_person_origin(uuid, date, text, uuid, text) to authenticated;

-- For members choosing who told them: their community's organisers and Core Team.
create function public.my_team_crew()
returns table (id uuid, name text) language sql stable security definer set search_path = public as $$
  select p.id, trim(p.first_name || ' ' || coalesce(p.last_name, ''))
  from people me
  join people p on p.team_id = me.team_id and p.id <> me.id and not p.is_test
  where me.user_id = auth.uid()
    and (p.pending_role is not null
         or exists (select 1 from organisers o where o.id = p.user_id)
         or exists (select 1 from person_core_roles r where r.person_id = p.id and r.ended_at is null))
  order by 2;
$$;
revoke execute on function public.my_team_crew() from public, anon;
grant execute on function public.my_team_crew() to authenticated;

-- Merging duplicates keeps these too.
do $$
declare d text;
begin
  d := pg_get_functiondef('public.merge_people(uuid,uuid)'::regprocedure);
  d := replace(d, '  update gear_items set holder_person_id = p_keep where holder_person_id = p_drop;',
    '  update gear_items set holder_person_id = p_keep where holder_person_id = p_drop;
  update people set found_via_person_id = p_keep where found_via_person_id = p_drop;');
  d := replace(d, '    away_until = greatest(k.away_until, d.away_until)',
    '    away_until = greatest(k.away_until, d.away_until),
    started_on = coalesce(k.started_on, d.started_on),
    found_via = coalesce(k.found_via, d.found_via),
    found_via_person_id = case when k.found_via is null then d.found_via_person_id else k.found_via_person_id end,
    found_via_note = coalesce(k.found_via_note, d.found_via_note)');
  if d not like '%found_via_note = coalesce%' or d not like '%found_via_person_id = p_keep%' then raise exception 'pattern not found'; end if;
  execute d;
end $$;
