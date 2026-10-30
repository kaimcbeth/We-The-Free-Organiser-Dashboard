-- Members' Events page: the "Join our WhatsApp community" card hides once
-- they've tapped it (or said they've already joined). We can't see who's in
-- the WhatsApp group, so tapping the link is taken as joining.
alter table public.people add column if not exists whatsapp_joined_at timestamptz;
create or replace function public.mark_whatsapp_joined()
returns void language sql security definer set search_path = public as $$
  update people set whatsapp_joined_at = coalesce(whatsapp_joined_at, now())
  where user_id = auth.uid();
$$;
revoke execute on function public.mark_whatsapp_joined() from public, anon;
grant execute on function public.mark_whatsapp_joined() to authenticated;

-- "Welcome to We The Free" (the welcome cards): done once a member reaches
-- the last card; the link and banner on their Events page then go away.
alter table public.people add column if not exists welcome_done_at timestamptz;
create or replace function public.mark_welcome_done()
returns void language sql security definer set search_path = public as $$
  update people set welcome_done_at = coalesce(welcome_done_at, now())
  where user_id = auth.uid();
$$;
revoke execute on function public.mark_welcome_done() from public, anon;
grant execute on function public.mark_welcome_done() to authenticated;
