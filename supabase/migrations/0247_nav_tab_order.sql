-- Top-bar tab order (Kai, 19 Nov 2026: "Click and drag these to rearrange them").
-- Keys of main tabs (events, actions…) and pins in the order the person dragged them.
alter table public.nav_pins add column if not exists tab_order text[] not null default '{}';
