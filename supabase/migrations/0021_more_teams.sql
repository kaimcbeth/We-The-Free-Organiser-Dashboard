-- Oceania teams beyond Sydney. Each team's events import from its activism.wtf
-- page, and times show in the team's own time zone.
insert into teams (name, slug, activism_team_url, timezone, region_id)
select v.name, v.slug, 'https://activism.wtf/teams/' || v.slug, v.tz, (select id from regions where name = 'Oceania')
from (values
  ('Perth, Australia',          'perth-au',          'Australia/Perth'),
  ('Parramatta, Australia',     'parramatta-au',     'Australia/Sydney'),
  ('Adelaide, Australia',       'adelaide-au',       'Australia/Adelaide'),
  ('Gold Coast, Australia',     'gold-coast-au',     'Australia/Brisbane'),
  ('Brisbane, Australia',       'brisbane-qld-au',   'Australia/Brisbane'),
  ('Townsville, Australia',     'townsville-au',     'Australia/Brisbane'),
  ('Sunshine Coast, Australia', 'sunshine-coast-au', 'Australia/Brisbane'),
  ('Manly, Australia',          'manly-au',          'Australia/Sydney'),
  ('Christchurch, New Zealand', 'christchurch-nz',   'Pacific/Auckland'),
  ('Wellington, New Zealand',   'wellington-nz',     'Pacific/Auckland')
) as v(name, slug, tz)
where not exists (select 1 from teams t where t.slug = v.slug);
