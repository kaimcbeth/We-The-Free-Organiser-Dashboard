-- Kai looks after Oceania + Japan as RSL (6 Nov 2026: "a task for each of
-- the teams in my region (Oceania + Japan) to reach out to the organiser").
-- Japan's teams stay in the Asia region; a region can also cover the teams
-- of extra countries (the part of teams.name after the comma).
alter table regions add column if not exists extra_countries text[] not null default '{}';
update regions set extra_countries = array['Japan'] where name = 'Oceania';

-- One check-in per team: close older open ones where a newer one exists
-- (October's were still open beside November's).
update tasks t set dismissed_at = now()
where t.kind = 'connect_organisers' and t.done_at is null and t.dismissed_at is null
  and exists (select 1 from tasks n
              where n.team_id = t.team_id and n.kind = t.kind
                and n.done_at is null and n.dismissed_at is null
                and n.created_at > t.created_at);
