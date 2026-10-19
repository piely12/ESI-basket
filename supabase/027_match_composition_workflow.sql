-- Match-scoped coach composition drafts, guarded publication, and internal notifications.
-- Apply after migrations 001 through 026.
begin;

alter table public.match_rosters
  add column if not exists availability_status text not null default 'disponible'
    check (availability_status in ('disponible','blesse','indisponible'));
grant select (availability_status) on public.match_rosters to authenticated;

create table if not exists public.match_composition_workflows (
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  status text not null default 'brouillon' check (status in ('brouillon','publiee','verrouillee')),
  draft_availability jsonb not null default '[]'::jsonb check (jsonb_typeof(draft_availability)='array'),
  draft_selected_player_ids jsonb not null default '[]'::jsonb check (jsonb_typeof(draft_selected_player_ids)='array'),
  draft_court_slots jsonb not null default '{}'::jsonb check (jsonb_typeof(draft_court_slots)='object'),
  published_version integer not null default 0 check (published_version >= 0),
  published_at timestamptz,
  published_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (match_id, team_id)
);

alter table public.match_composition_workflows enable row level security;
revoke all on public.match_composition_workflows from public, anon, authenticated;
grant select on public.match_composition_workflows to authenticated;
grant all on public.match_composition_workflows to service_role;
drop policy if exists match_composition_workflow_staff_read on public.match_composition_workflows;
create policy match_composition_workflow_staff_read on public.match_composition_workflows for select to authenticated
  using (public.is_current_app_session() and (
    public.has_staff_role(array['admin']) or public.is_team_staff(team_id,array['coach'])
  ));
drop policy if exists match_composition_workflow_public_status_read on public.match_composition_workflows;
create policy match_composition_workflow_public_status_read on public.match_composition_workflows for select to anon
  using (status in ('publiee','verrouillee'));

create table if not exists public.match_composition_notifications (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  publication_version integer not null,
  event_type text not null check (event_type in ('selection_officielle','selection_modifiee','selection_retiree')),
  notification_id uuid references public.notifications(id) on delete set null,
  status text not null default 'en_attente' check (status in ('en_attente','envoyee','echouee','lue')),
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  read_at timestamptz,
  unique (match_id,player_id,publication_version,event_type)
);
alter table public.match_composition_notifications enable row level security;
revoke all on public.match_composition_notifications from public, anon, authenticated;
grant select on public.match_composition_notifications to authenticated;
grant all on public.match_composition_notifications to service_role;
drop policy if exists match_composition_notifications_owner_read on public.match_composition_notifications;
create policy match_composition_notifications_owner_read on public.match_composition_notifications for select to authenticated
  using (public.is_current_app_session() and (user_id=auth.uid() or public.has_staff_role(array['admin']) or public.is_team_staff(team_id,array['coach'])));

create or replace function public.sync_match_composition_notification_read()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if new.read_at is distinct from old.read_at and new.read_at is not null then
    update public.match_composition_notifications set status='lue',read_at=new.read_at
      where notification_id=new.id and status='envoyee';
  end if;
  return new;
end; $$;
drop trigger if exists match_composition_notification_read_sync on public.notifications;
create trigger match_composition_notification_read_sync after update of read_at on public.notifications
for each row execute function public.sync_match_composition_notification_read();

