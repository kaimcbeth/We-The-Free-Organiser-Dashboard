-- Performance & Development Reviews for Regional Support Leads (Kai, 26 Nov
-- 2026; plan in the Project doc claude/rsl_pdr_plan.md). Kai's choices:
-- only the community manager reviews (a "runs PDRs" switch on the account,
-- so it can be handed on); same sections as his Word PDR, tidied; the RSL
-- drafts everything before the meeting; the reviewer adds private notes and
-- ratings beside theirs, shown to the RSL once the meeting starts; both tick
-- "accurate record" and it locks; goals carry over to the next PDR as its
-- objectives; organisational goals for the year with live progress; the
-- reviewer presses Start (RSL + meeting date) and the RSL gets an email +
-- bell, which is also their invite to the Hub; PDF download.
-- Everything goes through the functions below (RLS on, no table policies).

alter table organisers add column if not exists runs_pdrs boolean not null default false;
update organisers set runs_pdrs = true where email = 'kai@activism.wtf';

create table if not exists public.pdrs (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'annual' check (kind in ('annual', 'mid_year')),
  year int not null,
  reviewee_id uuid references auth.users(id) on delete set null,
  reviewee_name text not null,
  reviewee_email text,
  region_id uuid references regions(id) on delete set null,
  reviewer_id uuid references auth.users(id) on delete set null,
  reviewer_name text,
  meeting_at timestamptz,
  timezone text not null default 'Australia/Sydney',
  answers jsonb not null default '{}'::jsonb,
  notes jsonb not null default '{}'::jsonb,
  previous_id uuid references pdrs(id) on delete set null,
  invite_token text unique not null default replace(gen_random_uuid()::text, '-', ''),
  submitted_at timestamptz,
  notes_shared_at timestamptz,
  reviewee_signed_at timestamptz,
  reviewee_signed_name text,
  reviewer_signed_at timestamptz,
  reviewer_signed_name text,
  locked_at timestamptz,
  invite_sent_at timestamptz,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pdrs_reviewee on pdrs (reviewee_id);
alter table pdrs enable row level security;

-- metric: new_communities | events | check_ins | films_watched | null (typed by hand)
create table if not exists public.pdr_org_goals (
  year int primary key,
  goals jsonb not null default '[]'::jsonb, -- [{label, target, metric}]
  updated_at timestamptz not null default now(),
  updated_by uuid
);
alter table pdr_org_goals enable row level security;

insert into pdr_org_goals (year, goals) values
  (2026, '[{"label":"New active teams","target":60,"metric":"new_communities"},
           {"label":"Monthly donors","target":200,"metric":null},
           {"label":"Events held","target":2000,"metric":"events"},
           {"label":"Activists trained","target":6000,"metric":null},
           {"label":"3minutes.wtf views","target":null,"metric":null}]'::jsonb),
  (2027, '[{"label":"New active teams","target":60,"metric":"new_communities"},
           {"label":"Monthly donors","target":200,"metric":null},
           {"label":"Events held","target":2000,"metric":"events"},
           {"label":"Activists trained","target":6000,"metric":null},
           {"label":"3minutes.wtf views","target":null,"metric":null}]'::jsonb)
on conflict (year) do nothing;

create or replace function private.runs_pdrs()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from organisers where id = auth.uid() and runs_pdrs);
$$;

-- 'reviewer' | 'reviewee' | null
create or replace function private.pdr_role(p pdrs)
returns text language sql stable security definer set search_path = public as $$
  select case when private.runs_pdrs() then 'reviewer'
              when p.reviewee_id = auth.uid() then 'reviewee' end;
$$;

create or replace function private.pdr_status(p pdrs)
returns text language sql immutable as $$
  select case when p.locked_at is not null then 'signed'
              when p.notes_shared_at is not null then 'meeting'
              when p.submitted_at is not null then 'ready'
              when p.reviewee_id is null then 'invited'
              else 'drafting' end;
$$;

