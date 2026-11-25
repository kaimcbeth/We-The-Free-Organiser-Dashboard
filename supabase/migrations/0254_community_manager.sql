-- Community Manager role (Kai, 26 Nov 2026: "a community manager view
-- between god mode and RSL"). Everything God can do across every region,
-- except test accounts, "View as" and usage stats (still God only).
-- Like God, a Community Manager can also be a community's organiser and a
-- region's RSL (organiser_team_id / lead_region_id).

alter table organisers drop constraint organisers_access_check;
alter table organisers add constraint organisers_access_check
  check (access = any (array['god', 'community_manager', 'regional_lead', 'organiser', 'core_team']));

alter table organisers drop constraint organisers_access_scope;
alter table organisers add constraint organisers_access_scope check (
  (access in ('god', 'community_manager') and team_id is null and region_id is null)
  or (access = 'regional_lead' and region_id is not null and team_id is null)
  or (access in ('organiser', 'core_team') and team_id is not null and region_id is null)
);

alter table organisers drop constraint organisers_extra_roles_god_only;
alter table organisers add constraint organisers_extra_roles_god_only check (
  access in ('god', 'community_manager')
  or (organiser_team_id is null and lead_region_id is null)
);

alter table people drop constraint people_pending_role_check;
alter table people add constraint people_pending_role_check
  check (pending_role = any (array['community_manager', 'regional_lead', 'organiser', 'core_team']));

-- God or Community Manager.
create or replace function private.is_global_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from organisers o where o.id = auth.uid()
                 and o.access in ('god', 'community_manager'));
$$;

-- Give Community Managers what God has in every role and permission check,
-- by rewriting the 'god' tests inside these functions. usage_summary,
-- is_god and the test-account functions are left alone (God only).
do $$
declare
  f text;
  src text;
begin
  foreach f in array array[
    'private.can_manage_role(text,uuid,uuid)',
    'private.can_plan_region(uuid)',
    'private.can_use_beeper()',
    'private.can_use_hangouts()',
    'private.create_birthday_tasks()',
    'private.create_hangout_tasks()',
    'private.create_reconnect_tasks()',
    'private.create_region_milestone_tasks()',
    'private.create_region_quarterly_tasks()',
    'private.create_region_tasks()',
    'private.is_region_lead(uuid)',
    'private.is_regional_staff()',
    'private.is_team_organiser(uuid)',
    'private.notify_team_organisers(uuid,text,text,text,text)',
    'public.claim_role_invite(text,text)',
    'public.community_organisers(uuid[])',
    'public.create_role_invite(uuid,text)',
    'public.record_rain_forecast(jsonb)',
    'public.send_my_feedback(text,boolean)',
    'public.send_organiser_feedback(text,boolean)',
    'public.submit_open_feedback(text,text,text)',
    'public.weekly_summaries_due(boolean)'
  ] loop
    src := pg_get_functiondef(f::regprocedure);
    src := regexp_replace(src, '(\m[a-z]+\.)?access = ''god''', '\1access in (''god'', ''community_manager'')', 'g');
    src := replace(src, '(''god'', ''regional_lead'')', '(''god'', ''community_manager'', ''regional_lead'')');
    src := replace(src, '(''god'',''regional_lead'')', '(''god'', ''community_manager'', ''regional_lead'')');
    src := replace(src, '(''organiser'', ''god'')', '(''organiser'', ''god'', ''community_manager'')');
    execute src;
  end loop;

  foreach f in array array[
    'private.can_edit_special_event(uuid[])',
    'public.merge_people(uuid,uuid)',
    'public.set_action_ranking(text[],smallint[])',
    'public.set_equipment_order(text[])'
  ] loop
    begin
      src := pg_get_functiondef(f::regprocedure);
      execute replace(src, 'private.is_god()', 'private.is_global_staff()');
    exception when undefined_function then
      raise notice 'skipped %', f;
    end;
  end loop;
end $$;

