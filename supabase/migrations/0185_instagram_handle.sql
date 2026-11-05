-- Social Media Hub (Kai, 5 Nov 2026): each community's Instagram username,
-- added as a watermark on shared posts. Organisers set it on the Hub page.

alter table teams add column if not exists instagram_handle text
  check (instagram_handle ~ '^[a-z0-9._]{1,30}$');

update teams set instagram_handle = 'activism.wtf.sydney'
where slug = 'sydney-au' and instagram_handle is null;

create or replace function public.set_instagram_handle(p_team_id uuid, p_handle text)
returns text language plpgsql security definer set search_path = public as $$
declare v text := nullif(lower(regexp_replace(trim(coalesce(p_handle, '')), '^@', '')), '');
begin
  if p_team_id is null or not private.is_team_organiser(p_team_id) then return 'not_allowed'; end if;
  if v is not null and v !~ '^[a-z0-9._]{1,30}$' then return 'bad'; end if;
  update teams set instagram_handle = v where id = p_team_id;
  return 'ok';
end $$;
revoke all on function public.set_instagram_handle(uuid, text) from public, anon;
grant execute on function public.set_instagram_handle(uuid, text) to authenticated;
