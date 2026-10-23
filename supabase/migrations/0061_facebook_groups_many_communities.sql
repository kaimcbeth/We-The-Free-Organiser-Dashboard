-- (Applied as facebook_groups_many_communities.) A Facebook group can be
-- shared with nearby communities as well as its own (also_team_ids).
-- Organisers of any of those communities can manage it; their Core Team can
-- read it. Then ~630 English-speaking groups were bulk-imported from Kai's
-- sheet via a one-off private.import_fb_groups_tsv(tsv) helper: matched by
-- city in the group name, else a nearby (~100 km) or region-wide community;
-- the rest have no community (God-only) with the sheet section in notes.
alter table public.facebook_groups add column also_team_ids uuid[] not null default '{}';
create index facebook_groups_also_teams on public.facebook_groups using gin (also_team_ids);

alter policy "core team reads facebook groups" on public.facebook_groups
  using ((team_id is not null and private.is_team_core(team_id))
    or exists (select 1 from unnest(also_team_ids) x where private.is_team_core(x)));

alter policy "god manages facebook groups" on public.facebook_groups
  using (private.is_god()
    or (team_id is not null and private.is_team_organiser(team_id))
    or exists (select 1 from unnest(also_team_ids) x where private.is_team_organiser(x)))
  with check (private.is_god()
    or (team_id is not null and private.is_team_organiser(team_id))
    or exists (select 1 from unnest(also_team_ids) x where private.is_team_organiser(x)));