create or replace function public.save_match_composition_draft(
  p_match_id uuid,p_team_id uuid,p_availability jsonb,p_selected_player_ids jsonb,p_court_slots jsonb
) returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare v_expected integer; v_received integer; v_selected integer; v_slot_count integer; v_status text; v_match public.matches%rowtype;
begin
  if not public.is_current_app_session() or not public.is_team_staff(p_team_id,array['coach']) then raise exception 'Coach access required'; end if;
  select m.* into v_match from public.matches m join public.teams t on t.id=p_team_id where m.id=p_match_id and t.is_esi and p_team_id in (m.home_team_id,m.away_team_id);
  if not found then raise exception 'Match ESI introuvable'; end if;
  if v_match.scheduled_at <= now() or v_match.status in ('en_cours','termine') then raise exception 'Composition verrouillée après le coup d’envoi'; end if;
  if not exists(select 1 from public.staff s where s.user_id=auth.uid() and s.team_id=p_team_id and s.role='coach') then raise exception 'Coach principal requis'; end if;
  if jsonb_typeof(p_availability) is distinct from 'array' or jsonb_typeof(p_selected_player_ids) is distinct from 'array' or jsonb_typeof(p_court_slots) is distinct from 'object' then raise exception 'Brouillon invalide'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_match_id::text,73));
  select w.status into v_status from public.match_composition_workflows w where w.match_id=p_match_id and w.team_id=p_team_id for update;
  if v_status='verrouillee' then raise exception 'Composition verrouillée'; end if;
  select count(*)::integer into v_expected from public.players p where p.team_id=p_team_id;
  select count(distinct x.player_id)::integer into v_received from jsonb_to_recordset(p_availability) as x(player_id uuid,availability_status text);
  if v_expected=0 or v_received<>v_expected or exists(
    select 1 from jsonb_to_recordset(p_availability) as x(player_id uuid,availability_status text)
    where x.availability_status is null or x.availability_status not in ('disponible','blesse','indisponible') or not exists(select 1 from public.players p where p.id=x.player_id and p.team_id=p_team_id)
  ) then raise exception 'Les disponibilités ne correspondent pas à l’effectif ESI'; end if;
  select count(*)::integer into v_selected from jsonb_array_elements_text(p_selected_player_ids);
  if v_selected>12 or v_selected<>(select count(distinct value) from jsonb_array_elements_text(p_selected_player_ids)) then raise exception 'Sélection invalide'; end if;
  if exists(select 1 from jsonb_array_elements_text(p_selected_player_ids) s(value)
    where not exists(select 1 from jsonb_to_recordset(p_availability) a(player_id uuid,availability_status text) where a.player_id=s.value::uuid and a.availability_status='disponible')) then raise exception 'Un joueur indisponible ne peut pas être retenu'; end if;
  if (select count(*) from jsonb_object_keys(p_court_slots))>5 or exists(select 1 from jsonb_object_keys(p_court_slots) k(key) where k.key not in ('meneur','arriere','ailier','ailier_fort','pivot')) then raise exception 'Postes de titulaires invalides'; end if;
  select count(*)::integer into v_slot_count from jsonb_each_text(p_court_slots);
  if v_slot_count<>(select count(distinct value) from jsonb_each_text(p_court_slots)) or exists(
    select 1 from jsonb_each_text(p_court_slots) s(key,value) where not exists(select 1 from jsonb_array_elements_text(p_selected_player_ids) p(value) where p.value=s.value)
  ) then raise exception 'Chaque titulaire doit être sélectionné une seule fois'; end if;
  insert into public.match_composition_workflows(match_id,team_id,draft_availability,draft_selected_player_ids,draft_court_slots,status,updated_by,updated_at)
  values(p_match_id,p_team_id,p_availability,p_selected_player_ids,p_court_slots,'brouillon',auth.uid(),now())
  on conflict(match_id,team_id) do update set draft_availability=excluded.draft_availability,draft_selected_player_ids=excluded.draft_selected_player_ids,
    draft_court_slots=excluded.draft_court_slots,status=case when public.match_composition_workflows.status='publiee' then 'publiee' else 'brouillon' end,updated_by=auth.uid(),updated_at=now();
  return 'saved';
end; $$;

