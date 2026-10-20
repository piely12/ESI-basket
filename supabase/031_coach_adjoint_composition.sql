-- Restore the assistant coach as a composition-only staff role.
-- Apply after migrations 001 through 030. This migration is intentionally local until run manually.
begin;

insert into public.roles (key, label)
values ('coach_adjoint', 'Coach adjoint')
on conflict (key) do update set label = excluded.label;

-- Remove the assistant from historical staff, statistics, and health-data
-- policies that became active again when the role row was restored.
drop policy if exists staff_self_or_admin_read on public.staff;
create policy staff_self_or_admin_read on public.staff for select to authenticated
  using (public.is_current_app_session() and (
    user_id = auth.uid() or public.has_staff_role(array['admin'])
    or public.is_team_staff(team_id, array['coach'])
  ));

drop policy if exists match_stats_workflow_staff_read on public.match_stats_workflow;
create policy match_stats_workflow_staff_read on public.match_stats_workflow for select to authenticated
  using (public.is_current_app_session() and exists (
    select 1 from public.matches m where m.id = match_id and exists (
      select 1 from public.staff s where s.user_id = auth.uid()
        and s.role in ('statisticienne','coach')
        and s.team_id in (m.home_team_id,m.away_team_id)
    )
  ));

drop policy if exists team_stats_published_read on public.match_team_stats;
create policy team_stats_published_read on public.match_team_stats for select to anon, authenticated
  using (published_at is not null or public.is_team_staff(team_id, array['statisticienne','coach']));

drop policy if exists player_stats_published_or_self_read on public.match_player_stats;
create policy player_stats_published_or_self_read on public.match_player_stats for select to anon, authenticated
  using (
    published_at is not null
    or exists (select 1 from public.players p where p.id = player_id
      and public.is_team_staff(p.team_id, array['statisticienne','coach']))
    or (public.is_current_app_session() and exists (
      select 1 from public.players p where p.id = player_id and p.user_id = auth.uid()
    ))
  );

-- This older FOR ALL policy also grants SELECT, so removing the assistant
-- from the newer public-read policy alone would not keep drafts private.
drop policy if exists player_stats_coach_manage on public.match_player_stats;
create policy player_stats_coach_manage on public.match_player_stats for all to authenticated
  using (
    public.has_staff_role(array['admin','statisticienne'])
    or exists (
      select 1 from public.players p join public.matches m on m.id = match_id
      where p.id = player_id and p.team_id in (m.home_team_id,m.away_team_id)
        and public.is_team_staff(p.team_id, array['coach'])
    )
  )
  with check (
    public.has_staff_role(array['admin','statisticienne'])
    or exists (
      select 1 from public.players p join public.matches m on m.id = match_id
      where p.id = player_id and p.team_id in (m.home_team_id,m.away_team_id)
        and public.is_team_staff(p.team_id, array['coach'])
    )
  );

drop policy if exists injuries_staff_or_self_read on public.injuries;
create policy injuries_staff_or_self_read on public.injuries for select to authenticated
  using (public.has_staff_role(array['admin']) or (public.is_current_app_session() and exists (
    select 1 from public.players p where p.id = player_id
      and (p.user_id = auth.uid() or public.is_team_staff(p.team_id, array['coach']))
  )));
drop policy if exists injuries_coach_manage on public.injuries;
create policy injuries_coach_manage on public.injuries for all to authenticated
  using (public.has_staff_role(array['admin']) or exists (
    select 1 from public.players p where p.id = player_id and public.is_team_staff(p.team_id, array['coach'])
  ))
  with check (public.has_staff_role(array['admin']) or exists (
    select 1 from public.players p where p.id = player_id and public.is_team_staff(p.team_id, array['coach'])
  ));

drop policy if exists suspensions_staff_or_self_read on public.suspensions;
create policy suspensions_staff_or_self_read on public.suspensions for select to authenticated
  using (public.has_staff_role(array['admin']) or (public.is_current_app_session() and exists (
    select 1 from public.players p where p.id = player_id
      and (p.user_id = auth.uid() or public.is_team_staff(p.team_id, array['coach']))
  )));
drop policy if exists suspensions_coach_manage on public.suspensions;
create policy suspensions_coach_manage on public.suspensions for all to authenticated
  using (public.has_staff_role(array['admin']) or exists (
    select 1 from public.players p where p.id = player_id and public.is_team_staff(p.team_id, array['coach'])
  ))
  with check (public.has_staff_role(array['admin']) or exists (
    select 1 from public.players p where p.id = player_id and public.is_team_staff(p.team_id, array['coach'])
  ));

-- The assistant must publish through the workflow RPC so notification
-- generation and exact lineup validation cannot be bypassed.
drop policy if exists notifications_staff_insert on public.notifications;
create policy notifications_staff_insert on public.notifications for insert to authenticated
  with check (public.has_staff_role(array['coach','admin']));

