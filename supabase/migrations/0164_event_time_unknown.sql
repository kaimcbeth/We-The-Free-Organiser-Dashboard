-- Events with a date but no known time (e.g. old ones copied from Facebook).
-- starts_at holds midday on that date; the app hides the time.
alter table public.events add column if not exists time_unknown boolean not null default false;
