-- Learn the community's voice from edits (Kai, 19 Nov 2026: captions "pretty
-- non-human"): when an organiser edits a written option and copies, shares or
-- saves it, the edited text is kept as a voice example (learned = true; the
-- newest 6 per community). Hand-added examples still cap at 10.
alter table public.voice_examples add column if not exists learned boolean not null default false;

create or replace function public.learn_voice(p_team uuid, p_platform text, p_body text)
returns void language plpgsql security definer set search_path = public as $$
declare b text := btrim(coalesce(p_body, ''));
begin
  if not private.is_team_core(p_team) then return; end if;
  if char_length(b) < 20 or char_length(b) > 1500 then return; end if;
  if p_platform is not null and p_platform not in ('instagram','facebook','whatsapp','story') then
    p_platform := null;
  end if;
  if exists (select 1 from voice_examples where team_id = p_team and body = b) then return; end if;
  insert into voice_examples (team_id, platform, body, learned) values (p_team, p_platform, b, true);
  delete from voice_examples where id in (
    select id from voice_examples where team_id = p_team and learned
    order by created_at desc offset 6);
end $$;
revoke all on function public.learn_voice(uuid, text, text) from public, anon;
grant execute on function public.learn_voice(uuid, text, text) to authenticated;

alter policy "core team add voice" on public.voice_examples with check (
  private.is_team_core(team_id) and not learned
  and (select count(*) from voice_examples v where v.team_id = voice_examples.team_id and not v.learned) < 10);
