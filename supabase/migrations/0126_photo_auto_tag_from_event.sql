-- (Applied as photo_auto_tag_from_event.) Photos attached to an event
-- (uploaded there, or moved from the Photo Hub) are tagged from the listing:
-- an event kind from the title (same keywords as src/lib/event-kinds.ts), plus
-- Community event / Outreach from its type. Existing event photos tagged too.
create function private.event_kind_of(p_title text, p_type text)
returns text language sql immutable as $$
  select case
    when p_title ~* 'movie challenge|3mmc' then 'Movie Challenge'
    when p_title ~* 'diamond' then 'Diamond'
    when p_title ~* 'potluck|pot luck' then 'Potluck'
    when p_title ~* 'co-?working' then 'Coworking'
    when p_title ~* 'dinner|meal' then 'Dinner'
    when p_title ~* 'picnic' then 'Picnic'
    when p_title ~* 'sanctuary|santuario' then 'Sanctuary visit'
    when p_title ~* 'workshop|training' then 'Workshop'
    when p_title ~* 'stall|kiosque' then 'Stall'
    when p_title ~* 'hike|walk' then 'Hike'
    when p_title ~* 'litter' then 'Litter pick'
    when p_title ~* 'demonstration|protest|vigil' then 'Demo'
    when p_title ~* 'social|hangout|meetup|meet-up|party' then 'Social'
    when p_type is not null and p_type !~* 'community event|other' then p_type
  end;
$$;

create function private.photo_tag_from_event()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_title text; v_type text; v_outreach boolean;
begin
  if new.event_id is null then return new; end if;
  if tg_op = 'UPDATE' and old.event_id is not distinct from new.event_id then return new; end if;
  select e.title, t.name, coalesce(t.counts_as_outreach, false)
    into v_title, v_type, v_outreach
  from events e left join event_types t on t.id = e.event_type_id where e.id = new.event_id;
  new.event_kind := coalesce(private.event_kind_of(v_title, v_type), new.event_kind);
  if v_type ~* 'community' and not 'community' = any(new.tags) then
    new.tags := new.tags || 'community'::text;
  end if;
  if v_outreach and not 'outreach' = any(new.tags) then
    new.tags := new.tags || 'outreach'::text;
  end if;
  return new;
end $$;

create trigger event_photos_tag_from_event
  before insert or update of event_id on public.event_photos
  for each row execute function private.photo_tag_from_event();

with x as (
  select p.id, private.event_kind_of(e.title, t.name) kind,
         t.name ~* 'community' is_comm, coalesce(t.counts_as_outreach, false) is_out
  from public.event_photos p join events e on e.id = p.event_id
  left join event_types t on t.id = e.event_type_id
)
update public.event_photos p set
  event_kind = coalesce(p.event_kind, x.kind),
  tags = (select array(select distinct unnest(p.tags
            || case when x.is_comm then array['community'] else '{}'::text[] end
            || case when x.is_out then array['outreach'] else '{}'::text[] end)))
from x where x.id = p.id;
