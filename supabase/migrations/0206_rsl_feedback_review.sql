-- Kai, 6 Nov 2026: "Put monthly to check organiser feedback. Have time depend
-- on if there is feedback." A built-in region-wide monthly RSL action; the
-- app sets its time from how much organiser feedback came in (10 min each,
-- 2 min when there's none) via region_feedback_count.

insert into task_kinds (kind, title, blurb, description, estimate_minutes, anchor, appear_hours,
                        due_after_hours, sort_order, audience, schedule, default_enabled)
values ('rsl_feedback_review', 'Organiser feedback read and replied to',
        'A monthly look at what your organisers have told Global Support',
        'Read what organisers sent through the Global Support feedback card this month, reply to anyone who left their name, and pass anything big on to Global Support.',
        10, 'start', 0, 0, 42, 'regional', 'region_monthly', true)
on conflict (kind) do nothing;

-- Organiser feedback for a region's patch (incl. extra countries) since a time.
create or replace function public.region_feedback_count(p_region uuid, p_since timestamptz)
returns int language plpgsql stable security definer set search_path = public as $$
begin
  if not private.can_plan_region(p_region) then return null; end if;
  return (select count(*) from organiser_feedback f
          where f.created_at >= p_since
            and (f.region_id = p_region
                 or (f.team_id is not null and private.team_in_region(f.team_id, p_region))));
end $$;
grant execute on function public.region_feedback_count(uuid, timestamptz) to authenticated;

select private.create_region_tasks();
