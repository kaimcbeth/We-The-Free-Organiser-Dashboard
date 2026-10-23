-- (Applied as event_notes.) Organisers' own notes on an event (never touched
-- by the activism.wtf import).
alter table public.events add column notes text check (notes is null or length(notes) <= 5000);