-- God (only) can make Community Managers.
create or replace function private.can_manage_role(p_role text, p_team_id uuid, p_region_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from organisers me where me.id = auth.uid() and (
      (me.access = 'god' and p_role in ('community_manager', 'regional_lead', 'organiser', 'core_team'))
      or (me.access = 'community_manager' and p_role in ('regional_lead', 'organiser', 'core_team'))
      or (me.access = 'regional_lead' and p_role in ('organiser', 'core_team')
          and (select t.region_id from teams t where t.id = p_team_id) = me.region_id)
      or (me.access = 'organiser' and p_role = 'core_team' and p_team_id = me.team_id)
    )
  );
$$;

-- grant_role_in / apply_pending_role: a Community Manager has no team or region.
do $$
declare src text;
begin
  src := pg_get_functiondef('public.grant_role_in(uuid,text,uuid,uuid)'::regprocedure);
  src := replace(src,
    'elsif p_role in (''organiser'', ''core_team'') then',
    'elsif p_role = ''community_manager'' then
    null;
  elsif p_role in (''organiser'', ''core_team'') then');
  src := replace(src,
    'case when v_person.pending_role = ''regional_lead'' then null',
    'case when v_person.pending_role in (''regional_lead'', ''community_manager'') then null');
  execute src;

  src := pg_get_functiondef('private.apply_pending_role()'::regprocedure);
  src := replace(src,
    'case when new.pending_role = ''regional_lead'' then null else',
    'case when new.pending_role in (''regional_lead'', ''community_manager'') then null else');
  execute src;
end $$;

-- Roles list: Community Managers see every region's roles and each other;
-- only God sees God rows (and test people).
create or replace function public.list_roles()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id', o.id,
    'person_id', p.id,
    'name', coalesce(nullif(trim(p.first_name || ' ' || coalesce(p.last_name, '')), ''), o.name),
    'role', o.access,
    'team', t.name,
    'region', coalesce(r.name, tr.name),
    'also_team', ot.name,
    'also_region', lr.name,
    'can_manage', private.can_manage_role(o.access, o.team_id, o.region_id)
  ) order by case o.access when 'god' then 0 when 'community_manager' then 1 when 'regional_lead' then 2 when 'organiser' then 3 else 4 end, o.name), '[]'::jsonb)
  from organisers o
  left join people p on p.user_id = o.id
  left join teams t on t.id = o.team_id
  left join regions r on r.id = o.region_id
  left join regions tr on tr.id = t.region_id
  left join teams ot on ot.id = o.organiser_team_id
  left join regions lr on lr.id = o.lead_region_id
  where exists (select 1 from organisers me where me.id = auth.uid() and me.access <> 'core_team')
    and (p.id is null or not p.is_test or private.is_god())
    and (
      private.is_team_organiser(o.team_id)
      or o.id = auth.uid()
      or (o.region_id is not null and exists (
            select 1 from organisers me where me.id = auth.uid()
              and (me.access in ('god', 'community_manager') or me.region_id = o.region_id)))
      or (o.access = 'community_manager' and private.is_global_staff())
      or (o.access = 'god' and private.is_god())
    );
$$;

-- Shared-content policies: God or Community Manager.
alter policy "god manages facebook groups" on facebook_groups
  using (private.is_global_staff() or (team_id is not null and private.is_team_organiser(team_id))
         or exists (select 1 from unnest(facebook_groups.also_team_ids) x(x) where private.is_team_organiser(x.x)))
  with check (private.is_global_staff() or (team_id is not null and private.is_team_organiser(team_id))
         or exists (select 1 from unnest(facebook_groups.also_team_ids) x(x) where private.is_team_organiser(x.x)));
alter policy "god manages authorities" on approval_authorities
  using (private.is_global_staff()) with check (private.is_global_staff());
alter policy "suggest: read own or god" on feature_suggestions
  using (user_id = auth.uid() or private.is_global_staff());
alter policy "suggest: delete own or god" on feature_suggestions
  using (user_id = auth.uid() or private.is_global_staff());
alter policy "god reads hangouts" on hangouts using (private.is_global_staff());
alter policy "leads read their region's organiser feedback" on organiser_feedback
  using (private.is_global_staff() or (region_id is not null and private.is_region_lead(region_id)));
alter policy "hangout blocks write" on hangout_blocks
  using (case when region_id is null then private.is_global_staff() else private.can_plan_region(region_id) end)
  with check (case when region_id is null then private.is_global_staff() else private.can_plan_region(region_id) end);
