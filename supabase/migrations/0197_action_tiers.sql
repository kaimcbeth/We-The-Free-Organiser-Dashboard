-- Action tiers (Kai, 6 Nov 2026: "divide all of these into priority 1, 2 and
-- 3 … essential, good to do, above and beyond"). task_kinds.tier 1/2/3; the
-- ranking is tier first, then importance within the tier. Starting split
-- (Kai to sort): the six event basics = Essential, other on-by-default =
-- Good to do, off-by-default = Above and beyond.

alter table task_kinds add column if not exists tier smallint
  check (tier between 1 and 3);

update task_kinds set tier = case
    when kind in ('take_attendance', 'take_photos', 'promote_event', 'photos_shared',
                  'fb_event_setup', 'instagram_stories') then 1
    when default_enabled is not false then 2
    else 3 end
where importance is not null and tier is null;

-- Renumber importance so it follows tier then the current order.
with r as (
  select kind, row_number() over (order by tier, importance) n
  from task_kinds where importance is not null
)
update task_kinds k set importance = r.n from r where r.kind = k.kind;

drop function if exists public.set_action_ranking(text[]);
create or replace function public.set_action_ranking(p_kinds text[], p_tiers smallint[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if not private.is_god() then raise exception 'Not allowed'; end if;
  if cardinality(p_kinds) <> cardinality(p_tiers) then raise exception 'Mismatched lists'; end if;
  update task_kinds k set importance = x.n, tier = x.tier
  from unnest(p_kinds, p_tiers) with ordinality as x(kind, tier, n)
  where k.kind = x.kind and k.team_id is null;
end $$;
revoke all on function public.set_action_ranking(text[], smallint[]) from public, anon;
grant execute on function public.set_action_ranking(text[], smallint[]) to authenticated;
