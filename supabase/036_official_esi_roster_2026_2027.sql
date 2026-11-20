-- Synchronize the existing ESI player records with the official 2026-2027 roster.
-- Player IDs and account links are preserved. Apply this migration through the
-- normal Supabase migration workflow; it is intentionally not applied here.
begin;

do $$
declare
  v_roster_count integer;
  v_temporary_number_count integer;
begin
  select count(*)::integer into v_roster_count
  from public.players p
  join public.teams t on t.id = p.team_id
  where t.is_esi and p.jersey_number between 1 and 17;

  if v_roster_count <> 17 then
    raise exception 'Expected the 17 existing ESI roster records before applying the official roster update';
  end if;

  select count(*)::integer into v_temporary_number_count
  from public.players p
  join public.teams t on t.id = p.team_id
  where t.is_esi and p.jersey_number between 40 and 56;

  if v_temporary_number_count <> 0 then
    raise exception 'Temporary jersey numbers 40-56 must be unused by the ESI roster';
  end if;
end;
$$;

-- Move current jersey numbers to unused values that satisfy the 0-99 check,
-- so the unique (team_id, jersey_number) index cannot conflict while numbers change.
update public.players p
set jersey_number = p.jersey_number + 39
from public.teams t
where t.id = p.team_id
  and t.is_esi
  and p.jersey_number between 1 and 17;

with roster(old_number, jersey_number, first_name, last_name, position) as (
  values
    (10, 0,  'KOUASSI',  'FAMIEN',       'Pivot'),
    (7,  1,  'AMON',     'JEAN LOÏC',    'Meneur'),
    (4,  2,  'BOTCHI',   'PETHUEL',      'Meneur'),
    (9,  3,  'NEBIE',    'ANGE MICHEL',  'Meneur'),
    (17, 4,  'YOBOUE',   'MICAEL',       'Ailier fort'),
    (8,  5,  'MARC',     'GBAGO',        'Ailier'),
    (6,  6,  'M’BOUA',   'SALOMON',      'Ailier'),
    (12, 7,  'DALOUGOU', 'CHRIST-ISRAËL','Arrière'),
    (1,  8,  'KOUAMÉ',   'MIGUEL',       'Ailier'),
    (13, 9,  'KOCLA',    'ALEX',         'Pivot'),
    (16, 11, 'KOUMOIN',  'PENIEL',       'Ailier fort'),
    (15, 12, 'KOUAKOU',  'DE PAUL',      'Meneur'),
    (2,  14, 'KOUAO',    'CHRIS-IVANN',  'Arrière'),
    (11, 15, 'KOUAO',    'DARRYL',       'Pivot'),
    (5,  24, 'COULIBALY','IMAD',         'Ailier'),
    (3,  25, 'KEITA',    'ALMAMY',       'Arrière'),
    (14, 33, 'KONAN',    'LOUKOU',        'Ailier fort')
)
update public.players p
set jersey_number = roster.jersey_number,
    first_name = roster.first_name,
    last_name = roster.last_name,
    position = roster.position
from public.teams t, roster
where t.id = p.team_id
  and t.is_esi
  and p.jersey_number = roster.old_number + 39;

do $$
declare
  v_updated_count integer;
begin
  select count(*)::integer into v_updated_count
  from public.players p
  join public.teams t on t.id = p.team_id
  where t.is_esi and p.jersey_number in (0,1,2,3,4,5,6,7,8,9,11,12,14,15,24,25,33);

  if v_updated_count <> 17 then
    raise exception 'Official ESI roster update did not produce exactly 17 players';
  end if;
end;
$$;

commit;
