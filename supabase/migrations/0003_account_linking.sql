-- Attendee accounts and linking them to people organisers already added.
--
-- Two ways a login gets connected to a person an organiser already added:
--   invite  organiser shows a QR / sends a personal link for that person
--           (the organiser vouches for them face to face)
--   email   the person logs in with a code sent to the email the organiser saved
-- The general sign-up never connects to an existing name by itself. If a
-- same-name record exists it says "ask an organiser for your connect QR".

alter table people
  add column linked_via text check (linked_via in ('invite', 'email', 'self_signup')),
  add column linked_at timestamptz;

-- Personal invite links / QR codes for one person.
create table person_invites (
  token       text primary key default replace(gen_random_uuid()::text, '-', ''),
  person_id   uuid not null references people (id) on delete cascade,
  created_by  uuid references organisers (id) on delete set null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '30 days',
  used_at     timestamptz,
  used_by     uuid references auth.users (id) on delete set null
);

create index person_invites_person_idx on person_invites (person_id);

alter table person_invites enable row level security;

create policy "organisers manage invites for team people" on person_invites
  for all to authenticated
  using (exists (select 1 from people p where p.id = person_id and private.is_team_organiser(p.team_id)))
  with check (exists (select 1 from people p where p.id = person_id and private.is_team_organiser(p.team_id)));

-- Attendees change their details through update_my_profile() only,
-- so they can't touch team, link or count fields directly.
alter policy "attendees update own profile" on people using (false) with check (false);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Fill in a person's blank details, and record consent changes.
create or replace function private.apply_profile(
  p_person_id uuid, p_first text, p_last text, p_phone text, p_suburb text, p_consent boolean
) returns void
language sql
security definer
set search_path = public
as $$
  update people set
    first_name = coalesce(nullif(trim(p_first), ''), first_name),
    last_name  = coalesce(nullif(trim(p_last), ''), last_name),
    phone      = coalesce(nullif(trim(p_phone), ''), phone),
    suburb     = coalesce(nullif(trim(p_suburb), ''), suburb),
    consent_marketing = coalesce(p_consent, consent_marketing),
    consent_given_at = case
      when p_consent is true and not consent_marketing then now()
      when p_consent is false then null
      else consent_given_at end
  where id = p_person_id;
$$;

-- ---------------------------------------------------------------------------
-- Invite links
-- ---------------------------------------------------------------------------

-- Public: what the invite page shows before someone logs in.
create or replace function public.get_invite(p_token text)
returns table (first_name text, team_name text, status text)
language sql
stable
security definer
set search_path = public
as $$
  select p.first_name, t.name,
    case
      when i.used_at is not null or p.user_id is not null then 'used'
      when i.expires_at < now() then 'expired'
      else 'ok' end
  from person_invites i
  join people p on p.id = i.person_id
  join teams t on t.id = p.team_id
  where i.token = p_token;
$$;

