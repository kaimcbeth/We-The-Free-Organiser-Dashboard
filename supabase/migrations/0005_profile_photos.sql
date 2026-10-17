-- Profile photos.
-- Stored privately in the "avatars" bucket as <person_id>.jpg. Only organisers
-- of that person's team, or the person themselves, can see or change it.
-- The app shows photos through short-lived signed links.

alter table people add column photo_updated_at timestamptz;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Which person a photo file belongs to ("<uuid>.jpg" -> uuid), or null.
create or replace function private.avatar_person(p_name text)
returns uuid language sql immutable as $$
  select case when p_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'
    then left(p_name, 36)::uuid end;
$$;

-- Organiser of the person's team, or the person themselves.
create or replace function private.can_manage_person(p_person_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from people p
    where p.id = p_person_id
      and (p.user_id = auth.uid() or private.is_team_organiser(p.team_id))
  );
$$;

revoke execute on function private.can_manage_person(uuid) from public, anon;
grant execute on function private.avatar_person(text), private.can_manage_person(uuid) to authenticated;

create policy "avatars read" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and private.can_manage_person(private.avatar_person(name)));
create policy "avatars upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and private.can_manage_person(private.avatar_person(name)));
create policy "avatars replace" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and private.can_manage_person(private.avatar_person(name)))
  with check (bucket_id = 'avatars' and private.can_manage_person(private.avatar_person(name)));
create policy "avatars remove" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and private.can_manage_person(private.avatar_person(name)));

-- Record that a person's photo was added, changed or removed.
create or replace function public.set_person_photo(p_person_id uuid, p_has_photo boolean)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not private.can_manage_person(p_person_id) then return false; end if;
  update people set photo_updated_at = case when p_has_photo then now() end where id = p_person_id;
  return true;
end;
$$;

revoke execute on function public.set_person_photo(uuid, boolean) from public, anon;
grant execute on function public.set_person_photo(uuid, boolean) to authenticated;
