-- Chats (was Organiser chats; Kai, 13 Nov 2026): categories Regional
-- organiser ('organiser'), Local team ('local', new), WTF team ('team') and
-- Not relevant ('other'). Local team chats are kept like the others (messages,
-- replies) with no community or check-in ticking. Applied by rewriting the
-- 0232 functions' tag lists in place.
alter table public.beeper_chats drop constraint if exists beeper_chats_tag_check;
alter table public.beeper_chats add constraint beeper_chats_tag_check
  check (tag in ('organiser', 'team', 'local', 'other'));
do $$ declare f text; begin
  for f in select pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname in ('beeper_tag_chat', 'beeper_send', 'beeper_sync') loop
    execute replace(replace(f,
      '(''organiser'', ''team'', ''other'')', '(''organiser'', ''team'', ''local'', ''other'')'),
      '(''organiser'', ''team'')', '(''organiser'', ''team'', ''local'')');
  end loop;
end $$;
