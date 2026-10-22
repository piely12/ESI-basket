-- Keep the ESI staff profiles aligned with the names requested by the club.
-- Apply after migrations 001 through 033.
begin;

insert into public.roles (key, label)
values ('coach_adjoint', 'Coach adjoint')
on conflict (key) do update set label = excluded.label;

do $migration$
declare
  v_team_id uuid;
begin
  select id into v_team_id from public.teams where is_esi = true;
  if v_team_id is null then
    raise exception 'The ESI team must exist before applying this migration.';
  end if;

  update public.staff
  set first_name = 'SAIH PIELY', last_name = 'URIEL', updated_at = now()
  where id = (
    select id from public.staff where team_id = v_team_id and role = 'coach'
    order by created_at, id limit 1
  );
  if not exists (select 1 from public.staff where team_id = v_team_id and role = 'coach') then
    insert into public.staff (team_id, first_name, last_name, role)
    values (v_team_id, 'SAIH PIELY', 'URIEL', 'coach');
  end if;

  update public.staff
  set first_name = 'N''GUESSAN', last_name = 'DANIEL-ANGE', updated_at = now()
  where id = (
    select id from public.staff where team_id = v_team_id and role = 'coach_adjoint'
    order by created_at, id limit 1
  );
  if not exists (select 1 from public.staff where team_id = v_team_id and role = 'coach_adjoint') then
    insert into public.staff (team_id, first_name, last_name, role)
    values (v_team_id, 'N''GUESSAN', 'DANIEL-ANGE', 'coach_adjoint');
  end if;

  update public.staff
  set first_name = 'Elmira Lyne-Angela', last_name = 'MELEDJE', updated_at = now()
  where id = (
    select id from public.staff where team_id = v_team_id and role = 'statisticienne'
    order by created_at, id limit 1
  );
  if not exists (select 1 from public.staff where team_id = v_team_id and role = 'statisticienne') then
    insert into public.staff (team_id, first_name, last_name, role)
    values (v_team_id, 'Elmira Lyne-Angela', 'MELEDJE', 'statisticienne');
  end if;
end;
$migration$;

commit;
