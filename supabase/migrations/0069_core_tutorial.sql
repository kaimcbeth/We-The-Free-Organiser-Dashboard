-- (Applied as core_tutorial.) The Core Team welcome tour, remembered
-- separately from the organiser one.
alter table public.organisers add column core_tutorial_done_at timestamptz;
create or replace function public.finish_core_tutorial() returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update organisers set core_tutorial_done_at = coalesce(core_tutorial_done_at, now()) where id = auth.uid();
  return found;
end $$;
grant execute on function public.finish_core_tutorial() to authenticated;
