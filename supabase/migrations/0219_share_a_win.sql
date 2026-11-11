-- Share a win (Kai, 11 Nov 2026: "a recurring action for sharing wins in the
-- animal rights space"; both, every 2 weeks, the app finds the wins).
-- Community: shared in the member WhatsApp chat (fortnightly, Tuesdays, so it
-- doesn't land on the same day as Throwback Thursday).
-- RSL: shared in the organiser group chat (region_fortnightly).
-- Card button "Find wins" → write-copy purpose "wins" (web search).

insert into task_kinds (kind, title, blurb, description, estimate_minutes, estimate_max_minutes,
                        anchor, appear_hours, due_after_hours, sort_order, audience, schedule,
                        schedule_weekday, core_role, default_enabled, tier, importance)
values
 ('com_share_win', 'Animal rights win shared in the community chat',
  'Some good news for animals, every 2 weeks',
  'Activism can feel heavy. Every two weeks, share a recent win for animals in your community chat: a ban, a law, a court win, a company changing its ways. It reminds everyone that the movement is winning and their work matters. "Find wins" searches for recent ones in your country and writes ready-to-send messages with the source link.',
  5, 10, 'end', 0, 48, 55, 'community', 'fortnightly', 2, 'community_lead', true, 2, 39),
 ('rsl_share_win', 'Animal rights win shared in the organiser chat',
  'Good news for animals to keep organisers going',
  'Every two weeks, share a recent win for animals in your organiser group chat, to remind organisers that the movement is winning and their work matters. "Find wins" searches for recent ones in your country and writes ready-to-send messages with the source link. Organisers can pass them on to their communities.',
  5, 10, 'start', 0, 0, 41, 'regional', 'region_fortnightly', null, null, true, null, null)
on conflict (kind) do nothing;
