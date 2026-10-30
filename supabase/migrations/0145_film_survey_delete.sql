-- Movie player: organisers can delete their community's survey answers
-- (e.g. ones made while testing), from the Movie player page.
create policy "organisers delete their film survey answers" on public.film_survey_responses for delete
  to authenticated using (private.is_team_organiser(team_id));
