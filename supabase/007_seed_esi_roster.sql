-- Initial team, staff records and official player roster.
-- Staff user_id values stay NULL until each person has an Auth account.
begin;

insert into public.teams (name, city, logo_url, is_esi)
values ('The Lions of ESI', null, '/logos/esi.png', true)
on conflict (name) do update
set logo_url = excluded.logo_url,
    is_esi = true;

with team as (
  select id from public.teams where is_esi = true
), roster(jersey_number, first_name, last_name, position) as (
  values
    (1, 'Miguel', 'KOUAME', 'Meneur / Arrière / Ailier / Ailier fort'),
    (2, 'Chris-Ivann', 'KOUAO', 'Arrière'),
    (3, 'Almamy', 'KEITA', 'Arrière'),
    (4, 'Pethuel', 'BOTCHI', 'Meneur'),
    (5, 'Imad', 'COULIBALY ZIE', 'Ailier'),
    (6, 'Salomon', 'M’BOUA', 'Arrière / Ailier'),
    (7, 'LOIC-OTHNIEL', 'AMON', 'Meneur'),
    (8, 'Marc', 'GBAGO', 'Ailier'),
    (9, 'ANGE MICHEL', 'NEBIE', 'Meneur'),
    (10, 'Famien', 'KOUASSI', 'Pivot'),
    (11, 'DARRYL JUNIOR', 'KOUAO', 'Pivot'),
    (12, 'CHRIS-ISRAEL', 'DALOUGOU', 'Arrière'),
    (13, 'ALEX', 'KOCLA KOUAKOU', 'Ailier fort / Pivot'),
    (14, 'ANGE', 'KONAN LOUKOU', 'Ailier fort / Pivot'),
    (15, 'VINCENT DE PAUL', 'KOUAKOU', 'Meneur / Arrière'),
    (16, 'PENIEL', 'KOUMOIN', 'Ailier / Ailier fort'),
    (17, 'JEAN LOIS', 'YOBOUE KOUAME', 'Ailier / Ailier fort')
)
insert into public.players (team_id, jersey_number, first_name, last_name, position, status)
select team.id, roster.jersey_number, roster.first_name, roster.last_name, roster.position, 'actif'
from team cross join roster
on conflict (team_id, jersey_number) where jersey_number is not null
do update set first_name = excluded.first_name,
              last_name = excluded.last_name,
              position = excluded.position,
              status = 'actif';

with team as (
  select id from public.teams where is_esi = true
), staff_seed(first_name, last_name, role) as (
  values
    ('Uriel Loic « Sakito »', 'SAIH PILEY', 'coach'),
    ('Daniel-Angle « Davon »', 'N’guessan', 'coach_adjoint'),
    ('Elmira Lyne-Angela', 'MELEDJE', 'statisticienne'),
    ('Noura', 'KPANGBE', 'videaste')
)
insert into public.staff (team_id, first_name, last_name, role)
select team.id, staff_seed.first_name, staff_seed.last_name, staff_seed.role
from team cross join staff_seed
where not exists (
  select 1 from public.staff existing
  where existing.team_id = team.id
    and existing.role = staff_seed.role
    and lower(existing.first_name) = lower(staff_seed.first_name)
    and lower(existing.last_name) = lower(staff_seed.last_name)
);

commit;
