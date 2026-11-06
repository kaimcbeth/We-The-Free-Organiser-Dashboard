-- Kai, 6 Nov 2026: "Monthly event recap for regional socials". Built-in
-- region-wide monthly RSL action; its card opens a recap of the month before
-- (events, people at them, films watched, per community) as text and a post.

insert into task_kinds (kind, title, blurb, description, estimate_minutes, estimate_max_minutes,
                        anchor, appear_hours, due_after_hours, sort_order, audience, schedule, default_enabled)
values ('rsl_region_recap', 'Monthly recap posted on the regional socials',
        'Last month across your communities, for the regional socials',
        'Post a recap of last month across your region: how many events, how many people came, which communities were busiest. "Make the recap" has the numbers and a ready-to-post image.',
        20, 30, 'start', 0, 0, 41, 'regional', 'region_monthly', true)
on conflict (kind) do nothing;

-- One month across a region's patch (incl. extra countries).
create or replace function public.region_month_recap(p_region uuid, p_month date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_from date := date_trunc('month', p_month)::date;
        v_to date := (date_trunc('month', p_month) + interval '1 month')::date;
begin
  if not private.can_plan_region(p_region) then return null; end if;
  return (
    select coalesce(jsonb_agg(row_to_json(x) order by x.people desc, x.events desc, x.name), '[]'::jsonb)
    from (
      select tm.name,
             count(distinct e.id) events,
             count(a.person_id) people,
             (select count(*) from film_survey_responses f
               where f.team_id = tm.id
                 and (f.answered_at at time zone coalesce(tm.timezone, 'UTC'))::date >= v_from
                 and (f.answered_at at time zone coalesce(tm.timezone, 'UTC'))::date < v_to) watched
      from teams tm
      left join events e on e.team_id = tm.id
        and (e.starts_at at time zone coalesce(tm.timezone, 'UTC'))::date >= v_from
        and (e.starts_at at time zone coalesce(tm.timezone, 'UTC'))::date < v_to
      left join attendance a on a.event_id = e.id
      where private.team_in_region(tm.id, p_region)
        and not coalesce(tm.is_example, false) and not coalesce(tm.is_practice, false)
      group by tm.id, tm.name, tm.timezone
    ) x
  );
end $$;
grant execute on function public.region_month_recap(uuid, date) to authenticated;

select private.create_region_tasks();
