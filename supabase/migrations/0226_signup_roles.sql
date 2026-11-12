-- Sign-up list roles (Kai, 12 Nov 2026: Photos ×3, Attendance and welcoming
-- new members ×1, Equipment setup ×5 above the numbered list).
-- signup_roles = [{label, spots, names: []}]
alter table public.events add column if not exists signup_roles jsonb;

drop function if exists public.set_event_signups(uuid, text[], integer);
create or replace function public.set_event_signups(p_event_id uuid, p_names text[], p_target integer, p_roles jsonb default null)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_team uuid;
begin
  select team_id into v_team from events where id = p_event_id;
  if v_team is null or not private.is_team_core(v_team) then return false; end if;
  update events set
    signup_names = (select coalesce(array_agg(left(btrim(n), 40) order by i), '{}')
                    from unnest(coalesce(p_names, '{}')) with ordinality as u(n, i)
                    where btrim(n) <> '' and i <= 100),
    signup_target = least(greatest(coalesce(p_target, 20), 1), 60),
    signup_roles = case when p_roles is null then signup_roles
                        when jsonb_typeof(p_roles) = 'array' and jsonb_array_length(p_roles) <= 10 then p_roles
                        else signup_roles end
  where id = p_event_id;
  return true;
end $$;
revoke execute on function public.set_event_signups(uuid, text[], integer, jsonb) from public, anon;
grant execute on function public.set_event_signups(uuid, text[], integer, jsonb) to authenticated;
