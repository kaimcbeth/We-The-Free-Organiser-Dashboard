-- (Applied as members_view_photo_hub.) Members can see (and download) their
-- community's Photo Hub photos (the ones not tied to an event), but not change
-- them.
create function private.is_team_member(p_team_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from people where user_id = auth.uid() and team_id = p_team_id);
$$;

create policy "members read photo hub" on public.event_photos for select to authenticated
  using (event_id is null and archived_at is null and private.is_team_member(team_id));

create policy "members read photo hub files" on storage.objects for select to authenticated
  using (
    bucket_id = 'event-photos'
    and split_part(name, '/', 2) = 'library'
    and private.is_team_member(private.photo_team(name))
  );
