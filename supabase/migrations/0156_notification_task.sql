-- Action notifications remember which action they're about, so the bell can
-- show a tick box to mark it done straight from the notification.
alter table notifications add column if not exists task_id uuid references tasks (id) on delete set null;

-- Every place that makes an action notification now stores the action's id.
do $$
declare f record; d text;
begin
  for f in select p.oid from pg_proc p
           where p.proname in ('assign_task', 'create_event_tasks', 'create_hangout_tasks',
                               'create_monthly_tasks', 'create_special_promo_tasks')
  loop
    d := pg_get_functiondef(f.oid);
    d := replace(d, 'insert into notifications (user_id, kind, title, body, url)',
                    'insert into notifications (user_id, kind, title, body, url, task_id)');
    d := replace(d, E'''/me#tasks''\n    from made m', E'''/me#tasks'', m.id\n    from made m');
    d := replace(d, E'''/tasks''\n    from made m', E'''/tasks'', m.id\n    from made m');
    d := replace(d, E'''/me#tasks'');', E'''/me#tasks'', p_task_id);');
    execute d;
  end loop;
end $$;

-- Earlier action notifications: match them to the action made at the same time.
update notifications n set task_id = (
  select t.id from tasks t
  join people p on p.id = t.assigned_to
  where p.user_id = n.user_id and abs(extract(epoch from t.created_at - n.created_at)) < 120
  order by abs(extract(epoch from t.created_at - n.created_at)) limit 1)
where n.kind = 'task' and n.task_id is null;
update notifications n set task_id = (
  select t.id from tasks t
  join organisers o on o.id = n.user_id
    and ((o.access = 'regional_lead' and o.region_id = t.region_id) or (o.access = 'god' and o.lead_region_id = t.region_id))
  where t.region_id is not null and abs(extract(epoch from t.created_at - n.created_at)) < 120
  order by abs(extract(epoch from t.created_at - n.created_at)) limit 1)
where n.kind = 'task' and n.task_id is null;
