-- New Year's Eve suggestion: no mention of fireworks (Kai, 5 Nov 2026: most
-- vegans don't see fireworks as in line with veganism). Emoji 🎆 → 🎉.
update public.special_events
set blurb = 'See the year out together: a picnic or potluck, or a Movie Challenge in the New Year''s Eve crowds earlier in the day. A chance to thank everyone and set goals for next year.',
    emoji = '🎉'
where name = 'New Year''s Eve';
