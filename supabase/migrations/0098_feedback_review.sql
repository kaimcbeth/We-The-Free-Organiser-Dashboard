-- (Applied as feedback_review.) "Feedback reviewed": a follow-up 7 days after
-- "Volunteer feedback collected" is ticked off, due 3 days later, only when
-- volunteers have actually answered.
alter table task_kinds drop constraint task_kinds_schedule_check;
alter table task_kinds add constraint task_kinds_schedule_check
  check (schedule in ('event', 'weekly', 'monthly', 'quarterly', 'newcomer', 'month_end', 'follow_up'));

insert into task_kinds (kind, title, blurb, description, estimate_minutes, due_after_hours, sort_order, anchor,
                        appear_hours, audience, core_role, schedule, default_enabled)
values ('com_feedback_review', 'Feedback reviewed', 'Read what volunteers said',
        'You''ve read the feedback, noted anything to act on, and thanked the community for answering.',
        15, 0, 53, 'end', 0, 'community', 'community_lead', 'follow_up', true);

do $$
declare d text;
begin
  d := pg_get_functiondef('private.create_extra_tasks()'::regprocedure);
  d := replace(d, '  return v_count;
end', '  -- Feedback reviewed: a week after asking, if anyone answered.
  with fb as (
    select t.team_id, t.id, t.done_at from tasks t
    where t.kind = ''com_feedback'' and t.done_at between now() - interval ''14 days'' and now() - interval ''7 days''
  ), made as (
    insert into tasks (team_id, kind, period, due_at, assigned_to)
    select fb.team_id, k.kind, ''review:'' || fb.id, fb.done_at + interval ''10 days'',
           private.task_assignee(fb.team_id, k.kind, null, current_date)
    from fb join task_kinds k on k.kind = ''com_feedback_review'' and k.archived_at is null
    where exists (select 1 from volunteer_feedback v
                  where v.team_id = fb.team_id and v.created_at > fb.done_at - interval ''3 days'')
    on conflict (team_id, kind, period) where period is not null do nothing
    returning 1
  ) select count(*) into n from made;
  v_count := v_count + n;
  return v_count;
end');
  if d not like '%com_feedback_review%' then raise exception 'pattern not found'; end if;
  execute d;
end $$;
