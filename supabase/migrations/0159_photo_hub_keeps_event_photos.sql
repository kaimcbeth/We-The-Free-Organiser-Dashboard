-- Photos attached to an event stay in the Photo Hub (Kai, 1 Nov 2026):
-- members can now see a community's event photos too, not only ones with no event.
alter policy "members read photo hub" on event_photos
  using (archived_at is null and private.is_team_member(team_id));
