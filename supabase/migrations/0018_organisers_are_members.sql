-- Every organiser is also a member: they get a profile in their team's people
-- list, linked to their login (so they show on attendance lists, have an
-- event history and photo, and can be buddies). Made automatically when an
-- organiser is added, and once now for existing organisers.

create or replace function private.ensure_organiser_member()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_first text := split_part(trim(new.name), ' ', 1);
  v_last text := nullif(trim(substr(trim(new.name), length(split_part(trim(new.name), ' ', 1)) + 1)), '');
begin
  if not exists (select 1 from people where user_id = new.id) then
    insert into people (team_id, first_name, last_name, email, user_id, linked_at, linked_via, added_via)
    values (new.team_id, coalesce(nullif(v_first, ''), 'Organiser'), v_last, new.email, new.id, now(), 'self_signup', 'self_signup');
  end if;
  return new;
end;
$$;

create trigger organisers_are_members after insert on organisers
  for each row execute function private.ensure_organiser_member();

-- Existing organisers without a profile.
insert into people (team_id, first_name, last_name, email, user_id, linked_at, linked_via, added_via)
select o.team_id,
       coalesce(nullif(split_part(trim(o.name), ' ', 1), ''), 'Organiser'),
       nullif(trim(substr(trim(o.name), length(split_part(trim(o.name), ' ', 1)) + 1)), ''),
       o.email, o.id, now(), 'self_signup', 'self_signup'
from organisers o
where not exists (select 1 from people p where p.user_id = o.id);
