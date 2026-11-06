-- Kai, 6 Nov 2026: "Make me a view for the UK RSL". The UK has no RSL account
-- yet, so its region-wide and quarterly RSL actions were never made. Make
-- them for every region with communities (notifications still only go to a
-- lead), so previewing as an RSL for any region shows the real list and a
-- future RSL starts with it.
do $$
declare v text;
begin
  select pg_get_functiondef('private.create_region_tasks()'::regprocedure) into v;
  v := replace(v,
    '(k.region_id = d.id or (k.region_id is null and d.has_lead))',
    '(k.region_id = d.id or (k.region_id is null and d.has_teams))');
  v := replace(v,
    E'                      or (o.access = ''god'' and o.lead_region_id = r.id)) has_lead\n',
    E'                      or (o.access = ''god'' and o.lead_region_id = r.id)) has_lead,\n           exists (select 1 from teams t where t.region_id = r.id) has_teams\n');
  if position('d.has_teams' in v) = 0 or position(') has_teams' in v) = 0 then
    raise exception 'create_region_tasks patch did not apply';
  end if;
  execute v;

  select pg_get_functiondef('private.create_region_quarterly_tasks()'::regprocedure) into v;
  v := replace(v,
    E'    select g.id region_id from regions g\n    where exists (select 1 from organisers o\n                  where (o.access = ''regional_lead'' and o.region_id = g.id)\n                     or (o.access = ''god'' and o.lead_region_id = g.id))',
    E'    select g.id region_id from regions g');
  if position('where exists (select 1 from organisers o' in v) > 0 then
    raise exception 'create_region_quarterly_tasks patch did not apply';
  end if;
  execute v;
end $$;

select private.create_region_tasks();
select private.create_region_quarterly_tasks();
