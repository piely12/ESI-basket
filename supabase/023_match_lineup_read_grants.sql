-- Restore the columns required to render match lineups in coach and public
-- pages. Row visibility remains controlled by the existing lineups RLS policy.
-- Apply after migrations 001 through 022.
begin;

grant select (id, match_id, player_id, is_starter, court_slot, created_at)
  on public.match_lineups to anon, authenticated;

comment on column public.match_lineups.court_slot is
  'Fixed court position for a starter; row visibility remains governed by match_lineups RLS.';

commit;
