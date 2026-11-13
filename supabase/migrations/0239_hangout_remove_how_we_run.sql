-- Kai, 13 Nov 2026: remove the "How we run these" slide from the Welcome block
-- (and from any hangout that had its own copy of it).
update hangout_blocks set slides = (select jsonb_agg(s) from jsonb_array_elements(slides) s where s->>'heading' <> 'How we run these'), updated_at = now() where key = 'welcome';
update hangout_plans p set items = (select jsonb_agg(case when i ? 'slides' then jsonb_set(i, '{slides}', coalesce((select jsonb_agg(s) from jsonb_array_elements(i->'slides') s where s->>'heading' <> 'How we run these'), '[]'::jsonb)) else i end) from jsonb_array_elements(p.items) i) where items::text like '%How we run these%';
