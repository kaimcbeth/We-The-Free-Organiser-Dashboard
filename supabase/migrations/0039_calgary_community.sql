-- Calgary (North America), for testing with the Calgary team.
insert into teams (name, slug, activism_team_url, timezone, region_id, lat, lng)
select 'Calgary, Canada', 'calgary-ca', 'https://activism.wtf/teams/calgary-ca', 'America/Edmonton',
       (select id from regions where name = 'North America'), 51.0447, -114.0719
where not exists (select 1 from teams where slug = 'calgary-ca');
