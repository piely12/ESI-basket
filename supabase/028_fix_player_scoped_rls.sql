-- Fix RLS policies that referenced the restricted players.user_id column.
-- Apply after migrations 001 through 027.
begin;

-- Keep ownership checks server-side so browser roles never need direct access
-- to players.user_id.
create or replace function public.is_current_user_player(p_player_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
    and public.is_current_app_session()
    and exists (
      select 1 from public.players p
      where p.id = p_player_id and p.user_id = auth.uid()
    );
$$;
revoke all on function public.is_current_user_player(uuid) from public;
grant execute on function public.is_current_user_player(uuid) to anon, authenticated;

-- Migration 017 left this policy behind alongside the coach policy. Its
-- reference to players.user_id caused permission errors on roster reads.
drop policy if exists match_rosters_authorized_read on public.match_rosters;
drop policy if exists match_rosters_player_read on public.match_rosters;
drop policy if exists match_rosters_coach_read on public.match_rosters;
create policy match_rosters_coach_read on public.match_rosters
for select to authenticated
using (
  public.is_current_app_session()
  and (
    public.has_staff_role(array['admin'])
    or public.is_current_user_player(match_rosters.player_id)
    or exists (
      select 1
      from public.matches m
      join public.players p on p.id = match_rosters.player_id
      where m.id = match_rosters.match_id
        and p.team_id in (m.home_team_id, m.away_team_id)
        and public.is_team_staff(p.team_id, array['coach'])
    )
  )
);

-- Preserve unpublished stats visibility for the player and authorized staff,
-- without querying players.user_id in the RLS expression.
drop policy if exists player_stats_published_or_self_read on public.match_player_stats;
create policy player_stats_published_or_self_read on public.match_player_stats
for select to anon, authenticated
using (
  published_at is not null
  or (
    public.is_current_app_session()
    and (
      exists (
        select 1 from public.players p
        where p.id = match_player_stats.player_id
          and public.is_team_staff(p.team_id, array['statisticienne', 'coach'])
      )
      or public.is_current_user_player(match_player_stats.player_id)
    )
  )
);

commit;
