-- Reminder settings for the signed-in person (Kai, 4 Nov 2026: the reminder
-- settings moved from the profile to a "Reminders" link on the Events pages,
-- which loads them in the browser).
create or replace function public.my_reminder_settings()
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'notify_channel', p.notify_channel,
    'has_email', p.email is not null and p.email <> '',
    'maybe', p.remind_maybe,
    'upcoming', p.remind_upcoming,
    'category', p.remind_category)
  from people p
  where p.user_id = auth.uid()
  order by p.created_at
  limit 1
$$;
revoke all on function public.my_reminder_settings() from public, anon;
grant execute on function public.my_reminder_settings() to authenticated;
