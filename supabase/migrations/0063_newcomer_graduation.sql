-- (Applied as newcomer_graduation.) Newcomers stay newcomers until their 5th
-- event (src/lib/newcomer.ts). On that 5th check-in, thank the person who was
-- supporting them (bell notification) and close the pairing.
create or replace function private.newcomer_graduated() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  n int;
  p record;
  pr record;
begin
  select first_name, attended_before_app into p from people where id = new.person_id;
  if p is null or p.attended_before_app then return new; end if;
  select count(*) into n from attendance where person_id = new.person_id;
  if n <> 5 then return new; end if;

  for pr in
    select b.id, s.user_id
    from buddy_pairings b join people s on s.id = b.buddy_id
    where b.newcomer_id = new.person_id and b.ended_at is null
  loop
    if pr.user_id is not null then
      insert into notifications (user_id, kind, title, body, url)
      values (pr.user_id, 'newcomer_graduated',
        '🎉 ' || p.first_name || ' just came to their 5th event!',
        'Thanks for supporting them. ' || p.first_name || ' isn''t a newcomer anymore, and that''s down to you.',
        '/me#buddies');
    end if;
    update buddy_pairings set ended_at = now() where id = pr.id;
  end loop;
  return new;
end $$;

create trigger attendance_newcomer_graduated after insert on public.attendance
  for each row execute function private.newcomer_graduated();
