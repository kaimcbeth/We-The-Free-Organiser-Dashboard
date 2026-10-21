-- Directory of local Facebook groups for promoting events. God Mode only for now.
create table public.facebook_groups (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id),
  name text not null check (length(trim(name)) > 0),
  url text not null check (url ~* '^https?://'),
  category text not null default 'vegan' check (category in ('vegan', 'animal_rights', 'local', 'other')),
  members integer check (members is null or members >= 0),
  notes text,
  added_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create unique index facebook_groups_url_live on public.facebook_groups (lower(url)) where archived_at is null;
create index facebook_groups_team on public.facebook_groups (team_id);

alter table public.facebook_groups enable row level security;
create policy "god manages facebook groups" on public.facebook_groups
  for all to authenticated
  using (private.is_god()) with check (private.is_god());
