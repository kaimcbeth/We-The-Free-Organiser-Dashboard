-- Organisers only enter names. Everything personal (suburb, email, phone,
-- photo, consent) is entered by the member themselves when they connect.

-- Organisers (signed-in app users) can only write these columns directly.
-- Members' own changes go through join_team / update_my_profile /
-- set_person_photo, which run with the database owner's rights.
revoke insert, update on people from authenticated;
grant insert (team_id, first_name, last_name, added_via) on people to authenticated;
grant update (first_name, last_name) on people to authenticated;

-- Photos: only the member can add or change their own.
-- Organisers can still see them, and removing a person still removes the photo.
alter policy "avatars upload" on storage.objects
  with check (bucket_id = 'avatars' and private.is_my_person(private.avatar_person(name)));
alter policy "avatars replace" on storage.objects
  using (bucket_id = 'avatars' and private.is_my_person(private.avatar_person(name)))
  with check (bucket_id = 'avatars' and private.is_my_person(private.avatar_person(name)));

create or replace function public.set_person_photo(p_person_id uuid, p_has_photo boolean)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not private.is_my_person(p_person_id) then return false; end if;
  update people set photo_updated_at = case when p_has_photo then now() end where id = p_person_id;
  return true;
end;
$$;