create or replace function public.publish_match_composition(p_match_id uuid,p_team_id uuid)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare v_work public.match_composition_workflows%rowtype; v_match public.matches%rowtype; v_selected uuid[]; v_old_selected uuid[]; v_changed uuid[]; v_version integer; v_player record; v_notification_id uuid; v_event text; v_body text; v_opponent text; v_when text;
begin
  if not public.is_current_app_session() or not public.is_team_staff(p_team_id,array['coach']) then raise exception 'Coach access required'; end if;
  if not exists(select 1 from public.staff s where s.user_id=auth.uid() and s.team_id=p_team_id and s.role='coach') then raise exception 'Coach principal requis'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_match_id::text,73));
  select m.* into v_match from public.matches m join public.teams t on t.id=p_team_id where m.id=p_match_id and t.is_esi and p_team_id in (m.home_team_id,m.away_team_id);
  if not found then raise exception 'Match ESI introuvable'; end if;
  if v_match.scheduled_at<=now() or v_match.status in ('en_cours','termine') then raise exception 'Composition verrouillée après le coup d’envoi'; end if;
  select * into v_work from public.match_composition_workflows w where w.match_id=p_match_id and w.team_id=p_team_id for update;
  if not found then raise exception 'Enregistre le brouillon avant publication'; end if;
  if v_work.status='verrouillee' then raise exception 'Composition verrouillée'; end if;
  select array_agg(value::uuid) into v_selected from jsonb_array_elements_text(v_work.draft_selected_player_ids);
  if coalesce(cardinality(v_selected),0)<>12 or (select count(distinct x) from unnest(v_selected) x)<>12 then raise exception 'Il faut exactement 12 joueurs distincts'; end if;
  if jsonb_array_length(v_work.draft_availability)<>(select count(*) from public.players where team_id=p_team_id) then raise exception 'Actualise les disponibilités de l’effectif'; end if;
  if exists(select 1 from unnest(v_selected) s(id) where not exists(
    select 1 from jsonb_to_recordset(v_work.draft_availability) a(player_id uuid,availability_status text) join public.players p on p.id=a.player_id and p.team_id=p_team_id
    where a.player_id=s.id and a.availability_status='disponible')) then raise exception 'Un joueur indisponible ne peut pas être retenu'; end if;
  if jsonb_typeof(v_work.draft_court_slots) is distinct from 'object' or (select count(*) from jsonb_object_keys(v_work.draft_court_slots))<>5 then raise exception 'Choisis cinq titulaires'; end if;
  if exists(select 1 from jsonb_object_keys(v_work.draft_court_slots) k(key) where k.key not in ('meneur','arriere','ailier','ailier_fort','pivot')) then raise exception 'Postes titulaires invalides'; end if;
  if (select count(distinct value) from jsonb_each_text(v_work.draft_court_slots))<>5 or exists(
    select 1 from jsonb_each_text(v_work.draft_court_slots) s(key,value) where not (s.value::uuid=any(v_selected))
  ) then raise exception 'Les cinq postes doivent appartenir à cinq joueurs retenus'; end if;
  select coalesce(array_agg(r.player_id),'{}'::uuid[]) into v_old_selected from public.match_rosters r join public.players p on p.id=r.player_id
    where r.match_id=p_match_id and p.team_id=p_team_id and r.is_called_up;
  if v_work.status in ('publiee','verrouillee') then
    select coalesce(array_agg(changed.id),'{}'::uuid[]) into v_changed from (
      select s.id from unnest(v_selected) s(id) where not (s.id=any(coalesce(v_old_selected,'{}'::uuid[])))
      union
      select s.id from unnest(coalesce(v_old_selected,'{}'::uuid[])) s(id) where not (s.id=any(v_selected))
    ) changed;
  else v_changed:=v_selected;
  end if;
  v_version:=v_work.published_version+case when coalesce(cardinality(v_changed),0)>0 then 1 else 0 end;
  update public.match_rosters r set is_called_up=(r.player_id=any(v_selected)),availability_status=a.availability_status,
    response=case when not (r.player_id=any(v_selected)) then null else r.response end,updated_at=now()
  from jsonb_to_recordset(v_work.draft_availability) a(player_id uuid,availability_status text),public.players p
  where r.match_id=p_match_id and p.id=r.player_id and p.team_id=p_team_id and a.player_id=p.id;
  insert into public.match_rosters(match_id,player_id,is_called_up,availability_status)
  select p_match_id,p.id,p.id=any(v_selected),a.availability_status from jsonb_to_recordset(v_work.draft_availability) a(player_id uuid,availability_status text)
  join public.players p on p.id=a.player_id and p.team_id=p_team_id on conflict(match_id,player_id) do update set is_called_up=excluded.is_called_up,availability_status=excluded.availability_status,updated_at=now();
  delete from public.convocations c using public.players p where c.match_id=p_match_id and p.id=c.player_id and p.team_id=p_team_id and not (c.player_id=any(v_selected));
  insert into public.convocations(match_id,player_id,sent_by) select p_match_id,id,auth.uid() from unnest(v_selected) x(id)
  on conflict(match_id,player_id) do update set status='envoyee',sent_at=now(),sent_by=auth.uid();
  delete from public.match_lineups ml using public.players p where ml.match_id=p_match_id and p.id=ml.player_id and p.team_id=p_team_id;
  insert into public.match_lineups(match_id,player_id,is_starter,court_slot)
  select p_match_id,id,s.court_slot is not null,s.court_slot from unnest(v_selected) x(id)
  left join (select key as court_slot,value::uuid as player_id from jsonb_each_text(v_work.draft_court_slots)) s on s.player_id=x.id;
  update public.match_composition_workflows set status='publiee',published_at=now(),published_by=auth.uid(),published_version=v_version,updated_by=auth.uid(),updated_at=now()
    where match_id=p_match_id and team_id=p_team_id;
  if coalesce(cardinality(v_changed),0)>0 then
    select case when m.home_team_id=p_team_id then away.name else home.name end into v_opponent from public.matches m
      join public.teams home on home.id=m.home_team_id join public.teams away on away.id=m.away_team_id where m.id=p_match_id;
    select to_char(m.scheduled_at at time zone 'Africa/Abidjan','DD/MM/YYYY')||case when m.kickoff_confirmed then ' à '||to_char(m.scheduled_at at time zone 'Africa/Abidjan','HH24:MI') else '' end||' · '||coalesce(m.location,'Lieu à confirmer')
      into v_when from public.matches m where m.id=p_match_id;
    for v_player in select p.id,p.user_id,p.first_name from unnest(v_changed) c(id) join public.players p on p.id=c.id loop
      if v_work.status in ('publiee','verrouillee') and v_player.id=any(v_selected) then v_event:='selection_modifiee'; else v_event:='selection_officielle'; end if;
      if not (v_player.id=any(v_selected)) then v_event:='selection_retiree'; end if;
      insert into public.match_composition_notifications(match_id,team_id,player_id,user_id,publication_version,event_type,status)
        values(p_match_id,p_team_id,v_player.id,v_player.user_id,v_version,v_event,'en_attente') on conflict do nothing;
      if not found then continue; end if;
      if v_player.user_id is null then
        update public.match_composition_notifications set status='echouee',error_message='Aucun compte joueur rattaché à cette fiche'
          where match_id=p_match_id and player_id=v_player.id and publication_version=v_version and event_type=v_event;
        continue;
      end if;
      v_body:=case when v_event='selection_retiree' then 'La composition pour ESI contre '||v_opponent||' a été mise à jour. Tu ne fais plus partie des 12 joueurs retenus. '||v_when
        else 'Tu es retenu(e) pour le match ESI contre '||v_opponent||'. '||v_when end;
      begin
        insert into public.notifications(user_id,title,body,href) values(v_player.user_id,
          case when v_event='selection_retiree' then 'Mise à jour de la sélection' else 'Sélection officielle' end,
          v_body,'/matchs/'||p_match_id::text) returning id into v_notification_id;
        update public.match_composition_notifications set notification_id=v_notification_id,status='envoyee',sent_at=now()
          where match_id=p_match_id and player_id=v_player.id and publication_version=v_version and event_type=v_event;
      exception when others then
        update public.match_composition_notifications set status='echouee',error_message=left(sqlerrm,300)
          where match_id=p_match_id and player_id=v_player.id and publication_version=v_version and event_type=v_event;
      end;
    end loop;
  end if;
  return 'publiee';
