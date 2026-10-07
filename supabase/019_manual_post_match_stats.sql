-- Manual, after-match statistician workflow: nullable drafts, review checkpoint,
-- guarded publication, audit events, and an atomic server-only draft RPC.
-- Apply after migrations 001 through 018.
begin;

alter table public.match_player_stats
  alter column minutes_played drop not null, alter column minutes_played drop default,
  alter column points drop not null, alter column points drop default,
  alter column rebounds drop not null, alter column rebounds drop default,
  alter column assists drop not null, alter column assists drop default,
  alter column steals drop not null, alter column steals drop default,
  alter column blocks drop not null, alter column blocks drop default,
  alter column turnovers drop not null, alter column turnovers drop default,
  alter column fg_made drop not null, alter column fg_made drop default,
  alter column fg_attempted drop not null, alter column fg_attempted drop default,
  alter column three_made drop not null, alter column three_made drop default,
  alter column three_attempted drop not null, alter column three_attempted drop default,
  alter column ft_made drop not null, alter column ft_made drop default,
  alter column ft_attempted drop not null, alter column ft_attempted drop default;

alter table public.match_team_stats
  alter column points drop not null, alter column points drop default,
  alter column rebounds drop not null, alter column rebounds drop default,
  alter column assists drop not null, alter column assists drop default,
  alter column fg_made drop not null, alter column fg_made drop default,
  alter column fg_attempted drop not null, alter column fg_attempted drop default,
  alter column three_made drop not null, alter column three_made drop default,
  alter column three_attempted drop not null, alter column three_attempted drop default,
  alter column ft_made drop not null, alter column ft_made drop default,
  alter column ft_attempted drop not null, alter column ft_attempted drop default,
  add column if not exists steals integer check (steals is null or steals >= 0),
  add column if not exists blocks integer check (blocks is null or blocks >= 0),
  add column if not exists turnovers integer check (turnovers is null or turnovers >= 0),
  add column if not exists personal_fouls integer check (personal_fouls is null or personal_fouls >= 0);

-- Drafts may contain only one half of the rebound split until the second
-- value is entered. The total rebounds field is derived only once both exist.
alter table public.match_player_stats
  drop constraint if exists match_player_stats_rebound_split_consistent;

