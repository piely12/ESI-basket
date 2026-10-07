-- Restore team-scoped roster reads for staff after global security hardening.
-- Apply after migrations 001 through 016. No data rows are changed.
begin;

drop policy if exists match_rosters_player_read on public.match_rosters;
drop policy if exists match_rosters_authorized_read on public.match_rosters;

create policy match_rosters_authorized_read on public.match_rosters
for select to authenticated
using (
  public.is_current_app_session()
  and (
    exists (
      select 1 from public.players p
      where p.id = player_id and p.user_id = auth.uid()
    )
    or public.has_staff_role(array['admin'])
    or exists (
      select 1
      from public.matches m
      join public.players p on p.id = match_rosters.player_id
      where m.id = match_rosters.match_id
        and p.team_id in (m.home_team_id, m.away_team_id)
        and public.is_team_staff(
          p.team_id,
          array['coach', 'coach_adjoint', 'statisticienne']
        )
    )
  )
);

commit;
