-- (Applied as organisers_edit_contacts.) Organisers can add or fix a phone
-- number, email or Facebook link for anyone in their community (not just
-- people with a role). Members can still add their own.
do $$
declare f text; d text;
begin
  foreach f in array array['public.set_person_contact(uuid,text,text)', 'public.set_person_facebook(uuid,text)'] loop
    d := pg_get_functiondef(f::regprocedure);
    d := replace(d, '  if not private.is_regional_staff()
     and v_person.pending_role is null
     and not exists (select 1 from organisers o where o.id = v_person.user_id and v_person.user_id is not null) then
    return ''no_role'';
  end if;
', '');
    if d like '%no_role%' then raise exception 'pattern not found in %', f; end if;
    execute d;
  end loop;
end $$;
