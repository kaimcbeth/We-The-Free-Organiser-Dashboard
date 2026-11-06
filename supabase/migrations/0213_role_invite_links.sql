-- Kai, 6 Nov 2026: "a direct link to add the new Gold Coast organiser and let
-- them make an account". A one-use link: whoever opens it logs in (or makes an
-- account with their email), types their name and becomes an organiser of that
-- community. Made by God or the region's RSL.

create table if not exists public.role_invite_links (
  token text primary key default encode(extensions.gen_random_bytes(16), 'hex'),
  team_id uuid not null references teams(id) on delete cascade,
  access text not null default 'organiser' check (access in ('organiser', 'core_team')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  used_by uuid references auth.users(id) on delete set null,
  used_at timestamptz
);
alter table public.role_invite_links enable row level security;

create or replace function public.create_role_invite(p_team uuid, p_access text default 'organiser')
returns text language plpgsql security definer set search_path = public as $$
declare v_token text; v_region uuid;
begin
  select region_id into v_region from teams where id = p_team;
  if not (exists (select 1 from organisers where id = auth.uid() and access = 'god')
          or private.can_plan_region(v_region)) then
    raise exception 'not_allowed';
  end if;
  insert into role_invite_links (team_id, access, created_by)
  values (p_team, coalesce(p_access, 'organiser'), auth.uid())
  returning token into v_token;
  return v_token;
end $$;

create or replace function public.role_invite_info(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'team', t.name, 'access', l.access,
    'status', case when l.used_at is not null then 'used'
                   when l.expires_at < now() then 'expired' else 'ok' end)
  from role_invite_links l join teams t on t.id = l.team_id
  where l.token = p_token;
$$;
grant execute on function public.role_invite_info(text) to anon, authenticated;

create or replace function public.claim_role_invite(p_token text, p_name text)
returns text language plpgsql security definer set search_path = public as $$
declare l role_invite_links; o organisers; v_email text; v_name text := nullif(trim(p_name), '');
begin
  if auth.uid() is null then return 'login'; end if;
  select * into l from role_invite_links where token = p_token for update;
  if not found then return 'invalid'; end if;
  if l.used_at is not null then
    return case when l.used_by = auth.uid() then 'ok' else 'used' end;
  end if;
  if l.expires_at < now() then return 'expired'; end if;
  if v_name is null then return 'name'; end if;
  select email into v_email from auth.users where id = auth.uid();
  select * into o from organisers where id = auth.uid();
  if found then
    if o.access in ('god', 'regional_lead') then return 'has_role'; end if;
    if o.access = 'organiser' and o.team_id <> l.team_id then return 'has_role'; end if;
    update organisers set team_id = l.team_id, access = l.access, name = v_name
      where id = auth.uid() and (access <> 'organiser' or l.access = 'organiser');
  else
    insert into organisers (id, team_id, name, email, access)
    values (auth.uid(), l.team_id, v_name, coalesce(v_email, ''), l.access);
  end if;
  update role_invite_links set used_by = auth.uid(), used_at = now() where token = p_token;
  return 'ok';
end $$;
grant execute on function public.claim_role_invite(text, text) to authenticated;