create table if not exists public.match_stats_workflow (
  match_id uuid primary key references public.matches(id) on delete cascade,
  home_score_draft integer,
  away_score_draft integer,
  status text not null default 'brouillon' check (status in (
    'brouillon', 'saisie_en_cours', 'pret_a_verifier', 'a_corriger', 'pret_a_publier', 'publie'
  )),
  review_warnings jsonb not null default '[]'::jsonb check (jsonb_typeof(review_warnings) = 'array'),
  result_checked boolean not null default false,
  team_stats_checked boolean not null default false,
  player_stats_checked boolean not null default false,
  anomalies_checked boolean not null default false,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  published_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  correction_reason text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.match_stats_workflow
  add column if not exists home_score_draft integer,
  add column if not exists away_score_draft integer;
do $$
begin
  if not exists (select 1 from pg_constraint where conrelid='public.match_stats_workflow'::regclass and conname='match_stats_workflow_draft_score_pair') then
    alter table public.match_stats_workflow add constraint match_stats_workflow_draft_score_pair
      check ((home_score_draft is null and away_score_draft is null) or
        (home_score_draft is not null and away_score_draft is not null
          and home_score_draft between 0 and 200 and away_score_draft between 0 and 200));
  end if;
end;
$$;

alter table public.match_stats_workflow enable row level security;
revoke all on public.match_stats_workflow from public, anon, authenticated;
grant select on public.match_stats_workflow to authenticated;
grant all on public.match_stats_workflow to service_role;

-- All statistical writes now go through the server-side guarded RPCs below.
-- Remove the legacy direct-write policies and grants from browser sessions.
drop policy if exists team_stats_statistician_manage on public.match_team_stats;
drop policy if exists player_stats_statistician_manage on public.match_player_stats;
revoke insert, update, delete on public.match_team_stats, public.match_player_stats
  from public, anon, authenticated;

-- The manual workflow replaces the former Excel and AI import checkpoint.
-- Keep any historical rows intact, but make the obsolete tables inaccessible.
drop policy if exists stats_import_statistician_manage on public.stats_import_jobs;
drop policy if exists stats_import_staff_read on public.stats_import_jobs;
drop policy if exists stats_checkpoints_statistician_manage on public.stats_import_checkpoints;
drop policy if exists stats_checkpoints_staff_read on public.stats_import_checkpoints;
revoke all on public.stats_import_jobs, public.stats_import_checkpoints
  from public, anon, authenticated;
drop policy if exists match_stats_workflow_staff_read on public.match_stats_workflow;
create policy match_stats_workflow_staff_read on public.match_stats_workflow for select to authenticated
  using (
    public.is_current_app_session()
    and exists (
      select 1 from public.matches m
      where m.id = match_id
        and exists (select 1 from public.staff s where s.user_id=auth.uid()
          and s.role in ('statisticienne','coach','coach_adjoint')
          and s.team_id in (m.home_team_id,m.away_team_id))
    )
  );

-- Unpublished statistics are visible only to the statistician and the team's
-- coaching staff. Admin keeps account/editorial privileges, not stats access.
drop policy if exists team_stats_published_read on public.match_team_stats;
create policy team_stats_published_read on public.match_team_stats for select to anon, authenticated
  using (published_at is not null or public.is_team_staff(team_id, array['statisticienne','coach','coach_adjoint']));
drop policy if exists player_stats_published_or_self_read on public.match_player_stats;
create policy player_stats_published_or_self_read on public.match_player_stats for select to anon, authenticated
  using (
    published_at is not null
    or exists (select 1 from public.players p where p.id=player_id and
      public.is_team_staff(p.team_id, array['statisticienne','coach','coach_adjoint']))
    or (public.is_current_app_session() and exists (
      select 1 from public.players p where p.id=player_id and p.user_id=auth.uid()
    ))
  );

-- Keep a clear workflow status for statistics already entered before this
-- migration. Their historical values remain unchanged.
insert into public.match_stats_workflow (match_id, home_score_draft, away_score_draft, status, published_at, updated_at)
select m.id, m.home_score, m.away_score,
       case when exists (select 1 from public.match_player_stats ps where ps.match_id = m.id and ps.published_at is not null)
         then 'publie' else 'saisie_en_cours' end,
       (select max(ps.published_at) from public.match_player_stats ps where ps.match_id = m.id), now()
from public.matches m
where exists (select 1 from public.match_player_stats ps where ps.match_id = m.id)
   or exists (select 1 from public.match_team_stats ts where ts.match_id = m.id)
on conflict (match_id) do nothing;

create or replace function public.save_esi_match_stats_manual(
  p_match_id uuid,
  p_actor_id uuid,
  p_home_score integer,
  p_away_score integer,
  p_team_stats jsonb,
  p_player_stats jsonb
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_team_id uuid;
  v_expected integer;
  v_received integer;
  v_status text;
begin
  if (p_home_score is null) <> (p_away_score is null)
    or (p_home_score is not null and p_home_score not between 0 and 200)
    or (p_away_score is not null and p_away_score not between 0 and 200)
    or jsonb_typeof(p_team_stats) is distinct from 'object'
    or jsonb_typeof(p_player_stats) is distinct from 'array' then
    raise exception 'Invalid match statistics payload';
  end if;
  select s.team_id into v_team_id
  from public.staff s join public.teams t on t.id = s.team_id
  join public.users u on u.id = s.user_id
  where s.user_id = p_actor_id and s.role = 'statisticienne'
    and t.is_esi and u.is_active and not u.must_change_password;
  if v_team_id is null then raise exception 'Statistician access required'; end if;
  if not exists (
    select 1 from public.matches m where m.id = p_match_id and m.status = 'termine'
      and v_team_id in (m.home_team_id, m.away_team_id)
  ) then raise exception 'Only a finished ESI match can be edited'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_match_id::text, 19));
  select w.status into v_status from public.match_stats_workflow w where w.match_id = p_match_id for update;
  if v_status = 'publie' then raise exception 'Reopen published statistics before editing'; end if;

  select count(*)::integer into v_expected
  from public.match_rosters r join public.players p on p.id = r.player_id
  where r.match_id = p_match_id and r.is_called_up and p.team_id = v_team_id;
  select count(distinct x.player_id)::integer into v_received
  from jsonb_to_recordset(p_player_stats) as x(player_id uuid);
  if v_expected = 0 or v_received <> v_expected
    or exists (
      select 1 from jsonb_to_recordset(p_player_stats) as x(player_id uuid)
      where not exists (
        select 1 from public.match_rosters r join public.players p on p.id = r.player_id
        where r.match_id = p_match_id and r.is_called_up and r.player_id = x.player_id and p.team_id = v_team_id
      )
    ) then raise exception 'Submitted players do not match the validated match roster'; end if;

  insert into public.match_player_stats (
    match_id, player_id, minutes_played, points, rebounds, personal_fouls,
    rebounds_defensive, rebounds_offensive, assists, steals, blocks, turnovers,
    fg_made, fg_attempted, three_made, three_attempted, ft_made, ft_attempted,
    published_at, published_by
  )
  select p_match_id, x.player_id, x.minutes_played, x.points,
    case when x.rebounds_defensive is null or x.rebounds_offensive is null then null
      else x.rebounds_defensive + x.rebounds_offensive end,
    x.personal_fouls, x.rebounds_defensive, x.rebounds_offensive, x.assists,
    x.steals, x.blocks, x.turnovers, x.fg_made, x.fg_attempted,
    x.three_made, x.three_attempted, x.ft_made, x.ft_attempted, null, null
  from jsonb_to_recordset(p_player_stats) as x(
    player_id uuid, minutes_played numeric, points integer, personal_fouls integer,
    rebounds_defensive integer, rebounds_offensive integer, assists integer,
    steals integer, blocks integer, turnovers integer, fg_made integer,
    fg_attempted integer, three_made integer, three_attempted integer,
    ft_made integer, ft_attempted integer
  )
  on conflict (match_id, player_id) do update set
    minutes_played = excluded.minutes_played, points = excluded.points,
    rebounds = excluded.rebounds, personal_fouls = excluded.personal_fouls,
    rebounds_defensive = excluded.rebounds_defensive, rebounds_offensive = excluded.rebounds_offensive,
    assists = excluded.assists, steals = excluded.steals, blocks = excluded.blocks,
    turnovers = excluded.turnovers, fg_made = excluded.fg_made, fg_attempted = excluded.fg_attempted,
    three_made = excluded.three_made, three_attempted = excluded.three_attempted,
    ft_made = excluded.ft_made, ft_attempted = excluded.ft_attempted,
    published_at = null, published_by = null, updated_at = now();

  insert into public.match_team_stats (
    match_id, team_id, points, rebounds, assists, steals, blocks, turnovers,
    personal_fouls, fg_made, fg_attempted, three_made, three_attempted,
    ft_made, ft_attempted, published_at, published_by
  ) values (
    p_match_id, v_team_id, (p_team_stats->>'points')::integer,
    (p_team_stats->>'rebounds')::integer, (p_team_stats->>'assists')::integer,
    (p_team_stats->>'steals')::integer, (p_team_stats->>'blocks')::integer,
    (p_team_stats->>'turnovers')::integer, (p_team_stats->>'personal_fouls')::integer,
    (p_team_stats->>'fg_made')::integer, (p_team_stats->>'fg_attempted')::integer,
    (p_team_stats->>'three_made')::integer, (p_team_stats->>'three_attempted')::integer,
    (p_team_stats->>'ft_made')::integer, (p_team_stats->>'ft_attempted')::integer, null, null
  ) on conflict (match_id, team_id) do update set
    points = excluded.points, rebounds = excluded.rebounds, assists = excluded.assists,
    steals = excluded.steals, blocks = excluded.blocks, turnovers = excluded.turnovers,
    personal_fouls = excluded.personal_fouls, fg_made = excluded.fg_made,
    fg_attempted = excluded.fg_attempted, three_made = excluded.three_made,
    three_attempted = excluded.three_attempted, ft_made = excluded.ft_made,
    ft_attempted = excluded.ft_attempted, published_at = null, published_by = null, updated_at = now();

  insert into public.match_stats_workflow (match_id, home_score_draft, away_score_draft, status, review_warnings, result_checked,
    team_stats_checked, player_stats_checked, anomalies_checked, updated_by, updated_at)
  values (p_match_id, p_home_score, p_away_score, case when v_status in ('pret_a_verifier','pret_a_publier','a_corriger') then 'a_corriger' else 'saisie_en_cours' end,
    '[]'::jsonb, false, false, false, false, p_actor_id, now())
  on conflict (match_id) do update set
    home_score_draft = excluded.home_score_draft, away_score_draft = excluded.away_score_draft,
    status = case when public.match_stats_workflow.status in ('pret_a_verifier','pret_a_publier','a_corriger') then 'a_corriger' else 'saisie_en_cours' end,
    review_warnings = '[]'::jsonb, result_checked = false, team_stats_checked = false,
    player_stats_checked = false, anomalies_checked = false, reviewed_by = null,
    reviewed_at = null, updated_by = p_actor_id, updated_at = now();
  return 'saved';
