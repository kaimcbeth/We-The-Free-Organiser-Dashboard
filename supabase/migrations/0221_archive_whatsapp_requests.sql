-- Kai, 11 Nov 2026: "Nix this action outright" (WhatsApp join requests approved).
update task_kinds set archived_at = now() where kind = 'com_whatsapp_requests' and archived_at is null;
update tasks set dismissed_at = now()
where kind = 'com_whatsapp_requests' and done_at is null and dismissed_at is null;
