-- After-party host (Kai, 5 Nov 2026): more than a month before a special
-- event, ask the community if someone can offer their place for an after
-- party. A new step in the special event promo cycle (0178): shows 7 weeks
-- before, due 5 weeks before. The card has ready-made chat messages.

insert into task_kinds (kind, title, description, blurb, estimate_minutes, due_after_hours, sort_order,
                        anchor, appear_hours, audience, schedule, core_role, default_enabled, late_ok)
values ('special_afterparty', 'After-party host asked for',
        'Ask in the WhatsApp community if someone would like to offer their place for an after party once the event wraps up. Asking early gives people time to check with housemates and plan.',
        'After-party host (5 weeks before)', 5, 0, 2, 'start', 0, 'community', 'special', 'community_lead', true, false)
on conflict (kind) do nothing;

do $$
declare d text;
begin
  d := pg_get_functiondef('private.create_special_promo_tasks'::regproc);
  if position('special_afterparty' in d) = 0 then
    d := replace(d,
      $r$('special_announce',  'start', -1008,  -864),$r$,
      $r$('special_afterparty', 'start', -1176,  -840),
           ('special_announce',  'start', -1008,  -864),$r$);
    if position('special_afterparty' in d) = 0 then
      raise exception 'create_special_promo_tasks: step list not found';
    end if;
    execute d;
  end if;
end $$;
