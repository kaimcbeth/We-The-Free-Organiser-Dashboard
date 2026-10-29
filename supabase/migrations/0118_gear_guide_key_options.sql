-- (Applied as gear_guide_key_options.) Budget and Best are separate in the
-- inventory: guide items with options are tracked as e.g. a_frame:budget /
-- a_frame:best.
update gear_items set guide_key = guide_key || ':' || case
    when model ilike '%kings%' or model ilike '%lamination%' or model = 'Best' then 'best'
    else 'budget' end
where guide_key in ('table', 'a_frame');
-- (Run straight after.) Names say which version, e.g. "A-frame sign (Budget)".
update gear_items set name = name || case when guide_key like '%:best' then ' (Best)' else ' (Budget)' end,
  model = case when model in ('Budget', 'Best') then null else model end
where guide_key in ('table:budget', 'table:best', 'a_frame:budget', 'a_frame:best') and name not like '%(%';
-- (Later, 29 Oct) Kai asked to drop the "(Budget)" / "(Best)" from gear names.
update gear_items set name = regexp_replace(name, ' \((Budget|Best|DIY)\)$', '')
where guide_key like '%:%' and name ~ ' \((Budget|Best|DIY)\)$';
