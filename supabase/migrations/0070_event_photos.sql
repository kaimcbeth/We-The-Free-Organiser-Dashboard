-- (Applied as event_photos.) Event photos uploaded by organisers and Core
-- Team (private bucket event-photos/<team>/<event>/<id>.jpg, shrunk to 2000px
-- on the phone), kept forever. favourite = used first on graphics; no_promo =
-- never on graphics. Uploading ticks off "Event photos taken".
create table public.event_photos (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id),
  event_id uuid not null references public.events(id),
  path text not null unique,
  width int,
  height int,
  uploaded_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  favourite boolean not null default false,
  no_promo boolean not null default false,
  archived_at timestamptz
);
-- RLS: private.is_team_core(team_id) for select/insert/update; storage
-- policies "event photos read/upload" use private.photo_team(name). Trigger
-- event_photos_tick_task -> private.photos_done_task(). (Full SQL as applied.)
