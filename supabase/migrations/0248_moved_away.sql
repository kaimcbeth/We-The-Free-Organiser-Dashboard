-- Moved away (Kai, 19 Nov 2026: "Anthony moved out of the country so need an option for this").
-- people.moved_away_at: left off every message list (quiet members, regulars,
-- invites, thanks), never gets a reconnect action, open ones are dismissed.
alter table public.people add column if not exists moved_away_at timestamptz;
do $$
declare d text;
begin
  d := pg_get_functiondef('private.create_reconnect_tasks'::regproc);
  if position('moved_away_at' in d) = 0 then
    d := replace(d, '    where not p.is_test' || chr(10) || '      and extract(hour', '    where not p.is_test and p.moved_away_at is null' || chr(10) || '      and extract(hour');
    if position('moved_away_at' in d) = 0 then raise exception 'patch failed'; end if;
    execute d;
  end if;
end $$;
create or replace function private.dismiss_moved_away_tasks() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.moved_away_at is not null and old.moved_away_at is null then
    update tasks set dismissed_at = now()
     where person_id = new.id and kind = 'com_reconnect' and done_at is null and dismissed_at is null;
  end if;
  return new;
end $$;
create or replace trigger people_moved_away after update of moved_away_at on public.people
  for each row execute function private.dismiss_moved_away_tasks();
