-- Kai, 11 Nov 2026: "Add "year" Finale Movie Challenge as suggested event in December".
-- {year} in a special event's name is filled in with the year it falls in
-- (suggestions and "Plan your …" actions). Date: 2nd Saturday of December.
insert into special_events (name, blurb, emoji, month, week_of_month, weekday, lead_days)
select '{year} Finale Movie Challenge',
       'Finish the year with one last big Movie Challenge. Make it a celebration: share how many people watched this year, thank the members who turned up all year, and head somewhere together for food afterwards.',
       '🎬', 12, 2, 6, 61
where not exists (select 1 from special_events where name ilike '%finale%');

do $$
declare d text;
begin
  select pg_get_functiondef('public.suggested_events(uuid)'::regprocedure) into d;
  d := replace(d, '''name'', y.name,', '''name'', replace(y.name, ''{year}'', y.yr::text),');
  execute d;
  select pg_get_functiondef('public.plan_special_event_later(uuid, uuid, integer, timestamptz)'::regprocedure) into d;
  d := replace(d, 'left(''Plan your '' || v_e.name, 80)', 'left(''Plan your '' || replace(v_e.name, ''{year}'', p_year::text), 80)');
  execute d;
end $$;
