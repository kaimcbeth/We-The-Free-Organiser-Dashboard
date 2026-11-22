-- Build Your Kit: save and lock in a community's starting kit (Kai, 23 Nov
-- 2026: "an option for organisers to save and lock in the starting kits they
-- want with the build a kit tool").
-- One kit per community: which items, which version (Budget / Best / DIY)
-- and how many, plus Portable kit. Saved = a draft anyone organising the
-- community can pick up again; locked = the kit they've settled on (the
-- builder shows it read-only until someone unlocks it).

create table if not exists public.team_kits (
  team_id uuid primary key references public.teams(id) on delete cascade,
  items jsonb not null default '[]'::jsonb, -- [{key, pick, qty}]
  portable boolean not null default false,
  total numeric,
  saved_at timestamptz not null default now(),
  saved_by uuid,
  saved_by_name text,
  locked_at timestamptz,
  locked_by uuid,
  locked_by_name text
);

alter table public.team_kits enable row level security;

drop policy if exists "organisers read team kit" on public.team_kits;
create policy "organisers read team kit" on public.team_kits
  for select to authenticated
  using (private.is_team_organiser(team_id));

-- Writes only through the functions below.

create or replace function public.save_team_kit(
  p_team uuid,
  p_items jsonb,
  p_portable boolean,
  p_total numeric,
  p_lock boolean default false
) returns public.team_kits
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_row public.team_kits;
begin
  if not private.is_team_organiser(p_team) then
    raise exception 'Only organisers can save the kit';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) > 100 then
    raise exception 'That kit doesn''t look right';
  end if;
  if exists (select 1 from team_kits where team_id = p_team and locked_at is not null) then
    raise exception 'This kit is locked in. Unlock it to make changes.';
  end if;
  select nullif(trim(p.first_name), '') into v_name
    from people p where p.user_id = auth.uid()
    order by p.created_at limit 1;

  insert into team_kits as k (team_id, items, portable, total, saved_at, saved_by, saved_by_name,
                              locked_at, locked_by, locked_by_name)
  values (p_team, p_items, coalesce(p_portable, false), p_total, now(), auth.uid(), v_name,
          case when p_lock then now() end,
          case when p_lock then auth.uid() end,
          case when p_lock then v_name end)
  on conflict (team_id) do update set
    items = excluded.items,
    portable = excluded.portable,
    total = excluded.total,
    saved_at = excluded.saved_at,
    saved_by = excluded.saved_by,
    saved_by_name = excluded.saved_by_name,
    locked_at = excluded.locked_at,
    locked_by = excluded.locked_by,
    locked_by_name = excluded.locked_by_name
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.unlock_team_kit(p_team uuid)
returns public.team_kits
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.team_kits;
begin
  if not private.is_team_organiser(p_team) then
    raise exception 'Only organisers can unlock the kit';
  end if;
  update team_kits
     set locked_at = null, locked_by = null, locked_by_name = null
   where team_id = p_team
  returning * into v_row;
  return v_row;
end;
$$;

revoke all on function public.save_team_kit(uuid, jsonb, boolean, numeric, boolean) from public, anon;
revoke all on function public.unlock_team_kit(uuid) from public, anon;
grant execute on function public.save_team_kit(uuid, jsonb, boolean, numeric, boolean) to authenticated;
grant execute on function public.unlock_team_kit(uuid) to authenticated;
