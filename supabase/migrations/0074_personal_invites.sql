-- (Applied as personal_invites.) Personal messages before events.
-- people.no_messages: they'd rather not get them (never listed again).
-- person_messages: who was messaged, for which event, by whom, and whether
-- it was an invite or an ask (help out / bring a friend). Used to space
-- messages out (see src/lib/invites.ts for the rules).
-- Action "personal_invites" (Community Lead): shows 5 days before, due 3
-- days before. Starts switched off like the other newer role actions.

alter table people add column no_messages boolean not null default false;

create table person_messages (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references teams (id) on delete cascade,
  person_id  uuid not null references people (id) on delete cascade,
  event_id   uuid references events (id) on delete set null,
  kind       text not null default 'invite' check (kind in ('invite', 'ask')),
  sent_by    uuid references auth.users (id) on delete set null default auth.uid(),
  sent_at    timestamptz not null default now(),
  unique (person_id, event_id)
);
create index person_messages_person on person_messages (person_id, sent_at desc);
alter table person_messages enable row level security;
create policy "core team read messages" on person_messages
  for select to authenticated using (private.is_team_core(team_id));
create policy "core team log messages" on person_messages
  for insert to authenticated with check (private.is_team_core(team_id));
create policy "core team undo messages" on person_messages
  for delete to authenticated using (private.is_team_core(team_id));

insert into task_kinds (kind, title, blurb, description, core_role, schedule,
                        anchor, appear_hours, due_after_hours, estimate_minutes, estimate_max_minutes,
                        expire_anchor, expire_after_hours, sort_order, default_enabled)
values ('personal_invites', 'Personal invites sent', 'Message the people on this event''s list',
 'Everyone on this event''s invite list has had a personal message. The list picks who, based on how often they come.',
 'community_lead', 'event', 'start', -120, -72, 10, 20, 'start', 0, 40, false);