-- Signed in: connect my login to the invited person.
create or replace function public.claim_invite(p_token text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := auth.jwt() ->> 'email';
  v_inv person_invites%rowtype;
  v_person people%rowtype;
begin
  if v_uid is null then return 'not_signed_in'; end if;

  select * into v_inv from person_invites where token = p_token for update;
  if not found then return 'not_found'; end if;

  select * into v_person from people where id = v_inv.person_id for update;
  if v_person.user_id = v_uid then return 'ok'; end if;
  if v_person.user_id is not null or v_inv.used_at is not null then return 'used'; end if;
  if v_inv.expires_at < now() then return 'expired'; end if;

  if exists (select 1 from people where user_id = v_uid and team_id = v_person.team_id) then
    return 'already_linked';
  end if;

  update people set
    user_id = v_uid,
    linked_via = 'invite',
    linked_at = now(),
    email = coalesce(email, v_email)
  where id = v_person.id;

  update person_invites set used_at = now(), used_by = v_uid where token = p_token;
  return 'ok';
end;
$$;

-- ---------------------------------------------------------------------------
-- General sign-up (the team QR code)
-- ---------------------------------------------------------------------------
-- Returns json:
--   {status: 'linked', person_id}      connected (existing email match or new person)
--   {status: 'name_taken', names: []}  an organiser already added someone with this
--                                      name; ask them for a connect QR instead.
--                                      Call again with p_force_new = true if it's not them.

create or replace function public.join_team(
  p_team_slug text,
  p_first text,
  p_last text,
  p_phone text,
  p_suburb text,
  p_consent boolean,
  p_force_new boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(auth.jwt() ->> 'email');
  v_team uuid;
  v_person uuid;
  v_names jsonb;
begin
  if v_uid is null then return jsonb_build_object('status', 'not_signed_in'); end if;
  if coalesce(trim(p_first), '') = '' then return jsonb_build_object('status', 'missing_name'); end if;

  select id into v_team from teams where slug = p_team_slug;
  if v_team is null then return jsonb_build_object('status', 'no_team'); end if;

  -- Already connected in this team: just update details.
  select id into v_person from people where user_id = v_uid and team_id = v_team;
  if v_person is not null then
    perform private.apply_profile(v_person, p_first, p_last, p_phone, p_suburb, p_consent);
    return jsonb_build_object('status', 'linked', 'person_id', v_person);
  end if;

  -- An organiser already saved this email (they proved it with the login code).
  select id into v_person from people
  where team_id = v_team and user_id is null and lower(email) = v_email
  limit 1;
  if v_person is not null then
    update people set user_id = v_uid, linked_via = 'email', linked_at = now() where id = v_person;
    perform private.apply_profile(v_person, p_first, p_last, p_phone, p_suburb, p_consent);
    return jsonb_build_object('status', 'linked', 'person_id', v_person);
  end if;

  -- Same name already added by an organiser: point them to a connect QR.
  if not p_force_new then
    select jsonb_agg(trim(p.first_name || ' ' || coalesce(left(p.last_name, 1) || '.', '')))
    into v_names
    from people p
    where p.team_id = v_team
      and p.user_id is null
      and lower(trim(p.first_name)) = lower(trim(p_first))
      and (
        coalesce(trim(p_last), '') = ''
        or p.last_name is null
        or lower(left(trim(p.last_name), 1)) = lower(left(trim(p_last), 1))
      );
    if v_names is not null then
      return jsonb_build_object('status', 'name_taken', 'names', v_names);
    end if;
  end if;

  -- Brand new person.
  insert into people (team_id, first_name, last_name, email, phone, suburb, added_via, user_id, linked_via, linked_at)
  values (v_team, trim(p_first), nullif(trim(p_last), ''), v_email, nullif(trim(p_phone), ''),
          nullif(trim(p_suburb), ''), 'self_signup', v_uid, 'self_signup', now())
  returning id into v_person;
  perform private.apply_profile(v_person, null, null, null, null, p_consent);
  return jsonb_build_object('status', 'linked', 'person_id', v_person);
end;
$$;

-- Signed-in attendee edits their own details.
create or replace function public.update_my_profile(
  p_person_id uuid, p_first text, p_last text, p_phone text, p_suburb text, p_consent boolean
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
     or not exists (select 1 from people where id = p_person_id and user_id = auth.uid()) then
    return false;
  end if;
  perform private.apply_profile(p_person_id, p_first, p_last, p_phone, p_suburb, p_consent);
  return true;
end;
$$;

revoke execute on function private.apply_profile(uuid, text, text, text, text, boolean) from public, anon, authenticated;
revoke execute on function public.claim_invite(text) from public, anon;
revoke execute on function public.join_team(text, text, text, text, text, boolean, boolean) from public, anon;
revoke execute on function public.update_my_profile(uuid, text, text, text, text, boolean) from public, anon;
grant execute on function public.get_invite(text) to anon, authenticated;
grant execute on function public.claim_invite(text) to authenticated;
grant execute on function public.join_team(text, text, text, text, text, boolean, boolean) to authenticated;
grant execute on function public.update_my_profile(uuid, text, text, text, text, boolean) to authenticated;

-- Let a signed-in attendee see their own team's name (for their profile page).
create policy "attendees read own team" on teams
  for select to authenticated
  using (exists (select 1 from people p where p.team_id = teams.id and p.user_id = auth.uid()));
