-- Signs now have DIY (8 A3 sheets on cardboard) and Best (Easy Signs
-- corrugated plastic) options: what communities already had is the Best one.
update gear_items set guide_key = 'signs:best', name = 'Signs' where guide_key = 'signs';
update equipment_photos set photo_key = 'signs:best' where photo_key = 'signs'
  and not exists (select 1 from equipment_photos where photo_key = 'signs:best');
