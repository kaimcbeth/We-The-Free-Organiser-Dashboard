-- Kai, 6 Nov 2026: copy/download Meet the Members captions one by one from the planner.
alter table public.social_plan add column if not exists captions text[];
comment on column public.social_plan.captions is 'One caption per slide (Meet the Members), in slide order; caption holds them all joined.';
