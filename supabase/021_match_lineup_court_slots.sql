-- Keep each starter in the fixed court position selected by the coach.
-- The existing lineups RLS policy still controls which rows can be read.
begin;

alter table public.match_lineups
  add column if not exists court_slot text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.match_lineups'::regclass
      and conname = 'match_lineups_court_slot_valid'
  ) then
    alter table public.match_lineups add constraint match_lineups_court_slot_valid
      check (court_slot is null or (is_starter and court_slot in (
        'meneur', 'arriere', 'ailier', 'ailier_fort', 'pivot'
      )));
  end if;
end;
$$;

grant select (court_slot) on public.match_lineups to anon, authenticated;
drop policy if exists lineups_coach_manage on public.match_lineups;
revoke insert, update, delete on public.match_lineups from public, anon, authenticated;

create or replace function public.save_match_lineup_slots(
  p_match_id uuid,
  p_team_id uuid,
  p_slots jsonb
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ids uuid[];
  v_valid_count integer;
begin
  if not public.is_current_app_session()
    or not (public.has_staff_role(array['admin'])
      or public.is_team_staff(p_team_id, array['coach', 'coach_adjoint'])) then
    raise exception 'Coach access required';
  end if;
  if not exists (
    select 1 from public.matches m
    where m.id = p_match_id and p_team_id in (m.home_team_id, m.away_team_id)
  ) then
    raise exception 'Team does not belong to this match';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_match_id::text, 73));
  if jsonb_typeof(p_slots) is distinct from 'object' then
    raise exception 'Exactly five fixed court slots are required';
  end if;
  if jsonb_object_length(p_slots) <> 5
    or exists (
      select 1 from jsonb_object_keys(p_slots) as item(key)
      where item.key not in ('meneur', 'arriere', 'ailier', 'ailier_fort', 'pivot')
    ) then
    raise exception 'Exactly five fixed court slots are required';
  end if;

  begin
    select array_agg(item.value::uuid) into v_ids from jsonb_each_text(p_slots) as item(key, value);
  exception when invalid_text_representation then
    raise exception 'Invalid player id in court slots';
  end;
  if cardinality(v_ids) <> 5 or (select count(distinct id) from unnest(v_ids) as ids(id)) <> 5 then
    raise exception 'A player can occupy only one court slot';
  end if;

  select count(*)::integer into v_valid_count
  from jsonb_each_text(p_slots) as item(key, value)
  join public.players p on p.id = item.value::uuid and p.team_id = p_team_id
  join public.match_rosters r on r.match_id = p_match_id and r.player_id = p.id and r.is_called_up;
  if v_valid_count <> 5 then
    raise exception 'All starters must be called up for this team';
  end if;

  delete from public.match_lineups ml using public.players p
  where ml.match_id = p_match_id and p.id = ml.player_id and p.team_id = p_team_id
    and not exists (
      select 1 from public.match_rosters r
      where r.match_id = p_match_id and r.player_id = ml.player_id and r.is_called_up
    );

  insert into public.match_lineups (match_id, player_id, is_starter, court_slot)
  select p_match_id, r.player_id, assigned.court_slot is not null, assigned.court_slot
  from public.match_rosters r
  join public.players p on p.id = r.player_id and p.team_id = p_team_id
  left join (
    select item.key as court_slot, item.value::uuid as player_id
    from jsonb_each_text(p_slots) as item(key, value)
  ) assigned on assigned.player_id = r.player_id
  where r.match_id = p_match_id and r.is_called_up
  on conflict (match_id, player_id) do update set
    is_starter = excluded.is_starter,
    court_slot = excluded.court_slot;

  return 'saved';
end;
$$;

revoke all on function public.save_match_lineup_slots(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.save_match_lineup_slots(uuid, uuid, jsonb) to authenticated;

-- Expose uniquement le nom affiché du coach principal ESI sur la composition.
create or replace view public.public_esi_coaches
with (security_barrier = true) as
select s.team_id, s.first_name, s.last_name
from public.staff s
join public.teams t on t.id = s.team_id
join public.users u on u.id = s.user_id
where t.is_esi and s.role = 'coach' and u.is_active and not u.must_change_password;
grant select on public.public_esi_coaches to anon, authenticated;
comment on view public.public_esi_coaches is
  'Nom public du coach principal ESI affiché sur les compositions de match.';

commit;
