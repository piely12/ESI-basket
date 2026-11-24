-- Rend les statistiques publiées lisibles par les visiteurs.
-- Apply after migrations 001 through 037.
--
-- Problème : les règles de lecture de match_player_stats (031) et de
-- match_team_stats (035) contenaient des sous-requêtes sur players.user_id et
-- staff.user_id. Un visiteur (anon) n'a pas le droit de lire ces tables :
-- PostgreSQL refusait toute la requête (« permission denied for table
-- players / staff »), même pour une statistique publiée.
--
-- Correctif :
-- - visiteurs : une règle simple, « la statistique est publiée » ;
-- - utilisateurs connectés : même règle qu'avant, mais uniquement via des
--   fonctions security definer, sans lire directement players ou staff.
begin;

-- Team of a player, readable by the policies without exposing players.user_id.
create or replace function public.player_team_id(p_player_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.team_id from public.players p where p.id = p_player_id;
$$;
revoke all on function public.player_team_id(uuid) from public;
grant execute on function public.player_team_id(uuid) to authenticated;

-- Player statistics.
drop policy if exists player_stats_published_or_self_read on public.match_player_stats;
drop policy if exists player_stats_public_read on public.match_player_stats;
drop policy if exists player_stats_member_read on public.match_player_stats;

create policy player_stats_public_read on public.match_player_stats
for select to anon
using (published_at is not null);

create policy player_stats_member_read on public.match_player_stats
for select to authenticated
using (
  published_at is not null
  or (
    public.is_current_app_session()
    and (
      public.is_team_staff(public.player_team_id(match_player_stats.player_id), array['statisticienne', 'coach'])
      or public.is_current_user_player(match_player_stats.player_id)
    )
  )
);

-- Team statistics.
drop policy if exists team_stats_published_read on public.match_team_stats;
drop policy if exists team_stats_public_read on public.match_team_stats;
drop policy if exists team_stats_member_read on public.match_team_stats;

create policy team_stats_public_read on public.match_team_stats
for select to anon
using (published_at is not null);

create policy team_stats_member_read on public.match_team_stats
for select to authenticated
using (
  published_at is not null
  or public.is_team_staff(team_id, array['statisticienne', 'coach', 'coach_adjoint'])
  or public.has_staff_role(array['statisticienne'])
);

commit;
