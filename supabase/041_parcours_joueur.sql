-- Parcours joueur : pseudo affiché, notifications push personnelles et nouveau texte de convocation.
-- Apply after migrations 001 through 040. Rien n'est appliqué à distance par le dépôt.
begin;

-- 1. Pseudo : nom affiché dans l'app joueur. La connexion reste l'e-mail.
--    Seul le joueur lit son propre pseudo ; l'écriture passe par le serveur (service_role).
create table if not exists public.player_pseudos (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pseudo text not null check (char_length(pseudo) between 3 and 20 and pseudo !~ '[[:space:]@]'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists player_pseudos_lower_idx on public.player_pseudos (lower(pseudo));
alter table public.player_pseudos enable row level security;
revoke all on public.player_pseudos from public, anon, authenticated;
grant select on public.player_pseudos to authenticated;
grant all on public.player_pseudos to service_role;
drop policy if exists player_pseudos_self_read on public.player_pseudos;
create policy player_pseudos_self_read on public.player_pseudos for select to authenticated
  using (user_id = (select auth.uid()));

-- 2. Abonnements push personnels : un joueur reçoit sa convocation sur son téléphone.
--    Aucune lecture directe : le serveur (service_role) les gère après avoir vérifié la session.
create table if not exists public.player_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index if not exists player_push_subscriptions_user_idx on public.player_push_subscriptions (user_id);
alter table public.player_push_subscriptions enable row level security;
revoke all on public.player_push_subscriptions from public, anon, authenticated;
grant all on public.player_push_subscriptions to service_role;

-- 3. Une notification de convocation n'est envoyée qu'une fois sur le téléphone.
alter table public.match_composition_notifications add column if not exists push_sent_at timestamptz;

-- 4. Nouveau texte : « Vous êtes convoqué(e) pour le match contre [Équipe] à [heure]. »
--    Même fonction que la migration 027 ; seuls les textes de notification changent.
create or replace function public.publish_match_composition(p_match_id uuid,p_team_id uuid)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare v_work public.match_composition_workflows%rowtype; v_match public.matches%rowtype; v_selected uuid[]; v_old_selected uuid[]; v_changed uuid[]; v_version integer; v_player record; v_notification_id uuid; v_event text; v_body text; v_opponent text; v_when text; v_time text;
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
    select to_char(m.scheduled_at at time zone 'Africa/Abidjan','DD/MM/YYYY')||' · '||coalesce(m.location,'Lieu à confirmer')
      into v_when from public.matches m where m.id=p_match_id;
    select case when m.kickoff_confirmed then concat(coalesce(nullif(ltrim(to_char(m.scheduled_at at time zone 'Africa/Abidjan','HH24'),'0'),''),'0'),'h',nullif(to_char(m.scheduled_at at time zone 'Africa/Abidjan','MI'),'00')) else null end
      into v_time from public.matches m where m.id=p_match_id;
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
      v_body:=case when v_event='selection_retiree' then 'La composition pour ESI contre '||v_opponent||' a été mise à jour. Vous ne faites plus partie des 12 joueurs retenus. '||v_when
        else 'Vous êtes convoqué(e) pour le match contre '||v_opponent||case when v_time is not null then ' à '||v_time else '' end||'. '||v_when end;
      begin
        insert into public.notifications(user_id,title,body,href) values(v_player.user_id,
          case when v_event='selection_retiree' then 'Mise à jour de la sélection' else 'Convocation' end,
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

revoke all on function public.publish_match_composition(uuid,uuid) from public,anon,authenticated;
grant execute on function public.publish_match_composition(uuid,uuid) to authenticated;

commit;
