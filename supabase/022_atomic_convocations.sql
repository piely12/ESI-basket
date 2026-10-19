-- Save a coach's match call-ups and player notifications atomically.
-- Apply after migrations 001 through 021.
begin;

create or replace function public.save_match_convocations(
  p_match_id uuid,
  p_team_id uuid,
  p_player_ids jsonb
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
  if jsonb_typeof(p_player_ids) is distinct from 'array' then
    raise exception 'Invalid call-up list';
  end if;

  begin
    select coalesce(array_agg(item.value::uuid), '{}'::uuid[]) into v_ids
    from jsonb_array_elements_text(p_player_ids) as item(value);
  exception when invalid_text_representation then
    raise exception 'Invalid player id in call-up list';
  end;
  if cardinality(v_ids) <> (select count(distinct id) from unnest(v_ids) as ids(id)) then
    raise exception 'A player can only be called up once';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_match_id::text, 74));
  select count(*)::integer into v_valid_count
  from unnest(v_ids) as selected(player_id)
  join public.players p on p.id = selected.player_id and p.team_id = p_team_id;
  if v_valid_count <> cardinality(v_ids) then
    raise exception 'Call-up list contains a player outside this team';
  end if;

  delete from public.convocations c using public.players p
  where c.match_id = p_match_id and p.id = c.player_id and p.team_id = p_team_id
    and not (c.player_id = any(v_ids));

  update public.match_rosters r set
    is_called_up = false, response = null, validated_at = null, validated_by = null,
    updated_at = now()
  from public.players p
  where r.match_id = p_match_id and p.id = r.player_id and p.team_id = p_team_id
    and r.is_called_up and not (r.player_id = any(v_ids));

  insert into public.match_rosters (match_id, player_id, is_called_up)
  select p_match_id, selected.player_id, true
  from unnest(v_ids) as selected(player_id)
  on conflict (match_id, player_id) do update set is_called_up = true, updated_at = now();

  insert into public.convocations (match_id, player_id, sent_by)
  select p_match_id, selected.player_id, auth.uid()
  from unnest(v_ids) as selected(player_id)
  on conflict (match_id, player_id) do nothing;

  return 'saved';
end;
$$;

revoke all on function public.save_match_convocations(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.save_match_convocations(uuid, uuid, jsonb) to authenticated;

comment on function public.save_match_convocations(uuid, uuid, jsonb) is
  'Atomically saves called-up players and their match invitations for an authorized team coach.';

commit;
