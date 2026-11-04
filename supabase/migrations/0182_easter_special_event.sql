-- Easter Movie Challenge (Kai, 5 Nov 2026). Easter moves every year, so
-- special events can now follow it: easter_offset = days from Easter Sunday
-- (-2 Good Friday, -1 Easter Saturday, 0 Sunday, 1 Monday). The date is
-- worked out every year by private.easter_sunday (Western/Gregorian Easter).

alter table special_events add column if not exists easter_offset int
  check (easter_offset between -7 and 7);
alter table special_events drop constraint if exists special_events_check;
alter table special_events add constraint special_events_check
  check ((month is not null and day is not null) or next_date is not null or easter_offset is not null);

-- Easter Sunday for a year (anonymous Gregorian algorithm).
create or replace function private.easter_sunday(y int)
returns date language plpgsql immutable set search_path = public as $$
declare a int; b int; c int; d int; e int; f int; g int; h int; i int; k int; l int; m int;
begin
  a := y % 19; b := y / 100; c := y % 100; d := b / 4; e := b % 4;
  f := (b + 8) / 25; g := (b - f + 1) / 3;
  h := (19 * a + b - d - g + 15) % 30;
  i := c / 4; k := c % 4;
  l := (32 + 2 * e + 2 * i - h - k) % 7;
  m := (a + 11 * h + 22 * l) / 451;
  return make_date(y, (h + l - 7 * m + 114) / 31, ((h + l - 7 * m + 114) % 31) + 1);
end $$;

-- Next date a special event falls on, on or after p_today.
create or replace function private.special_event_date(e special_events, p_today date)
returns date language sql immutable set search_path = public as $$
  select case
    when e.easter_offset is not null then
      case when private.easter_sunday(extract(year from p_today)::int) + e.easter_offset >= p_today
        then private.easter_sunday(extract(year from p_today)::int) + e.easter_offset
        else private.easter_sunday(extract(year from p_today)::int + 1) + e.easter_offset end
    when e.month is not null then
      case when make_date(extract(year from p_today)::int, e.month, least(e.day, 28 + (e.month <> 2)::int * 2 + (e.month in (1,3,5,7,8,10,12))::int)) >= p_today
        then make_date(extract(year from p_today)::int, e.month, least(e.day, 28 + (e.month <> 2)::int * 2 + (e.month in (1,3,5,7,8,10,12))::int))
        else make_date(extract(year from p_today)::int + 1, e.month, least(e.day, 28 + (e.month <> 2)::int * 2 + (e.month in (1,3,5,7,8,10,12))::int)) end
    when e.next_date >= p_today then e.next_date
  end;
$$;

insert into special_events (name, blurb, emoji, easter_offset, lead_days)
select 'Easter Movie Challenge',
       'The Easter long weekend brings crowds out to markets, parks and city centres: a great time for a Movie Challenge. Easter Saturday works well (shops are open in most places), with vegan chocolate eggs as a seasonal treat for everyone who watches.',
       '🐣', -1, 61
where not exists (select 1 from special_events where name = 'Easter Movie Challenge');
