-- Show a team's lineup to site visitors immediately after publication.
-- Drafts remain private because only published workflow rows satisfy this policy.
-- Apply after migrations 001 through 029.
begin;

drop policy if exists lineups_matchday_or_coach_read on public.match_lineups;
create policy lineups_matchday_or_coach_read on public.match_lineups
for select to anon, authenticated
using (
  public.is_match_composition_published(
    match_lineups.match_id,
    (select p.team_id from public.players p where p.id = match_lineups.player_id)
  )
);

commit;
