-- (Applied as approvals.) Police/council approval for outreach events.
-- approval_authorities: who a community sends its notice to, which form, and
--   how many days' notice they need (Sydney: NSW Police Form 1, 7 days).
-- person_private: the organiser's own legal name, home address and signature
--   path, visible only to them (used only on their own forms).
-- approval_submissions: what was sent, when, to whom (PDF kept in the private
--   "approvals" bucket). The send-approval Edge Function does the sending.
-- Action "approval_submitted" (Events Lead, outreach events only): shows 3
--   weeks before, due 8 days before.

create table approval_authorities (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null unique references teams (id) on delete cascade,
  name        text not null,              -- "NSW Police (Sydney City)"
  greeting    text not null,              -- "Sydney City Events Team"
  email       text not null,
  cc          text[] not null default '{}',
  form        text not null default 'nsw_form1',
  notice_days int not null default 7,
  created_at  timestamptz not null default now()
);
alter table approval_authorities enable row level security;
create policy "core team read authority" on approval_authorities
  for select to authenticated using (private.is_team_core(team_id));
create policy "god manages authorities" on approval_authorities
  for all to authenticated using (private.is_god()) with check (private.is_god());

insert into approval_authorities (team_id, name, greeting, email)
select id, 'NSW Police (Sydney City)', 'Sydney City Events Team', 'sydcityevents@police.nsw.gov.au'
from teams where name = 'Sydney, Australia' and not is_example;

create table person_private (
  user_id        uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  legal_name     text,
  address        text,
  postcode       text,
  phone          text,
  signature_path text,
  updated_at     timestamptz not null default now()
);
alter table person_private enable row level security;
create policy "own private details" on person_private
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table approval_submissions (
  id        uuid primary key default gen_random_uuid(),
  team_id   uuid not null references teams (id) on delete cascade,
  event_id  uuid references events (id) on delete set null,
  sent_by   uuid references auth.users (id) on delete set null,
  sent_to   text not null,
  test      boolean not null default false,
  pdf_path  text,
  sent_at   timestamptz not null default now()
);
alter table approval_submissions enable row level security;
create policy "core team read submissions" on approval_submissions
  for select to authenticated using (private.is_team_core(team_id));

insert into storage.buckets (id, name, public) values
  ('signatures', 'signatures', false), ('approvals', 'approvals', false)
on conflict (id) do nothing;
create policy "own signature" on storage.objects for all to authenticated
  using (bucket_id = 'signatures' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'signatures' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "core team read approvals" on storage.objects for select to authenticated
  using (bucket_id = 'approvals' and private.is_team_core(((storage.foldername(name))[1])::uuid));

insert into task_kinds (kind, title, blurb, description, core_role, schedule,
                        anchor, appear_hours, due_after_hours, estimate_minutes, estimate_max_minutes,
                        expire_anchor, expire_after_hours, sort_order, default_enabled, outreach_only)
values ('approval_submitted', 'Police approval sent', 'Notice of the event sent to the police',
 'The notice for this event has gone to the police (or council), with at least a week''s notice. The Hub fills in the form and emails it for you.',
 'events_lead', 'event', 'start', -504, -192, 5, null, 'start', 0, 20, false, true);

insert into team_task_kinds (team_id, kind, enabled)
select id, 'approval_submitted', true from teams where name = 'Sydney, Australia' and not is_example
on conflict (team_id, kind) do update set enabled = true;
