-- Rank actions by importance (Kai, 6 Nov 2026: "a panel in God mode where I
-- can see all the possible actions … and rank them by importance", so that
-- when an organiser says how much time they have, Choose actions suggests the
-- most important ones that fit). task_kinds.importance: 1 = most important;
-- null = not ranked (goes last). Seeded from the old hard-coded order in
-- task-chooser.tsx, then on-by-default before off, then sort_order.

alter table task_kinds add column if not exists importance int;

with pri(kind, n) as (values
  ('take_attendance', 1), ('take_photos', 2), ('promote_event', 3), ('photos_shared', 4),
  ('fb_event_setup', 5), ('promote_fb_groups_weekly', 6), ('instagram_stories', 7)
), ranked as (
  select k.kind, row_number() over (
           order by p.n nulls last, (k.default_enabled is not false) desc, k.sort_order, k.kind) r
  from task_kinds k left join pri p on p.kind = k.kind
  where k.team_id is null and k.archived_at is null and k.audience = 'community'
    and k.schedule not in ('follow_up', 'special', 'pod')
)
update task_kinds k set importance = ranked.r from ranked
where ranked.kind = k.kind and k.importance is null;

-- God only: save the whole order (first = most important).
create or replace function public.set_action_ranking(p_kinds text[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if not private.is_god() then raise exception 'Not allowed'; end if;
  update task_kinds k set importance = x.n
  from unnest(p_kinds) with ordinality as x(kind, n)
  where k.kind = x.kind and k.team_id is null;
end $$;
revoke all on function public.set_action_ranking(text[]) from public, anon;
grant execute on function public.set_action_ranking(text[]) to authenticated;
