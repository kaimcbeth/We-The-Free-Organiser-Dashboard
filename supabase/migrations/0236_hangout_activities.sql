-- Organiser hangouts: "exercises" are called "activities" (Kai, 13 Nov 2026).
-- The section key stays 'exercise'; only the words people see change.
update hangout_blocks set slides = replace(replace(slides::text, 'exercise', 'activity'), 'Exercise', 'Activity')::jsonb, updated_at = now() where slides::text ~* 'exercise';
update hangout_plans set items = replace(replace(items::text, 'exercise', 'activity'), 'Exercise', 'Activity')::jsonb where items::text ~* 'exercise';
