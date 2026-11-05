-- Social media planner (Kai, 5 Nov 2026): a calendar in the Social Media Hub
-- with the community's upcoming events and planned posts. A post can start
-- as a quick note for a day ("Throwback from the potluck?") and later get a
-- caption, platforms and images, saved straight from Write post and the
-- graphic maker in Actions. Nothing posts by itself: it's a plan.

create table if not exists public.social_plan (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  day date not null,
  note text,                       -- quick placeholder text
  caption text,                    -- the post itself
  platforms text[] not null default '{}',
  image_paths text[] not null default '{}',  -- storage bucket social-plan
  event_id uuid references events(id) on delete set null,
  posted_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (coalesce(nullif(trim(note), ''), nullif(trim(caption), '')) is not null
         or cardinality(image_paths) > 0)
);
create index if not exists social_plan_team_day on public.social_plan (team_id, day);
alter table public.social_plan enable row level security;
drop policy if exists "core team plans posts" on public.social_plan;
create policy "core team plans posts" on public.social_plan for all to authenticated
  using (private.is_team_core(team_id)) with check (private.is_team_core(team_id));

insert into storage.buckets (id, name, public)
values ('social-plan', 'social-plan', false)
on conflict (id) do nothing;

drop policy if exists "social plan files" on storage.objects;
create policy "social plan files" on storage.objects for all to authenticated
  using (bucket_id = 'social-plan' and private.is_team_core(((storage.foldername(name))[1])::uuid))
  with check (bucket_id = 'social-plan' and private.is_team_core(((storage.foldername(name))[1])::uuid));
