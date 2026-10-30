-- Regional Support Leads can read the hangouts for their region (their
-- promote actions show the hangout's name, date and link).
create policy "regional leads read their hangouts" on public.hangouts for select to authenticated
  using (exists (select 1 from organisers o where o.id = auth.uid() and o.access = 'regional_lead' and o.region_id = any (hangouts.region_ids)));

-- Security advisor: pin the search path on two helpers from 0128/0126.
alter function private.special_event_date(special_events, date) set search_path = public;
alter function private.event_kind_of set search_path = public;
