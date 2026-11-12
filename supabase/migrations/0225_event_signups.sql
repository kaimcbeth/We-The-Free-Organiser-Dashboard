-- Sign-up list graphic (Kai, 12 Nov 2026): the names an organiser has
-- collected for an event (e.g. from the WhatsApp "1. Me 2. ___" list) and how
-- many spots they're after. Shared by the community's organisers/Core Team.
alter table public.events add column if not exists signup_names text[];
alter table public.events add column if not exists signup_target smallint;

create or replace function public.set_event_signups(p_event_id uuid, p_names text[], p_target integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_team uuid;
begin
  select team_id into v_team from events where id = p_event_id;
  if v_team is null or not private.is_team_core(v_team) then return false; end if;
  update events set
    signup_names = (select coalesce(array_agg(left(btrim(n), 40) order by i), '{}')
                    from unnest(coalesce(p_names, '{}')) with ordinality as u(n, i)
                    where btrim(n) <> '' and i <= 100),
    signup_target = least(greatest(coalesce(p_target, 20), 1), 60)
  where id = p_event_id;
  return true;
end $$;
revoke execute on function public.set_event_signups(uuid, text[], integer) from public, anon;
grant execute on function public.set_event_signups(uuid, text[], integer) to authenticated;