-- Live numbers for the organisational goals.
create or replace function private.pdr_metric(p_metric text, p_year int)
returns int language plpgsql stable security definer set search_path = public as $$
declare
  v_from timestamptz := make_timestamptz(p_year, 1, 1, 0, 0, 0, 'UTC');
  v_to timestamptz := least(make_timestamptz(p_year + 1, 1, 1, 0, 0, 0, 'UTC'), now());
begin
  if p_metric = 'new_communities' then
    return (select count(*) from teams where created_at >= v_from and created_at < v_to
            and not coalesce(is_example, false) and not coalesce(is_practice, false));
  elsif p_metric = 'events' then
    return (select count(*) from events e join teams t on t.id = e.team_id
            where e.starts_at >= v_from and e.starts_at < v_to
              and not coalesce(t.is_example, false) and not coalesce(t.is_practice, false)
              and not (e.source = 'manual' and e.event_type_id is null));
  elsif p_metric = 'check_ins' then
    return (select count(*) from attendance a join events e on e.id = a.event_id
            join teams t on t.id = e.team_id
            where e.starts_at >= v_from and e.starts_at < v_to
              and not coalesce(t.is_example, false) and not coalesce(t.is_practice, false));
  elsif p_metric = 'films_watched' then
    return (select count(*) from film_survey_responses
            where created_at >= v_from and created_at < v_to);
  end if;
  return null;
end $$;

create or replace function private.pdr_goals(p_year int)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce((
    select jsonb_agg(g || jsonb_build_object('progress',
             case when g->>'metric' is null then null
                  else private.pdr_metric(g->>'metric', p_year) end) order by ord)
    from pdr_org_goals, jsonb_array_elements(goals) with ordinality as x(g, ord)
    where year = p_year), '[]'::jsonb);
$$;

create or replace function private.pdr_summary(p pdrs)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', p.id, 'kind', p.kind, 'year', p.year,
    'reviewee_id', p.reviewee_id, 'reviewee_name', p.reviewee_name,
    'reviewee_email', p.reviewee_email, 'region_id', p.region_id,
    'region', (select name from regions where id = p.region_id),
    'reviewer_name', p.reviewer_name, 'meeting_at', p.meeting_at,
    'timezone', p.timezone, 'status', private.pdr_status(p),
    'submitted_at', p.submitted_at, 'notes_shared_at', p.notes_shared_at,
    'reviewee_signed_at', p.reviewee_signed_at, 'reviewee_signed_name', p.reviewee_signed_name,
    'reviewer_signed_at', p.reviewer_signed_at, 'reviewer_signed_name', p.reviewer_signed_name,
    'locked_at', p.locked_at, 'invite_sent_at', p.invite_sent_at,
    'previous_id', p.previous_id, 'created_at', p.created_at, 'updated_at', p.updated_at,
    'invite_token', case when private.runs_pdrs() then p.invite_token end);
$$;

create or replace function public.pdr_list()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(private.pdr_summary(p) order by p.locked_at is not null, p.meeting_at nulls last, p.created_at desc), '[]'::jsonb)
  from pdrs p
  where auth.uid() is not null and (private.runs_pdrs() or p.reviewee_id = auth.uid());
$$;

