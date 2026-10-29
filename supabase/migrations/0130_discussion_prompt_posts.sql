-- Which group chat discussion prompts each community has posted, and when.
create table if not exists public.discussion_prompt_posts (
  team_id uuid not null references teams(id) on delete cascade,
  prompt_id text not null,
  posted_at timestamptz not null default now(),
  posted_by uuid default auth.uid(),
  primary key (team_id, prompt_id)
);
alter table public.discussion_prompt_posts enable row level security;
create policy "organisers see prompt posts" on public.discussion_prompt_posts for select
  to authenticated using (private.is_team_organiser(team_id));
create policy "organisers mark prompts posted" on public.discussion_prompt_posts for insert
  to authenticated with check (private.is_team_organiser(team_id));
create policy "organisers change prompt posts" on public.discussion_prompt_posts for update
  to authenticated using (private.is_team_organiser(team_id)) with check (private.is_team_organiser(team_id));
create policy "organisers unmark prompts" on public.discussion_prompt_posts for delete
  to authenticated using (private.is_team_organiser(team_id));
