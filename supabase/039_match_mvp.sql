-- MVP officiel d'un match, affiché sur la feuille de match.
-- Apply after migrations 001 through 038.
begin;

alter table public.matches
  add column if not exists mvp_player_id uuid references public.players(id) on delete set null;

grant select (mvp_player_id) on public.matches to anon, authenticated;

-- J1 : ESI 48-32 ESTP, MVP AMON Loïc (n°1).
update public.matches m
set mvp_player_id = p.id
from public.players p, public.teams esi, public.teams estp
where esi.is_esi
  and estp.name = 'ESTP'
  and p.team_id = esi.id
  and p.jersey_number = 1
  and m.home_team_id = esi.id
  and m.away_team_id = estp.id
  and m.round_number = 1;

commit;