end; $$;

revoke all on function public.save_match_composition_draft(uuid,uuid,jsonb,jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.publish_match_composition(uuid,uuid) from public,anon,authenticated;
grant execute on function public.save_match_composition_draft(uuid,uuid,jsonb,jsonb,jsonb) to authenticated;
grant execute on function public.publish_match_composition(uuid,uuid) to authenticated;

-- Historical lineups remain published so existing match records keep their display.
insert into public.match_composition_workflows(match_id,team_id,status,draft_availability,draft_selected_player_ids,draft_court_slots,published_version,published_at)
select ml.match_id,p.team_id,'publiee',
  coalesce((select jsonb_agg(jsonb_build_object('player_id',r.player_id,'availability_status',r.availability_status)) from public.match_rosters r join public.players rp on rp.id=r.player_id where r.match_id=ml.match_id and rp.team_id=p.team_id),'[]'::jsonb),
  coalesce((select jsonb_agg(r.player_id::text) from public.match_rosters r join public.players rp on rp.id=r.player_id where r.match_id=ml.match_id and rp.team_id=p.team_id and r.is_called_up),'[]'::jsonb),
  coalesce((select jsonb_object_agg(l.court_slot,l.player_id::text) from public.match_lineups l join public.players lp on lp.id=l.player_id where l.match_id=ml.match_id and lp.team_id=p.team_id and l.is_starter and l.court_slot is not null),'{}'::jsonb),
  1,now()
from public.match_lineups ml join public.players p on p.id=ml.player_id join public.teams t on t.id=p.team_id and t.is_esi
group by ml.match_id,p.team_id
on conflict(match_id,team_id) do nothing;

-- A lineup is public on matchday only if its team has explicitly published it.
drop policy if exists lineups_matchday_or_coach_read on public.match_lineups;
create policy lineups_matchday_or_coach_read on public.match_lineups for select to anon, authenticated
using (
  exists(select 1 from public.match_composition_workflows w where w.match_id=match_lineups.match_id and w.team_id=(select p.team_id from public.players p where p.id=match_lineups.player_id) and w.status in ('publiee','verrouillee'))
  and (
    public.has_staff_role(array['admin']) or public.is_team_staff((select p.team_id from public.players p where p.id=match_lineups.player_id),array['coach'])
    or exists(select 1 from public.matches m where m.id=match_lineups.match_id and (m.status='termine' or (now() at time zone 'Africa/Abidjan')::date >= (m.scheduled_at at time zone 'Africa/Abidjan')::date)
      and public.is_current_app_session())
  )
);

-- Keep drafts private, while exposing only the publication state to the public site.
create or replace view public.match_composition_public_status
with (security_barrier=true) as
select match_id,team_id,status,published_at from public.match_composition_workflows
where status in ('publiee','verrouillee');
grant select on public.match_composition_public_status to anon,authenticated;

create or replace function public.is_match_composition_published(p_match_id uuid,p_team_id uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from public.match_composition_workflows w where w.match_id=p_match_id and w.team_id=p_team_id and w.status in ('publiee','verrouillee'));
$$;
revoke all on function public.is_match_composition_published(uuid,uuid) from public;
grant execute on function public.is_match_composition_published(uuid,uuid) to anon,authenticated;

-- Coaches can read roster rows but every write is atomic through the workflow RPC.
drop policy if exists match_rosters_staff_manage on public.match_rosters;
drop policy if exists match_rosters_coach_read on public.match_rosters;
create policy match_rosters_coach_read on public.match_rosters for select to authenticated
  using (public.is_current_app_session() and (public.has_staff_role(array['admin']) or exists(
    select 1 from public.matches m join public.players p on p.id=match_rosters.player_id
    where m.id=match_rosters.match_id and p.team_id in (m.home_team_id,m.away_team_id) and public.is_team_staff(p.team_id,array['coach'])
  )));
drop policy if exists match_rosters_admin_manage on public.match_rosters;

-- Calendar, global player profiles, and match results are admin-managed.
drop policy if exists players_staff_manage on public.players;
drop policy if exists players_admin_manage on public.players;
create policy players_admin_manage on public.players for all to authenticated
  using (public.has_staff_role(array['admin'])) with check (public.has_staff_role(array['admin']));
drop policy if exists matches_coach_insert on public.matches;
drop policy if exists matches_coach_update on public.matches;
drop policy if exists matches_admin_insert on public.matches;
drop policy if exists matches_admin_update on public.matches;
create policy matches_admin_insert on public.matches for insert to authenticated with check (public.has_staff_role(array['admin']));
create policy matches_admin_update on public.matches for update to authenticated
  using (public.has_staff_role(array['admin'])) with check (public.has_staff_role(array['admin']));

-- Remove direct table writes and legacy authenticated RPCs that bypass publication.
drop policy if exists lineups_coach_manage on public.match_lineups;
drop policy if exists lineups_admin_manage on public.match_lineups;
drop policy if exists convocations_coach_manage on public.convocations;
drop policy if exists convocations_admin_manage on public.convocations;
drop policy if exists match_preparations_team_access on public.match_preparations;
drop policy if exists match_preparations_admin_manage on public.match_preparations;
create policy match_preparations_admin_manage on public.match_preparations for all to authenticated
  using (public.has_staff_role(array['admin'])) with check (public.has_staff_role(array['admin']));
revoke all on function public.save_match_lineup_slots(uuid,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.save_match_convocations(uuid,uuid,jsonb) from public,anon,authenticated;

-- Match lineups are visible to visitors as soon as the team publishes them.
drop policy if exists lineups_matchday_or_coach_read on public.match_lineups;
create policy lineups_matchday_or_coach_read on public.match_lineups for select to anon,authenticated
using (
  public.is_match_composition_published(match_lineups.match_id,(select p.team_id from public.players p where p.id=match_lineups.player_id))
);

commit;
