-- God Mode test accounts: real logins flagged is_test, made from the app,
-- that God Mode can sign in as (via the test-login Edge Function).
alter table people add column is_test boolean not null default false;

create or replace function private.is_god()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from organisers where id = auth.uid() and access = 'god');
$$;
revoke execute on function private.is_god() from public, anon;
grant execute on function private.is_god() to authenticated;

-- (create_test_account and list_test_accounts: see the applied migration
-- "test_accounts"; they create an auth user + identity + people row
-- (is_test) and an optional organisers row, God Mode only.)
