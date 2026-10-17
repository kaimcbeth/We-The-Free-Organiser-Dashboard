-- Move the access-check helper out of the public API, so it can't be called
-- directly from the app's web address. The access rules keep using it.
create schema if not exists private;
grant usage on schema private to authenticated;
alter function public.is_team_organiser(uuid) set schema private;
