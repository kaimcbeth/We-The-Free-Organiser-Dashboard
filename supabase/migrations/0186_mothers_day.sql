-- Mother's Day (Kai, 5 Nov 2026: "dairy focus is good"). Mother's Day falls on
-- a weekday of the month (2nd Sunday in May in Australia, NZ, the US and
-- Canada), so special events can now be "the nth weekday of a month":
-- month + week_of_month (1-4, 5 = last) + weekday (0 = Sunday ... 6 = Saturday).

alter table special_events add column if not exists week_of_month int
  check (week_of_month between 1 and 5);
alter table special_events add column if not exists weekday int
  check (weekday between 0 and 6);
alter table special_events drop constraint if exists special_events_check;
alter table special_events add constraint special_events_check
  check ((month is not null and day is not null)
      or (month is not null and week_of_month is not null and weekday is not null)
      or next_date is not null or easter_offset is not null);

-- The nth weekday of a month (n = 5 means the last one).
create or replace function private.nth_weekday(y int, m int, n int, wd int)
returns date language sql immutable set search_path = public as $$
  select case when n = 5 then
      (make_date(y, m, 1) + interval '1 month' - interval '1 day')::date
        - ((extract(dow from (make_date(y, m, 1) + interval '1 month' - interval '1 day'))::int - wd + 7) % 7)
    else
      make_date(y, m, 1) + ((wd - extract(dow from make_date(y, m, 1))::int + 7) % 7) + (n - 1) * 7
    end;
$$;

-- Next date a special event falls on, on or after p_today.
create or replace function private.special_event_date(e special_events, p_today date)
returns date language sql immutable set search_path = public as $$
  select case
    when e.easter_offset is not null then
      case when private.easter_sunday(extract(year from p_today)::int) + e.easter_offset >= p_today
        then private.easter_sunday(extract(year from p_today)::int) + e.easter_offset
        else private.easter_sunday(extract(year from p_today)::int + 1) + e.easter_offset end
    when e.month is not null and e.week_of_month is not null then
      case when private.nth_weekday(extract(year from p_today)::int, e.month, e.week_of_month, e.weekday) >= p_today
        then private.nth_weekday(extract(year from p_today)::int, e.month, e.week_of_month, e.weekday)
        else private.nth_weekday(extract(year from p_today)::int + 1, e.month, e.week_of_month, e.weekday) end
    when e.month is not null then
      case when make_date(extract(year from p_today)::int, e.month, least(e.day, 28 + (e.month <> 2)::int * 2 + (e.month in (1,3,5,7,8,10,12))::int)) >= p_today
        then make_date(extract(year from p_today)::int, e.month, least(e.day, 28 + (e.month <> 2)::int * 2 + (e.month in (1,3,5,7,8,10,12))::int))
        else make_date(extract(year from p_today)::int + 1, e.month, least(e.day, 28 + (e.month <> 2)::int * 2 + (e.month in (1,3,5,7,8,10,12))::int)) end
    when e.next_date >= p_today then e.next_date
  end;
$$;

insert into special_events (name, blurb, emoji, month, week_of_month, weekday, lead_days)
select 'Mother''s Day',
       'A day about mothers is the perfect moment to talk about the ones we don''t see: dairy cows, whose calves are taken from them soon after birth so people can drink the milk meant for them. Run a Movie Challenge or stall with "For every mother" signs, then a brunch potluck with plant-based milks. (2nd Sunday in May in Australia, NZ, the US and Canada; check the date where you are.)',
       '💐', 5, 2, 0, 61
where not exists (select 1 from special_events where name = 'Mother''s Day');