create or replace function public.pdr_get(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare p pdrs; prev pdrs; v_role text;
begin
  select * into p from pdrs where id = p_id;
  if not found then return null; end if;
  v_role := private.pdr_role(p);
  if v_role is null then return null; end if;
  select * into prev from pdrs where id = p.previous_id;
  return private.pdr_summary(p) || jsonb_build_object(
    'role', v_role,
    'answers', p.answers,
    'notes', case when v_role = 'reviewer' or p.notes_shared_at is not null then p.notes end,
    'goals', private.pdr_goals(p.year),
    'previous', case when prev.id is null then null else jsonb_build_object(
      'id', prev.id, 'kind', prev.kind, 'year', prev.year,
      'job', prev.answers->'job', 'team', prev.answers->'team',
      'goals', prev.answers->'goals', 'development', prev.answers->'development') end);
end $$;

-- People the reviewer can start a PDR for: RSLs (and staff who lead a region).
create or replace function public.pdr_people()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when private.runs_pdrs() then jsonb_build_object(
    'people', coalesce((select jsonb_agg(jsonb_build_object(
        'id', o.id, 'name', o.name, 'email', o.email,
        'region_id', coalesce(o.region_id, o.lead_region_id),
        'region', (select name from regions where id = coalesce(o.region_id, o.lead_region_id)))
        order by o.name)
      from organisers o
      where o.access = 'regional_lead' or (o.access in ('god', 'community_manager') and o.lead_region_id is not null)), '[]'::jsonb),
    'regions', (select jsonb_agg(jsonb_build_object('id', id, 'name', name) order by name) from regions)) end;
$$;

create or replace function private.pdr_kick_emails()
returns void language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url := 'https://jmslxbygvmjtwwxuzkrt.supabase.co/functions/v1/pdr-emails',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb, timeout_milliseconds := 60000);
exception when others then null; -- the cron picks it up
end $$;

create or replace function public.pdr_start(
  p_kind text, p_year int, p_person uuid, p_name text, p_email text,
  p_region uuid, p_meeting timestamptz, p_timezone text default 'Australia/Sydney')
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid; v_person uuid := p_person; v_name text := nullif(trim(p_name), '');
  v_email text := nullif(lower(trim(p_email)), ''); v_region uuid := p_region;
  o organisers; prev pdrs; v_me text; v_objectives jsonb := '[]'::jsonb;
begin
  if not private.runs_pdrs() then raise exception 'Only the community manager can start a PDR.'; end if;
  if p_kind not in ('annual', 'mid_year') then raise exception 'Unknown kind'; end if;
  if v_person is not null then
    select * into o from organisers where id = v_person;
    if not found then raise exception 'That person has no Hub account.'; end if;
  elsif v_email is not null then
    select * into o from organisers where lower(email) = v_email limit 1;
    if found then v_person := o.id; end if;
  else
    raise exception 'Pick an RSL or add their email.';
  end if;
  if o.id is not null then
    v_name := coalesce(v_name, o.name);
    v_email := coalesce(v_email, lower(o.email));
    v_region := coalesce(v_region, o.region_id, o.lead_region_id);
  end if;
  if v_name is null then raise exception 'Add their name.'; end if;
  if v_person is null and v_region is null then raise exception 'Pick their region.'; end if;

  select * into prev from pdrs
   where (v_person is not null and reviewee_id = v_person) or (v_email is not null and lower(reviewee_email) = v_email)
   order by year desc, created_at desc limit 1;
  if prev.id is not null then
    select coalesce(jsonb_agg(jsonb_build_object('text', g->>'text', 'status', '', 'comment', '')), '[]'::jsonb)
      into v_objectives
      from jsonb_array_elements(coalesce(prev.answers->'goals', '[]'::jsonb)) g
     where coalesce(trim(g->>'text'), '') <> '';
  end if;

  select name into v_me from organisers where id = auth.uid();
  insert into pdrs (kind, year, reviewee_id, reviewee_name, reviewee_email, region_id,
                    reviewer_id, reviewer_name, meeting_at, timezone, previous_id, answers)
  values (p_kind, p_year, v_person, v_name, v_email, v_region, auth.uid(), v_me,
          p_meeting, coalesce(nullif(p_timezone, ''), 'Australia/Sydney'), prev.id,
          jsonb_build_object('objectives', v_objectives))
  returning id into v_id;

  if v_person is not null then
    insert into notifications (user_id, kind, title, body, url)
    values (v_person, 'pdr', 'Your PDR is ready to fill in',
            coalesce(v_me, 'Your community manager') || ' has started your ' ||
            case p_kind when 'annual' then 'annual' else 'mid-year' end ||
            ' review. Fill in your draft before the meeting.', '/pdr/' || v_id);
  end if;
  perform private.pdr_kick_emails();
  return v_id;
end $$;

