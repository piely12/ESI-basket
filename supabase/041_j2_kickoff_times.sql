-- Journée 2 (28/11/2026) : nouvel ordre des matchs, 1 h d'écart dès 18h.
-- Heures en Africa/Abidjan. Seuls les horaires changent.
-- Apply after migrations 001 through 040.
begin;

do $migration$
declare
  v_season_id uuid;
  v_count integer := 0;
  v_updated integer;
  fixture record;
begin
  select s.id into v_season_id
  from public.seasons s
  join public.competitions c on c.id = s.competition_id
  where c.name = 'Ligue de Basketball INP-HB' and s.name = '2026-2027';
  if v_season_id is null then
    raise exception 'Saison 2026-2027 introuvable.';
  end if;

  for fixture in
    select * from (values
      ('ESMG',      'ESTP',  time '18:00'),
      ('E. Projet', 'ESI',   time '19:00'),
      ('EPGE',      'ESA',   time '20:00'),
      ('ESCPE',     'ESCAE', time '21:00')
    ) as schedule(home_code, away_code, kickoff)
  loop
    update public.matches m
    set scheduled_at = (date '2026-11-28' + fixture.kickoff) at time zone 'Africa/Abidjan'
    where m.season_id = v_season_id
      and m.round_number = 2
      and m.home_team_id = (select t.id from public.teams t
        where case when fixture.home_code = 'ESI' then t.is_esi else t.name = fixture.home_code end)
      and m.away_team_id = (select t.id from public.teams t
        where case when fixture.away_code = 'ESI' then t.is_esi else t.name = fixture.away_code end);
    get diagnostics v_updated = row_count;
    if v_updated <> 1 then
      raise exception 'Match % vs % (J2) : % ligne(s) trouvée(s), 1 attendue.', fixture.home_code, fixture.away_code, v_updated;
    end if;
    v_count := v_count + 1;
  end loop;
end
$migration$;

commit;
