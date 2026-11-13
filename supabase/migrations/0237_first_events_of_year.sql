-- Suggested special events (Kai, 13 Nov 2026): the first community event and
-- the first outreach of the year, in January. "first" joins the auto-tag stop
-- list so ordinary "First …" titles aren't tagged.
create or replace function private.special_event_words(p_name text)
 returns text[] language sql immutable set search_path to 'public' as $function$
  select coalesce(array_agg(w), '{}') from regexp_split_to_table(lower(p_name), '[^a-z0-9]+') w
  where length(w) >= 4 and w not in ('movie', 'challenge', 'social', 'party', 'event', 'events',
                                     'night', 'dinner', 'picnic', 'with', 'your', 'the',
                                     'world', 'vegan', 'animal', 'animals', 'rights', 'international',
                                     'community', 'outreach', 'melbourne', 'sydney', 'potluck',
                                     'year', 'years', 'first');
$function$;
insert into special_events (name, emoji, blurb, month, week_of_month, weekday, lead_days)
select * from (values
  ('First Community Event of {year}', '🤝', 'Start the year together with a relaxed community event: a picnic, potluck or beach day. It''s Veganuary, so lots of people are curious and trying vegan for the first time: invite them along, welcome newcomers, and share what''s coming up this year.', 1, 2, 6, 61),
  ('First Outreach of {year}', '📣', 'Kick off the year''s outreach with a Movie Challenge or outreach day. January is Veganuary, so people are more open than usual to talking about it. Bring the regulars back together, welcome anyone new, and set the pace for the year.', 1, 3, 6, 61)
) v(name, emoji, blurb, month, week_of_month, weekday, lead_days)
where not exists (select 1 from special_events s where s.name = v.name);
