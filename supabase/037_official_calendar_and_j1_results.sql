-- Calendrier officiel 2026-2027 (Hommes), résultats de la Journée 1 et
-- statistiques de ESI 48-32 ESTP (MVP : AMON Loïc).
-- Apply after migrations 001 through 036. All times are Africa/Abidjan.
--
-- L'ancien calendrier de la saison est supprimé, avec ce qui en dépend
-- (compositions, statistiques, convocations…) via ON DELETE CASCADE.
-- Toute incohérence annule l'ensemble : rien n'est modifié à moitié.
begin;

do $migration$
declare
  v_competition_id uuid;
  v_season_id uuid;
  v_esi_id uuid;
  v_estp_id uuid;
  v_match_id uuid;
  v_count integer;
  fixture record;
  line record;
  v_home uuid;
  v_away uuid;
  v_player uuid;
begin
  select c.id into v_competition_id from public.competitions c where c.name = 'Ligue de Basketball INP-HB';
  select s.id into v_season_id from public.seasons s where s.competition_id = v_competition_id and s.name = '2026-2027';
  select t.id into v_esi_id from public.teams t where t.is_esi;
  select t.id into v_estp_id from public.teams t where t.name = 'ESTP';
  if v_competition_id is null or v_season_id is null or v_esi_id is null or v_estp_id is null then
    raise exception 'Compétition, saison, ESI ou ESTP introuvable. Appliquer les migrations 001 à 036 d''abord.';
  end if;

  -- 1. Remove the previous calendar of the season.
  delete from public.matches m where m.season_id = v_season_id;

  update public.seasons s
  set starts_on = date '2026-11-21', ends_on = date '2027-02-06', is_current = true
  where s.id = v_season_id;

  -- 2. Official calendar. Scores are filled in for Journée 1 only.
  for fixture in
    select * from (values
      (1, date '2026-11-21', time '18:00', 'E. Projet', 'ESA',       53,   57),
      (1, date '2026-11-21', time '19:00', 'ESI',       'ESTP',      48,   32),
      (1, date '2026-11-21', time '20:00', 'ESMG',      'ESCAE',     47,   42),
      (1, date '2026-11-21', time '21:00', 'ESCPE',     'EPGE',      47,   51),
      (2, date '2026-11-28', time '18:00', 'EPGE',      'ESA',       null, null),
      (2, date '2026-11-28', time '19:00', 'ESCPE',     'ESCAE',     null, null),
      (2, date '2026-11-28', time '20:00', 'ESMG',      'ESTP',      null, null),
      (2, date '2026-11-28', time '21:00', 'E. Projet', 'ESI',       null, null),
      (3, date '2026-12-05', time '18:00', 'ESCPE',     'ESTP',      null, null),
      (3, date '2026-12-05', time '19:00', 'ESCAE',     'ESA',       null, null),
      (3, date '2026-12-05', time '20:00', 'ESI',       'ESMG',      null, null),
      (3, date '2026-12-05', time '21:00', 'E. Projet', 'EPGE',      null, null),
      (4, date '2027-01-16', time '18:00', 'ESI',       'ESCAE',     null, null),
      (4, date '2027-01-16', time '19:00', 'EPGE',      'ESTP',      null, null),
      (4, date '2027-01-16', time '20:00', 'ESMG',      'E. Projet', null, null),
      (4, date '2027-01-16', time '21:00', 'ESCPE',     'ESA',       null, null),
      (5, date '2027-01-23', time '18:00', 'ESMG',      'EPGE',      null, null),
      (5, date '2027-01-23', time '19:00', 'ESA',       'ESTP',      null, null),
      (5, date '2027-01-23', time '20:00', 'ESCAE',     'E. Projet', null, null),
      (5, date '2027-01-23', time '21:00', 'ESI',       'ESCPE',     null, null),
      (6, date '2027-01-30', time '18:00', 'EPGE',      'ESCAE',     null, null),
      (6, date '2027-01-30', time '19:00', 'ESI',       'ESA',       null, null),
      (6, date '2027-01-30', time '20:00', 'ESCPE',     'ESMG',      null, null),
      (6, date '2027-01-30', time '21:00', 'E. Projet', 'ESTP',      null, null),
      (7, date '2027-02-06', time '18:00', 'ESI',       'EPGE',      null, null),
      (7, date '2027-02-06', time '19:00', 'ESCPE',     'E. Projet', null, null),
      (7, date '2027-02-06', time '20:00', 'ESCAE',     'ESTP',      null, null),
      (7, date '2027-02-06', time '21:00', 'ESA',       'ESMG',      null, null)
    ) as schedule(round_number, match_date, kickoff, home_code, away_code, home_score, away_score)
  loop
    v_home := case when fixture.home_code = 'ESI' then v_esi_id else (select t.id from public.teams t where t.name = fixture.home_code) end;
    v_away := case when fixture.away_code = 'ESI' then v_esi_id else (select t.id from public.teams t where t.name = fixture.away_code) end;
    if v_home is null or v_away is null then
      raise exception 'Équipe introuvable : % vs %', fixture.home_code, fixture.away_code;
    end if;

    insert into public.matches (
      competition_id, season_id, home_team_id, away_team_id, scheduled_at, location,
      status, home_score, away_score, round_number, kickoff_confirmed, public_note
    ) values (
      v_competition_id, v_season_id, v_home, v_away,
      (fixture.match_date + fixture.kickoff) at time zone 'Africa/Abidjan', 'Gymnase du Sud',
      case when fixture.home_score is null then 'programme' else 'termine' end,
      fixture.home_score, fixture.away_score, fixture.round_number, true, null
    );
  end loop;

  select count(*) into v_count from public.matches m where m.season_id = v_season_id;
  if v_count <> 28 then
    raise exception '28 matchs attendus, % créés.', v_count;
  end if;

  -- 3. ESI 48-32 ESTP: player statistics from the match sheet.
  select m.id into v_match_id from public.matches m
  where m.season_id = v_season_id and m.home_team_id = v_esi_id and m.away_team_id = v_estp_id;

  -- jersey, fouls, 2pts att/made, 3pts att/made, FT att/made, def/off rebounds,
  -- assists, steals, blocks, turnovers, points (sheet). Players with nothing
  -- written on the sheet (did not play) get no line.
  for line in
    select * from (values
      ( 8, 0,  6, 4, 1, 0, 0, 0, 4, 0, 0, 0, 0, 0,  8),  -- KOUAMÉ Miguel
      (14, 0, 11, 3, 4, 0, 6, 2, 2, 0, 3, 0, 0, 0,  8),  -- KOUAO Chris-Ivann
      (25, 1,  0, 0, 4, 0, 0, 0, 0, 0, 1, 1, 0, 0,  0),  -- KEITA Almamy
      ( 2, 0,  0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0,  0),  -- BOTCHI Pethuel
      ( 1, 2,  7, 7, 3, 0, 0, 0, 1, 0, 3, 1, 0, 1, 14),  -- AMON Loïc (MVP)
      ( 5, 1,  3, 2, 1, 1, 0, 0, 4, 0, 5, 1, 0, 0,  7),  -- GBAGO Marc
      ( 0, 5,  2, 2, 0, 0, 2, 0, 3, 0, 0, 0, 0, 0,  4),  -- KOUASSI Famien
      ( 7, 0,  0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0,  0),  -- DALOUGOU Christ-Israël
      (33, 3,  5, 2, 0, 0, 1, 1, 0, 1, 1, 2, 2, 0,  5),  -- KONAN Loukou
      (12, 0,  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,  0),  -- KOUAKOU De Paul
      (11, 1,  1, 1, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0,  2),  -- KOUMOIN Péniel
      ( 4, 1,  0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0,  0)   -- YOBOUE Micael
    ) as sheet(jersey, fouls, two_att, two_made, three_att, three_made, ft_att, ft_made,
               reb_def, reb_off, assists, steals, blocks, turnovers, points)
  loop
    select p.id into v_player from public.players p where p.team_id = v_esi_id and p.jersey_number = line.jersey;
    if v_player is null then
      raise exception 'Joueur ESI n°% introuvable (appliquer 036 d''abord).', line.jersey;
    end if;
    if line.points <> 2 * line.two_made + 3 * line.three_made + line.ft_made then
      raise exception 'Points incohérents pour le n°%.', line.jersey;
    end if;

    insert into public.match_player_stats (
      match_id, player_id, points, personal_fouls, rebounds_defensive, rebounds_offensive, rebounds,
      assists, steals, blocks, turnovers, fg_made, fg_attempted, three_made, three_attempted,
      ft_made, ft_attempted, published_at
    ) values (
      v_match_id, v_player, line.points, line.fouls, line.reb_def, line.reb_off, line.reb_def + line.reb_off,
      line.assists, line.steals, line.blocks, line.turnovers,
      line.two_made + line.three_made, line.two_att + line.three_att, line.three_made, line.three_att,
      line.ft_made, line.ft_att, now()
    );
  end loop;

  select coalesce(sum(ps.points), 0) into v_count from public.match_player_stats ps where ps.match_id = v_match_id;
  if v_count <> 48 then
    raise exception 'Le total des points joueurs (%) ne correspond pas au score (48).', v_count;
  end if;

  -- Team totals for ESI.
  insert into public.match_team_stats (
    match_id, team_id, points, rebounds, assists, steals, blocks, turnovers, personal_fouls,
    fg_made, fg_attempted, three_made, three_attempted, ft_made, ft_attempted, published_at
  )
  select v_match_id, v_esi_id, sum(ps.points), sum(ps.rebounds), sum(ps.assists), sum(ps.steals),
         sum(ps.blocks), sum(ps.turnovers), sum(ps.personal_fouls), sum(ps.fg_made), sum(ps.fg_attempted),
         sum(ps.three_made), sum(ps.three_attempted), sum(ps.ft_made), sum(ps.ft_attempted), now()
  from public.match_player_stats ps where ps.match_id = v_match_id;

  insert into public.match_stats_workflow (
    match_id, home_score_draft, away_score_draft, status, result_checked, team_stats_checked,
    player_stats_checked, anomalies_checked, reviewed_at, published_at, updated_at
  ) values (v_match_id, 48, 32, 'publie', true, true, true, true, now(), now(), now());

  -- 4. MVP du match, only if the (optional, unused by the site) table exists.
  -- The MVP is shown on the home page through the news items.
  if to_regclass('public.mvp_awards') is not null then
    select p.id into v_player from public.players p where p.team_id = v_esi_id and p.jersey_number = 1;
    execute 'insert into public.mvp_awards (match_id, player_id, headline, published_at) values ($1, $2, $3, now())'
      using v_match_id, v_player, 'MVP du match : AMON Loïc — 14 points, 3 passes décisives';
  end if;
end;
$migration$;

commit;
