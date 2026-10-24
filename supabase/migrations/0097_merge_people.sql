-- (Applied as merge_people.) "Same person? Merge": fold a duplicate into the
-- person you keep. Check-ins, messages, roles, buddies and actions move
-- across; blank details are filled from the duplicate; the duplicate goes.
create or replace function public.merge_people(p_keep uuid, p_drop uuid)
returns text language plpgsql security definer set search_path = public as $$
declare k people%rowtype; d people%rowtype;
begin
  if p_keep = p_drop then return 'Pick a different person.'; end if;
  select * into k from people where id = p_keep for update;
  select * into d from people where id = p_drop for update;
  if k.id is null or d.id is null then return 'Couldn''t find both people.'; end if;
  if not (private.is_god() or (private.is_team_organiser(k.team_id) and private.is_team_organiser(d.team_id))) then
    return 'Only organisers of both communities can merge these.';
  end if;
  if k.user_id is not null and d.user_id is not null then
    return 'Both have their own accounts, so they can''t be merged here. Ask Kai.';
  end if;

  -- Check-ins (one per event).
  delete from attendance a where a.person_id = p_drop
    and exists (select 1 from attendance b where b.event_id = a.event_id and b.person_id = p_keep);
  update attendance set person_id = p_keep where person_id = p_drop;
  -- Personal messages (one per event).
  delete from person_messages m where m.person_id = p_drop and m.event_id is not null
    and exists (select 1 from person_messages n where n.event_id = m.event_id and n.person_id = p_keep);
  update person_messages set person_id = p_keep where person_id = p_drop;
  -- Core Team duties.
  delete from person_core_roles r where r.person_id = p_drop
    and exists (select 1 from person_core_roles s where s.core_role = r.core_role and s.person_id = p_keep);
  update person_core_roles set person_id = p_keep where person_id = p_drop;
  -- Buddies (one active buddy per newcomer).
  update buddy_pairings b set ended_at = now() where b.newcomer_id = p_drop and b.ended_at is null
    and exists (select 1 from buddy_pairings c where c.newcomer_id = p_keep and c.ended_at is null);
  update buddy_pairings set newcomer_id = p_keep where newcomer_id = p_drop;
  update buddy_pairings set buddy_id = p_keep where buddy_id = p_drop;
  delete from buddy_pairings where newcomer_id = buddy_id;
  -- Actions.
  delete from tasks t where t.person_id = p_drop
    and exists (select 1 from tasks u where u.person_id = p_keep and u.kind = t.kind);
  update tasks set person_id = p_keep, period = 'person:' || p_keep
    where person_id = p_drop;
  update tasks set assigned_to = p_keep where assigned_to = p_drop;
  update task_delegates set person_id = p_keep where person_id = p_drop;
  update task_owners set owner_id = p_keep where owner_id = p_drop;
  update task_owners set helper_id = p_keep where helper_id = p_drop;
  update team_task_kinds set delegate_to = p_keep where delegate_to = p_drop;
  update person_invites set person_id = p_keep where person_id = p_drop and used_at is not null;
  delete from person_invites where person_id = p_drop;

  -- Fill in what the kept person is missing.
  delete from people where id = p_drop;
  update people set
    last_name = coalesce(k.last_name, d.last_name),
    email = coalesce(k.email, d.email),
    phone = coalesce(k.phone, d.phone),
    suburb = coalesce(k.suburb, d.suburb),
    facebook_url = coalesce(k.facebook_url, d.facebook_url),
    consent_marketing = k.consent_marketing or d.consent_marketing,
    consent_given_at = coalesce(k.consent_given_at, d.consent_given_at),
    starting_outreach_count = greatest(k.starting_outreach_count, d.starting_outreach_count),
    created_at = least(k.created_at, d.created_at),
    attended_before_app = k.attended_before_app or d.attended_before_app,
    is_buddy = k.is_buddy or d.is_buddy,
    no_messages = k.no_messages or d.no_messages,
    new_to_activism = k.new_to_activism and d.new_to_activism,
    pending_role = coalesce(k.pending_role, d.pending_role),
    pending_region_id = coalesce(k.pending_region_id, d.pending_region_id),
    pending_team_id = coalesce(k.pending_team_id, d.pending_team_id),
    away_until = greatest(k.away_until, d.away_until)
  where id = p_keep;
  -- Their account, if only the duplicate had one.
  if k.user_id is null and d.user_id is not null then
    update people set user_id = d.user_id, linked_at = d.linked_at, linked_via = d.linked_via,
      tutorial_done_at = coalesce(k.tutorial_done_at, d.tutorial_done_at),
      notify_channel = coalesce(k.notify_channel, d.notify_channel)
    where id = p_keep;
  end if;
  return null;
end $$;
grant execute on function public.merge_people(uuid, uuid) to authenticated;