create or replace function public.pdr_update(p_id uuid, p_kind text, p_year int, p_meeting timestamptz)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not private.runs_pdrs() then raise exception 'Only the community manager can change this.'; end if;
  update pdrs set kind = coalesce(p_kind, kind), year = coalesce(p_year, year),
    meeting_at = p_meeting,
    reminder_sent_at = case when meeting_at is distinct from p_meeting then null else reminder_sent_at end,
    updated_at = now()
  where id = p_id;
end $$;

create or replace function public.pdr_delete(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not private.runs_pdrs() then raise exception 'Only the community manager can delete a PDR.'; end if;
  update pdrs set previous_id = null where previous_id = p_id;
  delete from pdrs where id = p_id;
end $$;

-- The RSL's answers (the reviewer can edit them too, in the meeting).
create or replace function public.pdr_save(p_id uuid, p_answers jsonb)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare p pdrs;
begin
  select * into p from pdrs where id = p_id for update;
  if not found or private.pdr_role(p) is null then raise exception 'Not found'; end if;
  if p.locked_at is not null then raise exception 'This PDR is signed off and locked.'; end if;
  update pdrs set answers = coalesce(p_answers, '{}'::jsonb), updated_at = now(),
    -- a change after one of you ticked means the tick no longer covers it
    reviewee_signed_at = null, reviewee_signed_name = null,
    reviewer_signed_at = null, reviewer_signed_name = null
  where id = p_id;
  return now();
end $$;

create or replace function public.pdr_save_notes(p_id uuid, p_notes jsonb)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare p pdrs;
begin
  select * into p from pdrs where id = p_id for update;
  if not found or private.pdr_role(p) is distinct from 'reviewer' then raise exception 'Not found'; end if;
  if p.locked_at is not null then raise exception 'This PDR is signed off and locked.'; end if;
  update pdrs set notes = coalesce(p_notes, '{}'::jsonb), updated_at = now() where id = p_id;
  return now();
end $$;

create or replace function public.pdr_submit(p_id uuid, p_on boolean default true)
returns void language plpgsql security definer set search_path = public as $$
declare p pdrs;
begin
  select * into p from pdrs where id = p_id for update;
  if not found or private.pdr_role(p) is null then raise exception 'Not found'; end if;
  update pdrs set submitted_at = case when p_on then coalesce(submitted_at, now()) end, updated_at = now()
  where id = p_id;
  if p_on and p.submitted_at is null and p.reviewer_id is not null and p.reviewer_id <> auth.uid() then
    insert into notifications (user_id, kind, title, body, url)
    values (p.reviewer_id, 'pdr', p.reviewee_name || '''s PDR draft is ready',
            'Add your notes before the meeting.', '/pdr/' || p.id);
  end if;
end $$;

create or replace function public.pdr_start_meeting(p_id uuid, p_on boolean default true)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not private.runs_pdrs() then raise exception 'Only the community manager can start the meeting.'; end if;
  update pdrs set notes_shared_at = case when p_on then coalesce(notes_shared_at, now()) end,
    updated_at = now() where id = p_id;
end $$;

create or replace function public.pdr_sign(p_id uuid, p_on boolean default true)
returns void language plpgsql security definer set search_path = public as $$
declare p pdrs; v_role text; v_name text; v_other uuid;
begin
  select * into p from pdrs where id = p_id for update;
  if not found then raise exception 'Not found'; end if;
  v_role := case when p.reviewee_id = auth.uid() then 'reviewee'
                 when private.runs_pdrs() then 'reviewer' end;
  if v_role is null then raise exception 'Not found'; end if;
  if p.locked_at is not null then raise exception 'This PDR is already signed off.'; end if;
  select name into v_name from organisers where id = auth.uid();
  if v_role = 'reviewee' then
    update pdrs set reviewee_signed_at = case when p_on then now() end,
      reviewee_signed_name = case when p_on then coalesce(v_name, p.reviewee_name) end where id = p_id;
    v_other := p.reviewer_id;
  else
    update pdrs set reviewer_signed_at = case when p_on then now() end,
      reviewer_signed_name = case when p_on then v_name end where id = p_id;
    v_other := p.reviewee_id;
  end if;
  update pdrs set locked_at = now(), updated_at = now()
   where id = p_id and reviewee_signed_at is not null and reviewer_signed_at is not null;
  if p_on and v_other is not null and v_other <> auth.uid() then
    insert into notifications (user_id, kind, title, body, url)
    select v_other, 'pdr',
      case when x.locked_at is not null then 'PDR signed off' else 'PDR ticked as an accurate record' end,
      case when x.locked_at is not null then 'You''ve both agreed. You can download the PDF now.'
           else coalesce(v_name, 'They') || ' ticked it. Your tick locks it in.' end,
      '/pdr/' || p_id
    from pdrs x where x.id = p_id;
  end if;
end $$;

create or replace function public.pdr_reopen(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not private.runs_pdrs() then raise exception 'Only the community manager can reopen a PDR.'; end if;
  update pdrs set locked_at = null, reviewee_signed_at = null, reviewee_signed_name = null,
    reviewer_signed_at = null, reviewer_signed_name = null, updated_at = now() where id = p_id;
end $$;

create or replace function public.pdr_set_goals(p_year int, p_goals jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not private.runs_pdrs() then raise exception 'Only the community manager can change these.'; end if;
  insert into pdr_org_goals (year, goals, updated_at, updated_by)
  values (p_year, coalesce(p_goals, '[]'::jsonb), now(), auth.uid())
  on conflict (year) do update set goals = excluded.goals, updated_at = now(), updated_by = auth.uid();
end $$;

create or replace function public.pdr_org_goals(p_year int)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when auth.uid() is not null then private.pdr_goals(p_year) end;
$$;

-- Who can run PDRs (God / Community Manager accounts with the switch).
create or replace function public.pdr_reviewers()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when private.runs_pdrs() then coalesce(jsonb_agg(jsonb_build_object(
      'id', id, 'name', name, 'email', email, 'access', access, 'on', runs_pdrs) order by name), '[]'::jsonb) end
  from organisers where access in ('god', 'community_manager');
$$;

create or replace function public.pdr_set_reviewer(p_user uuid, p_on boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not private.runs_pdrs() then raise exception 'Only someone who runs PDRs can change this.'; end if;
  if p_user = auth.uid() and not p_on then raise exception 'Give someone else the switch first, then they can turn yours off.'; end if;
  update organisers set runs_pdrs = p_on where id = p_user and access in ('god', 'community_manager');
end $$;

-- Invite link (/pdr/join/<token>): also the RSL's way into the Hub.
create or replace function public.pdr_invite_info(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', id, 'name', reviewee_name, 'reviewer', reviewer_name,
    'kind', kind, 'year', year, 'meeting_at', meeting_at, 'timezone', timezone,
    'region', (select name from regions where id = region_id),
    'claimed', reviewee_id is not null, 'mine', reviewee_id = auth.uid())
  from pdrs where invite_token = p_token;
$$;

create or replace function public.pdr_claim(p_token text, p_name text default null)
returns text language plpgsql security definer set search_path = public as $$
declare p pdrs; v_email text; v_name text;
begin
  if auth.uid() is null then return 'login'; end if;
  select * into p from pdrs where invite_token = p_token for update;
  if not found then return 'invalid'; end if;
  if p.reviewee_id is not null then
    return case when p.reviewee_id = auth.uid() or private.runs_pdrs() then 'ok:' || p.id else 'used' end;
  end if;
  select email into v_email from auth.users where id = auth.uid();
  v_name := coalesce(nullif(trim(p_name), ''), p.reviewee_name);
  if not exists (select 1 from organisers where id = auth.uid()) then
    if p.region_id is null then return 'no_region'; end if;
    insert into organisers (id, name, email, access, region_id)
    values (auth.uid(), v_name, coalesce(v_email, p.reviewee_email, ''), 'regional_lead', p.region_id);
  end if;
  update pdrs set reviewee_id = auth.uid(), updated_at = now() where id = p.id;
  return 'ok:' || p.id;
end $$;

-- Emails (Edge Function pdr-emails, cron every 15 min and right after Start).
create or replace function public.pdr_emails_due()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x), '[]'::jsonb) from (
    select jsonb_build_object('id', id, 'type', 'invite', 'email', reviewee_email,
      'name', reviewee_name, 'reviewer', reviewer_name, 'kind', kind, 'year', year,
      'meeting_at', meeting_at, 'timezone', timezone, 'token', invite_token) x
    from pdrs where invite_sent_at is null and reviewee_email is not null and locked_at is null
    union all
    select jsonb_build_object('id', id, 'type', 'reminder', 'email', reviewee_email,
      'name', reviewee_name, 'reviewer', reviewer_name, 'kind', kind, 'year', year,
      'meeting_at', meeting_at, 'timezone', timezone, 'token', invite_token)
    from pdrs where reminder_sent_at is null and reviewee_email is not null
      and invite_sent_at is not null and invite_sent_at < now() - interval '1 hour'
      and submitted_at is null and locked_at is null
      and meeting_at > now() and meeting_at < now() + interval '3 days'
  ) s;
$$;

create or replace function public.pdr_mark_emailed(p_id uuid, p_type text)
returns void language plpgsql security definer set search_path = public as $$
declare p pdrs;
begin
  if p_type = 'invite' then
    update pdrs set invite_sent_at = now() where id = p_id;
  else
    update pdrs set reminder_sent_at = now() where id = p_id returning * into p;
    if p.reviewee_id is not null then
      insert into notifications (user_id, kind, title, body, url)
      values (p.reviewee_id, 'pdr', 'Your PDR meeting is coming up',
              'Fill in your draft before the meeting.', '/pdr/' || p.id);
    end if;
  end if;
end $$;

revoke all on function public.pdr_list(), public.pdr_get(uuid), public.pdr_people(),
  public.pdr_start(text, int, uuid, text, text, uuid, timestamptz, text),
  public.pdr_update(uuid, text, int, timestamptz), public.pdr_delete(uuid),
  public.pdr_save(uuid, jsonb), public.pdr_save_notes(uuid, jsonb),
  public.pdr_submit(uuid, boolean), public.pdr_start_meeting(uuid, boolean),
  public.pdr_sign(uuid, boolean), public.pdr_reopen(uuid),
  public.pdr_set_goals(int, jsonb), public.pdr_org_goals(int),
  public.pdr_reviewers(), public.pdr_set_reviewer(uuid, boolean),
  public.pdr_invite_info(text), public.pdr_claim(text, text),
  public.pdr_emails_due(), public.pdr_mark_emailed(uuid, text) from public, anon;
grant execute on function public.pdr_list(), public.pdr_get(uuid), public.pdr_people(),
  public.pdr_start(text, int, uuid, text, text, uuid, timestamptz, text),
  public.pdr_update(uuid, text, int, timestamptz), public.pdr_delete(uuid),
  public.pdr_save(uuid, jsonb), public.pdr_save_notes(uuid, jsonb),
  public.pdr_submit(uuid, boolean), public.pdr_start_meeting(uuid, boolean),
  public.pdr_sign(uuid, boolean), public.pdr_reopen(uuid),
  public.pdr_set_goals(int, jsonb), public.pdr_org_goals(int),
  public.pdr_reviewers(), public.pdr_set_reviewer(uuid, boolean),
  public.pdr_claim(text, text) to authenticated;
grant execute on function public.pdr_invite_info(text) to anon, authenticated;
revoke execute on function public.pdr_emails_due(), public.pdr_mark_emailed(uuid, text) from authenticated;
grant execute on function public.pdr_emails_due(), public.pdr_mark_emailed(uuid, text) to service_role;

select cron.schedule('pdr-emails', '*/15 * * * *', $c$ select net.http_post(url := 'https://jmslxbygvmjtwwxuzkrt.supabase.co/functions/v1/pdr-emails', headers := '{"Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb, timeout_milliseconds := 60000) $c$);
