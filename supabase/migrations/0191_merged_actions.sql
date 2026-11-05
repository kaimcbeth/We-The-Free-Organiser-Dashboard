-- Fewer, bigger actions (Kai, 6 Nov 2026: "the merges sound good with
-- checkboxes"). Nine platform-specific actions become three, each with a
-- checklist inside:
--   Facebook event set up = Facebook event created + invites sent
--   Event promoted        = WhatsApp community + local Facebook groups + Instagram
--   Photos shared         = photos to WhatsApp + Facebook + Instagram
-- Ticking every box completes the action. Old kinds are archived; their open
-- actions are dismissed and carried into the new ones (ticked boxes kept).
-- Communities keep their on/off choice (on if any of the old ones was on).

alter table task_kinds add column if not exists checklist jsonb;
alter table tasks add column if not exists checked text[] not null default '{}';

insert into task_kinds (kind, title, description, blurb, estimate_minutes, estimate_max_minutes, due_after_hours,
                        sort_order, anchor, appear_hours, audience, schedule, core_role, default_enabled, late_ok, checklist)
values
  ('fb_event_setup', 'Facebook event set up',
   'The event is up on Facebook so people can RSVP and share it, and invites have gone out to friends and local members.',
   'Create the Facebook event and send invites', 5, 10, -48, 0, 'start', -336, 'community', 'event', 'promo_lead', true, false,
   '[{"key":"created","label":"Event created on Facebook"},{"key":"invites","label":"Invites sent to friends and local members"}]'),
  ('promote_event', 'Event promoted',
   'The event is out there: posted in the WhatsApp community, shared in local Facebook groups and on the community''s Instagram. Tick each place as you go.',
   'Post it in WhatsApp, Facebook groups and Instagram', 10, 20, -60, 1, 'start', -168, 'community', 'event', 'promo_lead', true, false,
   '[{"key":"whatsapp","label":"WhatsApp community"},{"key":"facebook_groups","label":"Local Facebook groups"},{"key":"instagram","label":"Community Instagram"}]'),
  ('photos_shared', 'Photos shared',
   'The best photos from the event are up. Tick each place once they''re posted, whoever posted them.',
   'Best photos on WhatsApp, Facebook and Instagram', 5, 15, 168, 11, 'end', 0, 'community', 'event', 'promo_lead', true, false,
   '[{"key":"whatsapp","label":"WhatsApp community"},{"key":"facebook","label":"Facebook"},{"key":"instagram","label":"Instagram"}]')
on conflict (kind) do nothing;

create temp table merge_map (old text, new text, key text) on commit drop;
insert into merge_map values
  ('facebook_event', 'fb_event_setup', 'created'), ('facebook_invites', 'fb_event_setup', 'invites'),
  ('promote_whatsapp', 'promote_event', 'whatsapp'), ('promote_facebook_groups', 'promote_event', 'facebook_groups'),
  ('promote_instagram', 'promote_event', 'instagram'),
  ('post_photos', 'photos_shared', 'whatsapp'), ('post_photos_facebook', 'photos_shared', 'facebook'),
  ('post_photos_instagram', 'photos_shared', 'instagram');

-- Community choices: on if any old one was on (only where they'd chosen).
insert into team_task_kinds (team_id, kind, enabled, delegate_to)
select s.team_id, m.new, bool_or(coalesce(s.enabled, k.default_enabled)),
       (array_agg(s.delegate_to) filter (where s.delegate_to is not null))[1]
from team_task_kinds s
join merge_map m on m.old = s.kind
join task_kinds k on k.kind = s.kind
group by s.team_id, m.new
on conflict (team_id, kind) do nothing;

insert into task_owners (team_id, kind, owner_id, helper_id, created_at, ended_at)
select distinct on (o.team_id, m.new) o.team_id, m.new, o.owner_id, o.helper_id, o.created_at, o.ended_at
from task_owners o join merge_map m on m.old = o.kind
order by o.team_id, m.new, o.created_at
on conflict do nothing;

-- Carry existing actions over (one per event and new kind).
insert into tasks (team_id, event_id, kind, due_at, assigned_to, checked, done_at, done_by, created_at)
select t.team_id, t.event_id, m.new, max(t.due_at),
       (array_agg(t.assigned_to) filter (where t.assigned_to is not null))[1],
       coalesce(array_agg(m.key) filter (where t.done_at is not null), '{}'),
       case when bool_and(t.done_at is not null) then max(t.done_at) end,
       (array_agg(t.done_by) filter (where t.done_by is not null))[1],
       min(t.created_at)
from tasks t join merge_map m on m.old = t.kind
where t.event_id is not null and t.dismissed_at is null
group by t.team_id, t.event_id, m.new
on conflict (event_id, kind) do nothing;

update tasks set dismissed_at = now()
where kind in (select old from merge_map) and done_at is null and dismissed_at is null;

update task_kinds set archived_at = now()
where kind in (select old from merge_map) and archived_at is null;

-- Tick or untick a box on an action's checklist; all ticked = done.
create or replace function public.set_task_check(p_task_id uuid, p_key text, p_on boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_task tasks;
  v_keys text[];
  v_checked text[];
  v_all boolean;
begin
  select * into v_task from tasks where id = p_task_id;
  if not found or not (private.is_my_person(v_task.assigned_to) or private.is_team_organiser(v_task.team_id)
                       or private.is_team_core(v_task.team_id)
                       or (v_task.region_id is not null and private.is_region_lead(v_task.region_id))) then
    raise exception 'Not allowed';
  end if;
  select coalesce(array_agg(x->>'key'), '{}') into v_keys
  from task_kinds k, jsonb_array_elements(coalesce(k.checklist, '[]')) x where k.kind = v_task.kind;
  if not (p_key = any (v_keys)) then raise exception 'Unknown box'; end if;
  v_checked := array(select distinct c from unnest(
                 case when p_on then array_append(v_task.checked, p_key)
                      else array_remove(v_task.checked, p_key) end) c where c = any (v_keys));
  v_all := (select bool_and(k2 = any (v_checked)) from unnest(v_keys) k2);
  update tasks set checked = v_checked,
         done_at = case when v_all then coalesce(done_at, now()) else null end,
         done_by = case when v_all then coalesce(done_by, auth.uid()) else null end
  where id = p_task_id;
  return jsonb_build_object('checked', to_jsonb(v_checked), 'done', v_all);
end $$;
grant execute on function public.set_task_check(uuid, text, boolean) to authenticated;
