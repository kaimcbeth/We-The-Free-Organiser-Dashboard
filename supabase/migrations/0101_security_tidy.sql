-- (Applied as security_tidy.) Before open-sourcing: tidy from the Supabase
-- security check.
-- One WhatsApp setter per call shape (0096 added a clashing overload).
drop function if exists public.set_team_whatsapp(uuid, text);

-- Sign-in-only functions: not callable while signed out.
revoke execute on function public.dismiss_team_setup(uuid) from public, anon;
revoke execute on function public.team_setup_status(uuid) from public, anon;
revoke execute on function public.merge_people(uuid, uuid) from public, anon;
revoke execute on function public.reset_practice_team() from public, anon;
revoke execute on function public.finish_core_tutorial() from public, anon;
revoke execute on function public.my_task_delegators(uuid[]) from public, anon;
grant execute on function public.dismiss_team_setup(uuid), public.team_setup_status(uuid),
  public.merge_people(uuid, uuid), public.reset_practice_team(), public.finish_core_tutorial(),
  public.my_task_delegators(uuid[]) to authenticated;

-- Fixed search paths.
alter function private.avatar_person(text) set search_path = public;
alter function private.photo_team(text) set search_path = public;
alter function private.import_fb_groups_tsv(text) set search_path = public;
alter function private.km_between(double precision, double precision, double precision, double precision) set search_path = public;
