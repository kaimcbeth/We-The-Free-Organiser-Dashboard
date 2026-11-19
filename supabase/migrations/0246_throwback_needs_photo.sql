-- Throwback actions only when there's a photo to share (Kai, 19 Nov 2026:
-- "Only generate throwback photo action if there is a photo to be shared in
-- the hub"). A throwback photo = in the community's Photo Hub, not removed,
-- not "not for promo", and from at least 4 weeks ago (its event's date, else
-- its hand-set month/year, else when it was uploaded).
create or replace function private.has_throwback_photo(p_team uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from event_photos p
    left join events e on e.id = p.event_id
    where p.team_id = p_team
      and p.archived_at is null
      and not coalesce(p.no_promo, false)
      and coalesce(e.starts_at,
                   case when p.taken_year is not null
                        then make_date(p.taken_year, coalesce(p.taken_month, 1), 1)::timestamptz end,
                   p.created_at) < now() - interval '28 days'
  );
$$;

-- Fortnightly throwback (create_monthly_tasks) and the special event
-- throwback step (create_special_promo_tasks): patched by text replace.
do $$
declare d text;
begin
  d := pg_get_functiondef('private.create_monthly_tasks'::regproc);
  if position('has_throwback_photo' in d) = 0 then
    d := replace(d,
      $a$    where t.today >= date '2026-11-16'$a$,
      $a$    where t.today >= date '2026-11-16'
      and (k.kind <> 'promo_throwback' or private.has_throwback_photo(t.id))$a$);
    execute d;
  end if;
  d := pg_get_functiondef('private.create_special_promo_tasks'::regproc);
  if position('has_throwback_photo' in d) = 0 then
    d := replace(d,
      $a$    where e.special_event_id is not null$a$,
      $a$    where e.special_event_id is not null
      and (s.kind <> 'special_throwback' or private.has_throwback_photo(e.team_id))$a$);
    execute d;
  end if;
end $$;

-- Tidy up: open throwback actions in communities with nothing to share.
update tasks set dismissed_at = now()
where kind in ('promo_throwback', 'special_throwback')
  and done_at is null and dismissed_at is null
  and team_id is not null
  and not private.has_throwback_photo(team_id);
