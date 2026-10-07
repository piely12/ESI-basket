-- Move the 2026-2027 matchdays one week later at the start of the season,
-- preserving the December break. Apply after migrations 010 and 011.
-- All scheduled_at values remain in Africa/Abidjan local time.
begin;

do $$
declare
  v_competition_id uuid;
  v_season_id uuid;
  v_updated integer;
begin
  select c.id into v_competition_id
  from public.competitions c
  where c.name = 'Ligue de Basketball INP-HB';

  select s.id into v_season_id
  from public.seasons s
  where s.competition_id = v_competition_id
    and s.name = '2026-2027';

  if v_competition_id is null or v_season_id is null then
    raise exception 'Competition or season not found. Apply migrations 010 and 011 first.';
  end if;

  update public.matches m
  set scheduled_at = (
        (case m.round_number
          when 1 then date '2026-11-28'
          when 2 then date '2026-12-05'
          when 3 then date '2026-12-12'
          when 4 then date '2027-01-09'
          when 5 then date '2027-01-16'
          when 6 then date '2027-01-23'
          when 7 then date '2027-01-30'
          when 8 then date '2027-02-06'
        end + (m.scheduled_at at time zone 'Africa/Abidjan')::time)
        at time zone 'Africa/Abidjan'
      )
  where m.season_id = v_season_id
    and m.round_number between 1 and 8;

  get diagnostics v_updated = row_count;
  if v_updated <> 28 then
    raise exception 'Expected 28 league matches across rounds 1-8; updated % rows. No changes were committed.', v_updated;
  end if;

  update public.seasons s
  set starts_on = date '2026-11-28',
      ends_on = date '2027-02-06'
  where s.id = v_season_id;
end;
$$;

commit;
