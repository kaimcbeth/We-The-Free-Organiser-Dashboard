-- Members (people with an account) see a short tutorial the first time.
alter table people add column tutorial_done_at timestamptz;

create or replace function public.finish_tutorial()
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update people set tutorial_done_at = coalesce(tutorial_done_at, now()) where user_id = auth.uid();
  return found;
end;
$$;

revoke execute on function public.finish_tutorial() from public, anon;
grant execute on function public.finish_tutorial() to authenticated;
