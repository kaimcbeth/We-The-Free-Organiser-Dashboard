-- Supabase's sign-in service can't read accounts whose token fields are NULL,
-- so "Sign in as Fergus" failed. Fill them with '' (existing and new test accounts).
update auth.users u set
  confirmation_token = coalesce(confirmation_token, ''),
  recovery_token = coalesce(recovery_token, ''),
  email_change_token_new = coalesce(email_change_token_new, ''),
  email_change = coalesce(email_change, '')
where u.id in (select user_id from public.people where is_test and user_id is not null);

-- ensure_test_person now inserts '' for those fields and names new test people
-- "Fergus (Test Account)" (applied as test_person_auth_fields).