end;
$$;

create or replace function public.prepare_esi_match_stats_review(p_match_id uuid, p_actor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_team_id uuid;
  v_match public.matches%rowtype;
  v_status text;
  v_home_score integer;
  v_away_score integer;
  v_missing integer;
  v_warnings jsonb := '[]'::jsonb;
  v_esi_score integer;
  v_team_points integer;
  v_player_points integer;
begin
  select s.team_id into v_team_id from public.staff s join public.teams t on t.id = s.team_id
    join public.users u on u.id = s.user_id
    where s.user_id = p_actor_id and s.role = 'statisticienne' and t.is_esi and u.is_active and not u.must_change_password;
  if v_team_id is null then raise exception 'Statistician access required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_match_id::text, 19));
  select * into v_match from public.matches where id = p_match_id and status = 'termine'
    and v_team_id in (home_team_id, away_team_id);
  if not found then raise exception 'Only a finished ESI match can be reviewed'; end if;
  select status, home_score_draft, away_score_draft into v_status, v_home_score, v_away_score
    from public.match_stats_workflow where match_id = p_match_id for update;
  if v_home_score is null or v_away_score is null then raise exception 'Enter the finished match result first'; end if;
  if v_status = 'publie' then raise exception 'Published statistics must be reopened first'; end if;
  select count(*)::integer into v_missing from public.match_rosters r
  join public.players p on p.id = r.player_id left join public.match_player_stats s on s.match_id = r.match_id and s.player_id = r.player_id
  where r.match_id = p_match_id and r.is_called_up and p.team_id = v_team_id
    and (s.player_id is null or s.minutes_played is null or s.points is null or s.personal_fouls is null
      or s.rebounds_defensive is null or s.rebounds_offensive is null or s.assists is null or s.steals is null
      or s.blocks is null or s.turnovers is null or s.fg_made is null or s.fg_attempted is null
      or s.three_made is null or s.three_attempted is null or s.ft_made is null or s.ft_attempted is null);
  if v_missing > 0 then raise exception 'Complete all statistics for every called player'; end if;
  if not exists (select 1 from public.match_team_stats t where t.match_id=p_match_id and t.team_id=v_team_id
    and t.points is not null and t.rebounds is not null and t.assists is not null
    and t.steals is not null and t.blocks is not null and t.turnovers is not null
    and t.personal_fouls is not null and t.fg_made is not null and t.fg_attempted is not null
    and t.three_made is not null and t.three_attempted is not null and t.ft_made is not null and t.ft_attempted is not null) then
    raise exception 'Complete all team statistics before review';
  end if;
  if exists (select 1 from public.match_player_stats s join public.match_rosters r on r.match_id=s.match_id and r.player_id=s.player_id
    join public.players p on p.id=s.player_id
    where s.match_id=p_match_id and r.is_called_up and p.team_id=v_team_id and (s.fg_made>s.fg_attempted or s.three_made>s.three_attempted
      or s.ft_made>s.ft_attempted or s.points <> 2*s.fg_made + s.three_made + s.ft_made)) then
    raise exception 'Player shooting totals or points are inconsistent';
  end if;
  if exists (select 1 from public.match_team_stats t where t.match_id=p_match_id and t.team_id=v_team_id
    and (t.fg_made>t.fg_attempted or t.three_made>t.three_attempted
      or t.ft_made>t.ft_attempted or t.points <> 2*t.fg_made + t.three_made + t.ft_made)) then
    raise exception 'Team shooting totals or points are inconsistent';
  end if;
  select points into v_team_points from public.match_team_stats where match_id=p_match_id and team_id=v_team_id;
  v_esi_score := case when v_match.home_team_id=v_team_id then v_home_score else v_away_score end;
  select coalesce(sum(s.points),0)::integer into v_player_points from public.match_player_stats s
    join public.match_rosters r on r.match_id=s.match_id and r.player_id=s.player_id
    join public.players p on p.id=s.player_id where s.match_id=p_match_id and r.is_called_up and p.team_id=v_team_id;
  if v_team_points is distinct from v_esi_score then v_warnings := v_warnings || jsonb_build_array('Le total de points de l’équipe diffère du score final ESI.'); end if;
  if v_player_points is distinct from v_esi_score then v_warnings := v_warnings || jsonb_build_array('La somme des points individuels diffère du score final ESI.'); end if;
  if v_esi_score = (case when v_match.home_team_id=v_team_id then v_away_score else v_home_score end) then
    v_warnings := v_warnings || jsonb_build_array('Le score final est nul; confirme le résultat officiel avant publication.');
  end if;
  update public.match_stats_workflow set status='pret_a_verifier', review_warnings=v_warnings,
    result_checked=false, team_stats_checked=false, player_stats_checked=false, anomalies_checked=false,
    reviewed_by=null, reviewed_at=null, updated_by=p_actor_id, updated_at=now() where match_id=p_match_id;
  if not found then
    insert into public.match_stats_workflow (match_id,status,review_warnings,updated_by)
      values (p_match_id,'pret_a_verifier',v_warnings,p_actor_id);
  end if;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
    values(p_actor_id,'stats_ready_for_review','match',p_match_id::text,jsonb_build_object('warning_count',jsonb_array_length(v_warnings)));
  return v_warnings;
end;
$$;

create or replace function public.validate_esi_match_stats_review(
  p_match_id uuid, p_actor_id uuid,
  p_result_checked boolean, p_team_stats_checked boolean,
  p_player_stats_checked boolean, p_anomalies_checked boolean
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_team_id uuid; v_warnings jsonb; v_status text;
begin
  select s.team_id into v_team_id from public.staff s join public.teams t on t.id=s.team_id
    join public.users u on u.id=s.user_id where s.user_id=p_actor_id and s.role='statisticienne'
    and t.is_esi and u.is_active and not u.must_change_password;
  if v_team_id is null then raise exception 'Statistician access required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_match_id::text, 19));
  select w.status,w.review_warnings into v_status,v_warnings from public.match_stats_workflow w
    join public.matches m on m.id=w.match_id where w.match_id=p_match_id and m.status='termine'
      and v_team_id in (m.home_team_id,m.away_team_id) for update;
  if v_status is distinct from 'pret_a_verifier' then raise exception 'Match is not ready for review'; end if;
  if not coalesce(p_result_checked,false) or not coalesce(p_team_stats_checked,false)
    or not coalesce(p_player_stats_checked,false) or (jsonb_array_length(v_warnings)>0 and not coalesce(p_anomalies_checked,false)) then
    raise exception 'Complete the human review checklist';
  end if;
  update public.match_stats_workflow set status='pret_a_publier',result_checked=true,
    team_stats_checked=true,player_stats_checked=true,anomalies_checked=coalesce(p_anomalies_checked,false),
    reviewed_by=p_actor_id,reviewed_at=now(),updated_by=p_actor_id,updated_at=now() where match_id=p_match_id;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id)
    values(p_actor_id,'stats_human_reviewed','match',p_match_id::text);
  return 'pret_a_publier';
end;
$$;

create or replace function public.publish_esi_match_stats_manual(p_match_id uuid,p_actor_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_team_id uuid; v_status text; v_home_score integer; v_away_score integer; v_now timestamptz := now();
begin
  select s.team_id into v_team_id from public.staff s join public.teams t on t.id=s.team_id
    join public.users u on u.id=s.user_id where s.user_id=p_actor_id and s.role='statisticienne'
    and t.is_esi and u.is_active and not u.must_change_password;
  if v_team_id is null then raise exception 'Statistician access required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_match_id::text, 19));
  select w.status,w.home_score_draft,w.away_score_draft into v_status,v_home_score,v_away_score
    from public.match_stats_workflow w join public.matches m on m.id=w.match_id
    where w.match_id=p_match_id and m.status='termine' and v_team_id in (m.home_team_id,m.away_team_id) for update;
  if v_status is distinct from 'pret_a_publier' then raise exception 'Review is required before publication'; end if;
  if v_home_score is null or v_away_score is null then raise exception 'Enter the finished match result first'; end if;
  if exists (select 1 from public.match_rosters r join public.players p on p.id=r.player_id
    left join public.match_player_stats s on s.match_id=r.match_id and s.player_id=r.player_id
    where r.match_id=p_match_id and r.is_called_up and p.team_id=v_team_id
      and (s.player_id is null or s.minutes_played is null or s.points is null or s.personal_fouls is null
        or s.rebounds_defensive is null or s.rebounds_offensive is null or s.assists is null or s.steals is null
        or s.blocks is null or s.turnovers is null or s.fg_made is null or s.fg_attempted is null
        or s.three_made is null or s.three_attempted is null or s.ft_made is null or s.ft_attempted is null)) then
    raise exception 'Complete all statistics for every called player';
  end if;
  if exists (select 1 from public.match_team_stats t where t.match_id=p_match_id and t.team_id=v_team_id
    and (t.points is null or t.rebounds is null or t.assists is null or t.steals is null or t.blocks is null
      or t.turnovers is null or t.personal_fouls is null or t.fg_made is null or t.fg_attempted is null
      or t.three_made is null or t.three_attempted is null or t.ft_made is null or t.ft_attempted is null)) then
    raise exception 'Complete all team statistics before publication';
  end if;
  update public.matches set home_score=v_home_score,away_score=v_away_score,updated_at=v_now where id=p_match_id;
  update public.match_player_stats set published_at=v_now,published_by=p_actor_id,updated_at=v_now
    where match_id=p_match_id and player_id in (select r.player_id from public.match_rosters r
      join public.players p on p.id=r.player_id where r.match_id=p_match_id and r.is_called_up and p.team_id=v_team_id);
  update public.match_team_stats set published_at=v_now,published_by=p_actor_id,updated_at=v_now
    where match_id=p_match_id and team_id=v_team_id;
  update public.match_stats_workflow set status='publie',published_by=p_actor_id,published_at=v_now,
    updated_by=p_actor_id,updated_at=v_now where match_id=p_match_id;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id)
    values(p_actor_id,'stats_published','match',p_match_id::text);
  return 'publie';
end;
$$;

create or replace function public.reopen_esi_match_stats(p_match_id uuid,p_actor_id uuid,p_reason text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_team_id uuid; v_status text;
begin
  if char_length(trim(coalesce(p_reason,''))) not between 5 and 500 then raise exception 'A correction reason is required'; end if;
  select s.team_id into v_team_id from public.staff s join public.teams t on t.id=s.team_id
    join public.users u on u.id=s.user_id where s.user_id=p_actor_id and s.role='statisticienne'
    and t.is_esi and u.is_active and not u.must_change_password;
  if v_team_id is null then raise exception 'Statistician access required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_match_id::text, 19));
  select w.status into v_status from public.match_stats_workflow w join public.matches m on m.id=w.match_id
    where w.match_id=p_match_id and m.status='termine' and v_team_id in (m.home_team_id,m.away_team_id) for update;
  if v_status is distinct from 'publie' then raise exception 'Only published statistics can be reopened'; end if;
  update public.matches set home_score=null,away_score=null,updated_at=now() where id=p_match_id;
  update public.match_player_stats set published_at=null,published_by=null,updated_at=now() where match_id=p_match_id;
  update public.match_team_stats set published_at=null,published_by=null,updated_at=now() where match_id=p_match_id and team_id=v_team_id;
  update public.match_stats_workflow set status='a_corriger',correction_reason=trim(p_reason),
    result_checked=false,team_stats_checked=false,player_stats_checked=false,anomalies_checked=false,
    reviewed_by=null,reviewed_at=null,published_by=null,published_at=null,updated_by=p_actor_id,updated_at=now()
    where match_id=p_match_id;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
    values(p_actor_id,'stats_reopened_for_correction','match',p_match_id::text,jsonb_build_object('reason',trim(p_reason)));
  return 'a_corriger';
end;
$$;

create or replace function public.return_esi_match_stats_to_correction(p_match_id uuid,p_actor_id uuid,p_reason text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_team_id uuid; v_status text;
begin
  if char_length(trim(coalesce(p_reason,''))) not between 5 and 500 then raise exception 'A correction reason is required'; end if;
  select s.team_id into v_team_id from public.staff s join public.teams t on t.id=s.team_id
    join public.users u on u.id=s.user_id where s.user_id=p_actor_id and s.role='statisticienne'
    and t.is_esi and u.is_active and not u.must_change_password;
  if v_team_id is null then raise exception 'Statistician access required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_match_id::text, 19));
  select w.status into v_status from public.match_stats_workflow w join public.matches m on m.id=w.match_id
    where w.match_id=p_match_id and m.status='termine' and v_team_id in (m.home_team_id,m.away_team_id) for update;
  if v_status is distinct from 'pret_a_publier' then raise exception 'Only reviewed statistics can return to correction'; end if;
  update public.match_stats_workflow set status='a_corriger',correction_reason=trim(p_reason),
    result_checked=false,team_stats_checked=false,player_stats_checked=false,anomalies_checked=false,
    reviewed_by=null,reviewed_at=null,updated_by=p_actor_id,updated_at=now() where match_id=p_match_id;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
    values(p_actor_id,'stats_review_cancelled_for_correction','match',p_match_id::text,jsonb_build_object('reason',trim(p_reason)));
  return 'a_corriger';
end;
$$;

revoke all on function public.save_esi_match_stats_manual(uuid,uuid,integer,integer,jsonb,jsonb) from public, anon, authenticated;
revoke all on function public.prepare_esi_match_stats_review(uuid,uuid) from public, anon, authenticated;
revoke all on function public.validate_esi_match_stats_review(uuid,uuid,boolean,boolean,boolean,boolean) from public, anon, authenticated;
revoke all on function public.publish_esi_match_stats_manual(uuid,uuid) from public, anon, authenticated;
revoke all on function public.reopen_esi_match_stats(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.return_esi_match_stats_to_correction(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.save_esi_match_stats_manual(uuid,uuid,integer,integer,jsonb,jsonb) to service_role;
grant execute on function public.prepare_esi_match_stats_review(uuid,uuid) to service_role;
grant execute on function public.validate_esi_match_stats_review(uuid,uuid,boolean,boolean,boolean,boolean) to service_role;
grant execute on function public.publish_esi_match_stats_manual(uuid,uuid) to service_role;
grant execute on function public.reopen_esi_match_stats(uuid,uuid,text) to service_role;
grant execute on function public.return_esi_match_stats_to_correction(uuid,uuid,text) to service_role;

grant select (steals, blocks, turnovers, personal_fouls)
  on public.match_team_stats to anon, authenticated;

comment on table public.match_stats_workflow is
  'Post-match statistician workflow and human review checkpoint. Mutations are performed only by server-side service-role RPCs.';

commit;
