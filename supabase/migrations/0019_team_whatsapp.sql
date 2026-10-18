-- The team's WhatsApp community invite link, shown to members and as a QR at events.
-- WhatsApp invite links last until a group admin resets them, so organisers can update it.

alter table teams add column whatsapp_url text
  check (whatsapp_url is null or whatsapp_url ~ '^https://chat\.whatsapp\.com/[A-Za-z0-9]+$');

update teams set whatsapp_url = 'https://chat.whatsapp.com/HDVh59cjkvBAJj99I2aGS2' where slug = 'sydney-au';

create or replace function public.set_team_whatsapp(p_url text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_team uuid;
  v_url text := nullif(trim(p_url), '');
begin
  select team_id into v_team from organisers where id = auth.uid();
  if v_team is null then return 'not_organiser'; end if;
  -- Drop anything after the invite code (e.g. "?mode=…").
  v_url := substring(v_url from '^(https://chat\.whatsapp\.com/[A-Za-z0-9]+)');
  if p_url is not null and trim(p_url) <> '' and v_url is null then return 'invalid'; end if;
  update teams set whatsapp_url = v_url where id = v_team;
  return 'ok';
end;
$$;

revoke execute on function public.set_team_whatsapp(text) from public, anon;
grant execute on function public.set_team_whatsapp(text) to authenticated;
