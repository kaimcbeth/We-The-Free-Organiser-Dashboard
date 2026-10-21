-- The test person is called "Fergus (Test Account)". (Applied as test_person_fergus;
-- also updates ensure_test_person and set_test_role to use that name.)
update people set first_name = 'Fergus', last_name = '(Test Account)' where is_test;
update organisers o set name = 'Fergus (Test Account)' from people p where p.user_id = o.id and p.is_test;
