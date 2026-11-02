-- Monthly photo recap (Kai, 2 Nov 2026): the "Monthly recap posted" action
-- now shows up 5 days before the month ends and is due (and goes away) 5 days
-- into the next month, was 3 and 3. On by default, so every community gets
-- it (they can switch it off in Choose actions). Its card opens the new
-- recap carousel maker (cover, one photo per slide, next month's events).
do $$
declare d text;
begin
  d := pg_get_functiondef('private.create_extra_tasks()'::regprocedure);
  d := replace(d, '-- End of month: from 3 days before the month ends.',
                  '-- End of month: from 5 days before the month ends (Kai, 2 Nov 2026).');
  d := replace(d, $q$interval '1 month' + interval '3 days'$q$, $q$interval '1 month' + interval '5 days'$q$);
  d := replace(d, $q$interval '1 month' - interval '3 days'$q$, $q$interval '1 month' - interval '5 days'$q$);
  d := replace(d, '-- ...and gone once 3 days into the next month.',
                  '-- ...and gone once 5 days into the next month.');
  execute d;
end $$;

update task_kinds set
  default_enabled = true,
  blurb = 'A carousel of this month''s photos, and what''s coming up',
  description = 'Make a recap carousel of this month''s photos (Make recap): a big cover, one photo per slide with its event''s name, date, place and type, and next month''s events at the end. Post it on Instagram and Facebook. Shows up 5 days before the month ends.'
where kind = 'promo_monthly_recap';
