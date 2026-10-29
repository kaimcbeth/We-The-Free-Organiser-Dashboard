-- Throwback Thursday: a weekly action to post an old photo, with suggestions
-- from the Photo Hub taken in this month 1, 2, 3... years ago.
insert into task_kinds (kind, title, description, blurb, estimate_minutes, due_after_hours, schedule, schedule_weekday,
                        audience, default_enabled, core_role, sort_order)
values ('promo_throwback', 'Throwback photo posted',
        'An old photo from this time of year (1 year ago, 2 years ago...) is posted, a nice reminder of how far the community has come.',
        'Throwback Thursday', 5, 48, 'weekly', 4, 'community', true, 'promo_lead', 2)
on conflict (kind) do nothing;

-- Photos from this month in earlier years: event photos by the event's date,
-- community photos by the month they were taken. Favourites first.
create or replace function public.throwback_photos(p_team_id uuid)
returns table (id uuid, path text, years_ago int, favourite boolean, caption text, event_title text)
language sql stable security definer set search_path = public as $$
  with t as (
    select (now() at time zone coalesce(timezone, 'Australia/Sydney'))::date as today, timezone
    from teams where id = p_team_id
  ), p as (
    select ph.id, ph.path, ph.favourite, ph.caption, e.title as event_title,
      coalesce(extract(year from (e.starts_at at time zone coalesce(t.timezone, 'Australia/Sydney')))::int, ph.taken_year) as y,
      coalesce(extract(month from (e.starts_at at time zone coalesce(t.timezone, 'Australia/Sydney')))::int, ph.taken_month) as m,
      t.today
    from event_photos ph
    cross join t
    left join events e on e.id = ph.event_id
    where ph.team_id = p_team_id and ph.archived_at is null
  )
  select id, path, extract(year from today)::int - y, favourite, caption, event_title
  from p
  where private.is_team_core(p_team_id)
    and m = extract(month from today) and y < extract(year from today)
  order by favourite desc, (extract(year from today)::int - y), random()
  limit 12;
$$;
revoke execute on function public.throwback_photos(uuid) from public, anon;
grant execute on function public.throwback_photos(uuid) to authenticated;
