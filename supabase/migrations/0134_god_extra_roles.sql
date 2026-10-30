-- A God account can also be a community's organiser and a region's Regional
-- Support Lead (one role per account otherwise): organisers.organiser_team_id
-- and organisers.lead_region_id, God only. Their own community opens by
-- default, they're listed with that community's organisers, and they get the
-- region's RSL actions.
alter table public.organisers add column if not exists organiser_team_id uuid references teams(id) on delete set null;
alter table public.organisers add column if not exists lead_region_id uuid references regions(id) on delete set null;
alter table public.organisers drop constraint if exists organisers_extra_roles_god_only;
alter table public.organisers add constraint organisers_extra_roles_god_only
  check (access = 'god' or (organiser_team_id is null and lead_region_id is null));

create or replace function public.community_organisers(p_team_ids uuid[])
 returns jsonb language sql stable security definer set search_path to 'public' as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
    'team_id', x.team_id, 'person_id', x.person_id, 'first_name', x.first_name,
    'name', x.name, 'phone', x.phone, 'email', x.email, 'facebook_url', x.facebook_url,
    'pending', x.pending) order by x.first_name), '[]'::jsonb)
  from (
    select coalesce(o.organiser_team_id, o.team_id) team_id, p.id person_id, p.first_name,
           trim(p.first_name || ' ' || coalesce(p.last_name, '')) name,
           p.phone, coalesce(p.email, o.email) email, p.facebook_url, false pending
    from organisers o join people p on p.user_id = o.id
    where ((o.access = 'organiser' and o.team_id = any(p_team_ids))
           or (o.access = 'god' and o.organiser_team_id = any(p_team_ids)))
      and not p.is_test
    union all
    select coalesce(p.pending_team_id, p.team_id), p.id, p.first_name,
           trim(p.first_name || ' ' || coalesce(p.last_name, '')), p.phone, p.email, p.facebook_url, true
    from people p
    where p.pending_role = 'organiser' and p.user_id is null and not p.is_test
      and coalesce(p.pending_team_id, p.team_id) = any(p_team_ids)
  ) x
  where private.is_regional_staff() and private.is_team_organiser(x.team_id);
$function$;

create or replace function public.list_roles()
 returns jsonb language sql stable security definer set search_path to 'public' as $function$
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
  ) order by case o.access when 'god' then 0 when 'regional_lead' then 1 when 'organiser' then 2 else 3 end, o.name), '[]'::jsonb)
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
              and (me.access = 'god' or me.region_id = o.region_id)))
      or (o.access = 'god' and exists (select 1 from organisers me where me.id = auth.uid() and me.access = 'god'))
    );
$function$;

-- Kai: Sydney organiser and Oceania Regional Support Lead, keeping God.
update public.organisers
   set organiser_team_id = (select id from teams where name = 'Sydney, Australia'),
       lead_region_id = (select id from regions where name = 'Oceania')
 where email = 'kai@activism.wtf' and access = 'god';
