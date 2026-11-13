-- Hangout announcement suggestions follow the hangout's date (Kai, 13 Nov 2026:
-- "shouldn't suggest events" that are over by the hangout): special events on
-- or after p_on (up to 70 days), the month before p_on, later hangouts.
create or replace function public.hangout_suggestions(p_region uuid, p_on date default null)
returns jsonb language plpgsql stable security definer set search_path = public as $f$
declare
  v_on date := coalesce(p_on, current_date);
  v_month date := (date_trunc('month', v_on) - interval '1 month')::date;
  v jsonb;
begin
  if not private.can_plan_region(p_region) then raise exception 'not allowed'; end if;
  select jsonb_build_object(
    'specials', coalesce((
      select jsonb_agg(jsonb_build_object('emoji', s.emoji, 'name', replace(s.name, '{year}', extract(year from s.d)::int::text), 'date', s.d) order by s.d)
      from (
        select e.emoji, e.name, private.special_event_date(e, v_on) d
        from special_events e
        where coalesce(e.anniversary, false) = false
          and (e.region_ids is null or cardinality(e.region_ids) = 0 or p_region = any(e.region_ids))
          and (e.countries is null or cardinality(e.countries) = 0 or exists (
            select 1 from teams t where private.team_in_region(t.id, p_region)
              and private.team_country(t.name) = any(e.countries)))
      ) s
      where s.d >= v_on and s.d <= v_on + 70
    ), '[]'::jsonb),
    'month', v_month,
    'recap', public.region_month_recap(p_region, v_month),
    'hangouts', coalesce((
      select jsonb_agg(jsonb_build_object('id', h.id, 'title', h.title, 'starts_at', h.starts_at, 'url', h.source_url) order by h.starts_at)
      from (select * from hangouts h where h.removed_at is null and h.starts_at > now() and p_region = any(h.region_ids) order by h.starts_at limit 6) h
    ), '[]'::jsonb)
  ) into v;
  return v;
end $f$;
drop function if exists public.hangout_suggestions(uuid);
grant execute on function public.hangout_suggestions(uuid, date) to authenticated;
