-- Kai, 11 Nov 2026: "Add end of 2026 celebration dinner as well".
-- "year" never auto-tags (it came from "{year}" and would tag New Year's Eve).
create or replace function private.special_event_words(p_name text)
 returns text[] language sql immutable set search_path to 'public' as $function$
  select coalesce(array_agg(w), '{}') from regexp_split_to_table(lower(p_name), '[^a-z0-9]+') w
  where length(w) >= 4 and w not in ('movie', 'challenge', 'social', 'party', 'event', 'events',
                                     'night', 'dinner', 'picnic', 'with', 'your', 'the',
                                     'world', 'vegan', 'animal', 'animals', 'rights', 'international',
                                     'community', 'outreach', 'melbourne', 'sydney', 'potluck',
                                     'year', 'years');
$function$;

insert into special_events (name, blurb, emoji, month, week_of_month, weekday, lead_days)
select 'End of {year} Celebration Dinner',
       'Get everyone together for a relaxed dinner to celebrate the year: a vegan restaurant or a shared table at a park. Thank the members who made it happen, share a few highlights and photos from the year, and talk about what you''d love to do next year.',
       '🍽️', 12, 3, 6, 61
where not exists (select 1 from special_events where name ilike '%celebration dinner%');
