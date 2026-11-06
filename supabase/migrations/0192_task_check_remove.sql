-- Remove a box from a merged action (Kai, 6 Nov 2026: "a very small X to
-- delete the subtasks in the actions", e.g. Instagram on "Photos shared").
-- Per action: tasks.skipped holds the removed keys. Done = every box that's
-- left is ticked. The last box can't be removed.

alter table tasks add column if not exists skipped text[] not null default '{}';

create or replace function private.task_check_state(p_task_id uuid, p_checked text[], p_skipped text[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_keys text[];
  v_left text[];
  v_checked text[];
  v_skipped text[];
  v_all boolean;
begin
  select coalesce(array_agg(x->>'key'), '{}') into v_keys
  from tasks t join task_kinds k on k.kind = t.kind,
       jsonb_array_elements(coalesce(k.checklist, '[]')) x
  where t.id = p_task_id;
  v_skipped := array(select distinct s from unnest(p_skipped) s where s = any (v_keys));
  v_left := array(select k2 from unnest(v_keys) k2 where not (k2 = any (v_skipped)));
  if cardinality(v_left) = 0 then raise exception 'Keep at least one'; end if;
  v_checked := array(select distinct c from unnest(p_checked) c where c = any (v_left));
  v_all := (select bool_and(k3 = any (v_checked)) from unnest(v_left) k3);
  update tasks set checked = v_checked, skipped = v_skipped,
         done_at = case when v_all then coalesce(done_at, now()) else null end,
         done_by = case when v_all then coalesce(done_by, auth.uid()) else null end
  where id = p_task_id;
  return jsonb_build_object('checked', to_jsonb(v_checked), 'skipped', to_jsonb(v_skipped), 'done', v_all);
end $$;
revoke all on function private.task_check_state(uuid, text[], text[]) from public;

create or replace function private.can_check_task(v_task tasks)
returns boolean language sql stable security definer set search_path = public as $$
  select private.is_my_person(v_task.assigned_to) or private.is_team_organiser(v_task.team_id)
         or private.is_team_core(v_task.team_id)
         or (v_task.region_id is not null and private.is_region_lead(v_task.region_id))
$$;

create or replace function public.set_task_check(p_task_id uuid, p_key text, p_on boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_task tasks;
begin
  select * into v_task from tasks where id = p_task_id;
  if not found or not coalesce(private.can_check_task(v_task), false) then
    raise exception 'Not allowed';
  end if;
  if not exists (select 1 from task_kinds k, jsonb_array_elements(coalesce(k.checklist, '[]')) x
                 where k.kind = v_task.kind and x->>'key' = p_key) then
    raise exception 'Unknown box';
  end if;
  return private.task_check_state(p_task_id,
    case when p_on then array_append(v_task.checked, p_key) else array_remove(v_task.checked, p_key) end,
    v_task.skipped);
end $$;
grant execute on function public.set_task_check(uuid, text, boolean) to authenticated;

-- p_remove true = take the box off this action; false = put it back.
create or replace function public.set_task_skip(p_task_id uuid, p_key text, p_remove boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_task tasks;
begin
  select * into v_task from tasks where id = p_task_id;
  if not found or not coalesce(private.can_check_task(v_task), false) then
    raise exception 'Not allowed';
  end if;
  if not exists (select 1 from task_kinds k, jsonb_array_elements(coalesce(k.checklist, '[]')) x
                 where k.kind = v_task.kind and x->>'key' = p_key) then
    raise exception 'Unknown box';
  end if;
  return private.task_check_state(p_task_id,
    array_remove(v_task.checked, p_key),
    case when p_remove then array_append(v_task.skipped, p_key) else array_remove(v_task.skipped, p_key) end);
end $$;
grant execute on function public.set_task_skip(uuid, text, boolean) to authenticated;
