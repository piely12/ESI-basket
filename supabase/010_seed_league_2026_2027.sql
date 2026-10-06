-- Teams, logos and the official 2026-2027 league calendar from the supplied PDF.
-- Apply after migrations 001 through 009 in Supabase.
-- The PDF provides dates but no tip-off times or venues. Imported games are
-- marked kickoff_confirmed=false; coaches should confirm those details.
begin;

alter table public.matches add column if not exists round_number smallint;
alter table public.matches add column if not exists kickoff_confirmed boolean not null default true;
alter table public.matches add column if not exists public_note text;

grant select (round_number, kickoff_confirmed, public_note) on public.matches to anon, authenticated;
grant update (kickoff_confirmed) on public.matches to authenticated;

insert into public.teams (name, logo_url, is_esi)
values
  ('ESCPE', '/logos/escpe.png', false),
  ('ESTP', '/logos/estp.png', false),
  ('ESCAE', '/logos/escae.png', false),
  ('ESA', '/logos/esa.png', false),
  ('ESMG', '/logos/esmg.png', false),
  ('EPGE', '/logos/epge.png', false),
  ('E. Projet', '/logos/ep.png', false)
on conflict (name) do update set logo_url = excluded.logo_url;

update public.teams
set logo_url = '/logos/esi.png', is_esi = true
where is_esi = true;

insert into public.competitions (name, organizer)
values ('Ligue de Basketball INP-HB', 'INP-HB')
on conflict (name) do update set organizer = excluded.organizer;

do $$
declare
  v_competition_id uuid;
  v_season_id uuid;
  v_esi_team_id uuid;
  fixture record;
begin
  select c.id into v_competition_id
  from public.competitions c
  where c.name = 'Ligue de Basketball INP-HB';

  update public.seasons set is_current = false where is_current = true;
  insert into public.seasons (competition_id, name, starts_on, ends_on, is_current)
  values (v_competition_id, '2026-2027', '2026-11-21', '2027-01-30', true)
  on conflict (competition_id, name) do update
    set starts_on = excluded.starts_on,
        ends_on = excluded.ends_on,
        is_current = true
  returning id into v_season_id;

  select t.id into v_esi_team_id from public.teams t where t.is_esi = true;
  if v_esi_team_id is null then
    raise exception 'The ESI team is missing. Apply 007_seed_esi_roster.sql first.';
  end if;

  -- Each row is one game from the PDF, grouped by league matchday.
  for fixture in
    select * from (values
      (1, date '2026-11-21', 'ESCPE', 'EPGE'),
      (2, date '2026-11-28', 'ESTP', 'E. Projet'),
      (2, date '2026-11-28', 'ESCAE', 'ESI'),
      (2, date '2026-11-28', 'ESA', 'ESMG'),
      (3, date '2026-12-05', 'ESCPE', 'E. Projet'),
      (3, date '2026-12-05', 'EPGE', 'ESI'),
      (3, date '2026-12-05', 'ESTP', 'ESMG'),
      (3, date '2026-12-05', 'ESCAE', 'ESA'),
      (4, date '2026-12-12', 'ESCPE', 'ESI'),
      (4, date '2026-12-12', 'E. Projet', 'ESMG'),
      (4, date '2026-12-12', 'EPGE', 'ESA'),
      (4, date '2026-12-12', 'ESTP', 'ESCAE'),
      (5, date '2027-01-09', 'ESCPE', 'ESMG'),
      (5, date '2027-01-09', 'ESI', 'ESA'),
      (5, date '2027-01-09', 'E. Projet', 'ESCAE'),
      (5, date '2027-01-09', 'EPGE', 'ESTP'),
      (6, date '2027-01-16', 'ESCPE', 'ESA'),
      (6, date '2027-01-16', 'ESMG', 'ESCAE'),
      (6, date '2027-01-16', 'ESI', 'ESTP'),
      (6, date '2027-01-16', 'E. Projet', 'EPGE'),
      (7, date '2027-01-23', 'ESCPE', 'ESCAE'),
      (7, date '2027-01-23', 'ESA', 'ESTP'),
      (7, date '2027-01-23', 'ESMG', 'EPGE'),
      (7, date '2027-01-23', 'ESI', 'E. Projet'),
      (8, date '2027-01-30', 'ESCPE', 'ESTP'),
      (8, date '2027-01-30', 'ESCAE', 'EPGE'),
      (8, date '2027-01-30', 'ESA', 'E. Projet'),
      (8, date '2027-01-30', 'ESMG', 'ESI')
    ) as schedule(round_number, match_date, home_code, away_code)
  loop
    declare
      home_id uuid;
      away_id uuid;
      existing_match_id uuid;
      fixture_note text;
    begin
      if fixture.home_code = 'ESI' then
        home_id := v_esi_team_id;
      else
        select t.id into home_id from public.teams t where t.name = fixture.home_code;
      end if;

      if fixture.away_code = 'ESI' then
        away_id := v_esi_team_id;
      else
        select t.id into away_id from public.teams t where t.name = fixture.away_code;
      end if;

      if home_id is null or away_id is null then
        raise exception 'Missing team for fixture % vs %', fixture.home_code, fixture.away_code;
      end if;

      fixture_note := case
        when fixture.round_number = 1 then 'Remake de la finale de la saison dernière'
        else null
      end;

      select m.id into existing_match_id
      from public.matches m
      where m.home_team_id = home_id
        and m.away_team_id = away_id
        and (m.scheduled_at at time zone 'Africa/Abidjan')::date = fixture.match_date
      order by m.created_at
      limit 1;

      if existing_match_id is null then
        insert into public.matches (
          competition_id, season_id, home_team_id, away_team_id,
          scheduled_at, location, status, round_number, kickoff_confirmed, public_note
        ) values (
          v_competition_id, v_season_id, home_id, away_id,
          fixture.match_date::timestamp at time zone 'Africa/Abidjan',
          null, 'programme', fixture.round_number, false, fixture_note
        );
      else
        update public.matches m
        set competition_id = coalesce(m.competition_id, v_competition_id),
            season_id = coalesce(m.season_id, v_season_id),
            round_number = coalesce(m.round_number, fixture.round_number),
            public_note = coalesce(m.public_note, fixture_note)
        where m.id = existing_match_id;
      end if;
    end;
  end loop;
end;
$$;

commit;
