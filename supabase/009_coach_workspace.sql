-- Private match preparation and coach post-game stat entry.
-- Apply after migrations 001 through 007 in Supabase.
-- The optional test-account linking script 008 does not change the schema.
begin;

create table if not exists public.match_preparations (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  game_plan text not null default '',
  opponent_notes text not null default '',
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, team_id),
  check (char_length(game_plan) <= 5000),
  check (char_length(opponent_notes) <= 5000)
);

alter table public.match_preparations enable row level security;
revoke all on public.match_preparations from public, anon, authenticated;
grant select, insert, update on public.match_preparations to authenticated;

drop policy if exists match_preparations_team_access on public.match_preparations;
create policy match_preparations_team_access on public.match_preparations for all to authenticated
  using (
    public.has_staff_role(array['admin'])
    or (
      exists (select 1 from public.matches m where m.id = match_id
        and team_id in (m.home_team_id, m.away_team_id))
      and public.is_team_staff(team_id, array['coach', 'coach_adjoint'])
    )
  )
  with check (
    public.has_staff_role(array['admin'])
    or (
      exists (select 1 from public.matches m where m.id = match_id
        and team_id in (m.home_team_id, m.away_team_id))
      and public.is_team_staff(team_id, array['coach', 'coach_adjoint'])
    )
  );

-- Keep existing statistician/admin rights and allow each assigned coach to
-- record private post-game stats for players on their own team in that match.
drop policy if exists player_stats_coach_manage on public.match_player_stats;
create policy player_stats_coach_manage on public.match_player_stats for all to authenticated
  using (
    public.has_staff_role(array['admin', 'statisticienne'])
    or exists (
      select 1 from public.players p
      join public.matches m on m.id = match_id
      where p.id = player_id
        and p.team_id in (m.home_team_id, m.away_team_id)
        and public.is_team_staff(p.team_id, array['coach', 'coach_adjoint'])
    )
  )
  with check (
    public.has_staff_role(array['admin', 'statisticienne'])
    or exists (
      select 1 from public.players p
      join public.matches m on m.id = match_id
      where p.id = player_id
        and p.team_id in (m.home_team_id, m.away_team_id)
        and public.is_team_staff(p.team_id, array['coach', 'coach_adjoint'])
    )
  );

commit;
