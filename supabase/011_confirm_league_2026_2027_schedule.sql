-- Confirm the official kick-off times and venue for the 2026-2027 fixtures.
-- Apply after 010_seed_league_2026_2027.sql. All times are Africa/Abidjan.
begin;

do $$
declare
  v_competition_id uuid;
  v_season_id uuid;
  v_home_id uuid;
  v_away_id uuid;
  v_updated integer;
  fixture record;
begin
  select c.id into v_competition_id
  from public.competitions c
  where c.name = 'Ligue de Basketball INP-HB';

  select s.id into v_season_id
  from public.seasons s
  where s.competition_id = v_competition_id and s.name = '2026-2027';

  if v_competition_id is null or v_season_id is null then
    raise exception 'Apply 010_seed_league_2026_2027.sql before this migration.';
  end if;

  select t.id into v_home_id from public.teams t where t.is_esi = true;
  if v_home_id is null then
    raise exception 'The ESI team is missing.';
  end if;

  for fixture in
    select * from (values
      (1, date '2026-11-21', time '18:00', 'ESCPE', 'EPGE'),
      (2, date '2026-11-28', time '17:00', 'ESTP', 'E. Projet'),
      (2, date '2026-11-28', time '18:00', 'ESCAE', 'ESI'),
      (2, date '2026-11-28', time '19:00', 'ESA', 'ESMG'),
      (3, date '2026-12-05', time '17:00', 'ESCPE', 'E. Projet'),
      (3, date '2026-12-05', time '18:00', 'EPGE', 'ESI'),
      (3, date '2026-12-05', time '19:00', 'ESTP', 'ESMG'),
      (3, date '2026-12-05', time '20:00', 'ESCAE', 'ESA'),
      (4, date '2026-12-12', time '17:00', 'ESCPE', 'ESI'),
      (4, date '2026-12-12', time '18:00', 'E. Projet', 'ESMG'),
      (4, date '2026-12-12', time '19:00', 'EPGE', 'ESA'),
      (4, date '2026-12-12', time '20:00', 'ESTP', 'ESCAE'),
      (5, date '2027-01-09', time '17:00', 'ESCPE', 'ESMG'),
      (5, date '2027-01-09', time '18:00', 'ESI', 'ESA'),
      (5, date '2027-01-09', time '19:00', 'E. Projet', 'ESCAE'),
      (5, date '2027-01-09', time '20:00', 'EPGE', 'ESTP'),
      (6, date '2027-01-16', time '17:00', 'ESCPE', 'ESA'),
      (6, date '2027-01-16', time '18:00', 'ESMG', 'ESCAE'),
      (6, date '2027-01-16', time '19:00', 'ESI', 'ESTP'),
      (6, date '2027-01-16', time '20:00', 'E. Projet', 'EPGE'),
      (7, date '2027-01-23', time '17:00', 'ESCPE', 'ESCAE'),
      (7, date '2027-01-23', time '18:00', 'ESA', 'ESTP'),
      (7, date '2027-01-23', time '19:00', 'ESMG', 'EPGE'),
      (7, date '2027-01-23', time '20:00', 'ESI', 'E. Projet'),
      (8, date '2027-01-30', time '17:00', 'ESCPE', 'ESTP'),
      (8, date '2027-01-30', time '18:00', 'ESCAE', 'EPGE'),
      (8, date '2027-01-30', time '19:00', 'ESA', 'E. Projet'),
      (8, date '2027-01-30', time '20:00', 'ESMG', 'ESI')
    ) as schedule(round_number, match_date, kickoff_time, home_code, away_code)
  loop
    if fixture.home_code = 'ESI' then
      v_home_id := (select t.id from public.teams t where t.is_esi = true);
    else
      select t.id into v_home_id from public.teams t where t.name = fixture.home_code;
    end if;

    if fixture.away_code = 'ESI' then
      v_away_id := (select t.id from public.teams t where t.is_esi = true);
    else
      select t.id into v_away_id from public.teams t where t.name = fixture.away_code;
    end if;

    update public.matches m
    set scheduled_at = (fixture.match_date + fixture.kickoff_time) at time zone 'Africa/Abidjan',
        location = 'Gymnase du Sud',
        round_number = fixture.round_number,
        kickoff_confirmed = true,
        competition_id = coalesce(m.competition_id, v_competition_id),
        season_id = coalesce(m.season_id, v_season_id),
        public_note = coalesce(m.public_note, case
          when fixture.round_number = 1 then 'Remake de la finale de la saison dernière'
          else null
        end)
    where m.home_team_id = v_home_id
      and m.away_team_id = v_away_id
      and (m.scheduled_at at time zone 'Africa/Abidjan')::date = fixture.match_date
      and (m.season_id is null or m.season_id = v_season_id);

    get diagnostics v_updated = row_count;
    if v_updated <> 1 then
      raise exception 'Expected one match for J%: % vs % on %, updated % rows',
        fixture.round_number, fixture.home_code, fixture.away_code, fixture.match_date, v_updated;
    end if;
  end loop;
end;
$$;

commit;
