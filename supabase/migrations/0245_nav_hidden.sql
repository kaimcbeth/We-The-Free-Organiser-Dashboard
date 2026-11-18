-- Main tabs can be hidden too (Kai, 19 Nov 2026: "options to remove all of
-- them but have events, actions, insights, resources and funding as default").
alter table public.nav_pins add column if not exists hidden text[] not null default '{}';