-- Assistants can read only their team's composition workflow rows.
drop policy if exists match_composition_workflow_staff_read on public.match_composition_workflows;
create policy match_composition_workflow_staff_read on public.match_composition_workflows for select to authenticated
  using (public.is_current_app_session() and (
    public.has_staff_role(array['admin'])
    or public.is_team_staff(team_id, array['coach'])
    or public.is_team_staff(team_id, array['coach_adjoint'])
  ));

-- Preserve the existing RPCs and their notification behavior. Widen their
-- staff check only for composition, then add a non-sensitive audit record.
do $migration$
declare
  v_definition text;
  v_original text;
begin
  v_definition := pg_get_functiondef('public.save_match_composition_draft(uuid,uuid,jsonb,jsonb,jsonb)'::regprocedure);
  v_original := v_definition;
  v_definition := replace(v_definition,
    'is_team_staff(p_team_id,array[''coach''])',
    'is_team_staff(p_team_id,array[''coach'',''coach_adjoint''])');
  v_definition := replace(v_definition,
    's.role=''coach''',
    's.role in (''coach'',''coach_adjoint'')');
  v_definition := replace(v_definition,
    'select count(*)::integer into v_expected from public.players p where p.team_id=p_team_id;',
    'select count(*)::integer into v_expected from public.players p where p.team_id=p_team_id;'
      || chr(10) || '  if public.is_team_staff(p_team_id,array[''coach_adjoint'']) and v_expected<>17 then raise exception ''The ESI roster must contain 17 players''; end if;');
  if v_definition = v_original then
    raise exception 'Could not safely update save_match_composition_draft authorization';
  end if;
  if position('coach_adjoint' in v_definition) = 0 or position('17 players' in v_definition) = 0 then
    raise exception 'Assistant authorization or 17-player rule missing from save_match_composition_draft';
  end if;
  execute v_definition;

  v_definition := pg_get_functiondef('public.publish_match_composition(uuid,uuid)'::regprocedure);
  v_original := v_definition;
  v_definition := replace(v_definition,
    'is_team_staff(p_team_id,array[''coach''])',
    'is_team_staff(p_team_id,array[''coach'',''coach_adjoint''])');
  v_definition := replace(v_definition,
    's.role=''coach''',
    's.role in (''coach'',''coach_adjoint'')');
  v_definition := replace(v_definition,
    '  if jsonb_array_length(v_work.draft_availability)<>(select count(*) from public.players where team_id=p_team_id) then',
    '  if public.is_team_staff(p_team_id,array[''coach_adjoint'']) and (select count(*) from public.players where team_id=p_team_id)<>17 then raise exception ''The ESI roster must contain 17 players''; end if;'
      || chr(10) || '  if jsonb_array_length(v_work.draft_availability)<>(select count(*) from public.players where team_id=p_team_id) then');
  v_definition := replace(v_definition,
    '  return ''publiee'';',
    '  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)'
      || chr(10) || '    values(auth.uid(),''match_composition_published'',''match'',p_match_id::text,jsonb_build_object(''team_id'',p_team_id,''publication_version'',v_version));'
      || chr(10) || '  return ''publiee'';');
  if v_definition = v_original then
    raise exception 'Could not safely update publish_match_composition';
  end if;
  if position('coach_adjoint' in v_definition) = 0
    or position('17 players' in v_definition) = 0
    or position('match_composition_published' in v_definition) = 0 then
    raise exception 'Assistant authorization, 17-player rule, or audit record missing from publish_match_composition';
  end if;
  execute v_definition;
end;
$migration$;

-- Retire assistant access from legacy mutation RPCs superseded by the atomic
-- composition workflow. They remain unavailable to authenticated clients.
do $legacy_functions$
declare
  v_definition text;
  v_original text;
begin
  v_definition := pg_get_functiondef('public.save_match_convocations(uuid,uuid,jsonb)'::regprocedure);
  v_original := v_definition;
  v_definition := replace(v_definition,
    'public.is_team_staff(p_team_id, array[''coach'', ''coach_adjoint''])',
    'public.is_team_staff(p_team_id, array[''coach''])');
  if v_definition = v_original or position('coach_adjoint' in v_definition) > 0 then
    raise exception 'Could not safely restrict legacy save_match_convocations';
  end if;
  execute v_definition;

  v_definition := pg_get_functiondef('public.save_match_lineup_slots(uuid,uuid,jsonb)'::regprocedure);
  v_original := v_definition;
  v_definition := replace(v_definition,
    'public.is_team_staff(p_team_id, array[''coach'', ''coach_adjoint''])',
    'public.is_team_staff(p_team_id, array[''coach''])');
  if v_definition = v_original or position('coach_adjoint' in v_definition) > 0 then
    raise exception 'Could not safely restrict legacy save_match_lineup_slots';
  end if;
  execute v_definition;
end;
$legacy_functions$;

commit;
